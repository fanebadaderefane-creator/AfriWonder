/**
 * Service Portefeuille (Wallet) — opérations utilisateur générales.
 *
 * Inclut le transfert P2P interne entre wallets : décrémente l'expéditeur,
 * incrémente le destinataire, écrit deux entrées de ledger (debit/credit) et
 * une Transaction côté expéditeur, le tout dans une transaction Prisma.
 *
 * Le destinataire peut être identifié par :
 *   - `recipient_user_id`  (le plus sûr — fourni par sélection contact in-app)
 *   - `recipient_username` (résolution par @handle)
 *   - `recipient_phone`    (best-effort : recherche dans Address.phone)
 *
 * Sécurité :
 *   - Vérifie qu'on ne s'envoie pas à soi-même
 *   - Refuse les comptes suspendus / bloqués (WalletSecurity.is_blocked)
 *   - Vérifie le PIN si configuré
 *   - Applique la limite quotidienne (réutilise WalletSecurity)
 *   - Idempotence assurée par `optionalIdempotencyMiddleware` côté route
 *   - Tout passe en `prisma.$transaction()` → atomicité (pas de débit sans crédit)
 *
 * Devise : XOF (UEMOA) par défaut. Les wallets utilisent `available_balance`
 * comme solde « utilisable » ; `balance` reste pour compat ascendante.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import walletSecurityService from './walletSecurity.service.js';

export interface TransferP2PInput {
  recipient_user_id?: string;
  recipient_username?: string;
  recipient_phone?: string;
  amount: number;
  description?: string;
  pin?: string;
}

export interface TransferP2PResult {
  success: true;
  transfer_id: string;
  sender_balance_after: number;
  recipient_user_id: string;
  amount: number;
  currency: string;
  created_at: Date;
}

const MIN_TRANSFER_AMOUNT = 100; // 100 XOF — limite plancher anti-spam
const MAX_TRANSFER_AMOUNT = 1_000_000; // 1M XOF — pare-feu unitaire (limite quotidienne gérée séparément)

class WalletService {
  /**
   * Récupère ou crée le wallet utilisateur principal (`wallet_type = 'user'`).
   */
  private async getOrCreateUserWallet(userId: string) {
    let wallet = await prisma.wallet.findFirst({
      where: { user_id: userId, wallet_type: 'user' },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          user_id: userId,
          wallet_type: 'user',
          balance: 0,
          available_balance: 0,
          currency: 'XOF',
        },
      });
    }
    return wallet;
  }

  /**
   * Résout l'utilisateur destinataire à partir d'un identifiant flexible.
   * Retourne `null` si introuvable / ambigu.
   */
  private async resolveRecipient(input: TransferP2PInput): Promise<{ id: string; username: string | null } | null> {
    if (input.recipient_user_id) {
      const u = await prisma.user.findUnique({
        where: { id: input.recipient_user_id },
        select: { id: true, username: true, account_suspended: true },
      });
      if (!u || u.account_suspended) return null;
      return { id: u.id, username: u.username };
    }

    if (input.recipient_username) {
      const handle = input.recipient_username.replace(/^@+/, '').trim();
      if (!handle) return null;
      const u = await prisma.user.findUnique({
        where: { username: handle },
        select: { id: true, username: true, account_suspended: true },
      });
      if (!u || u.account_suspended) return null;
      return { id: u.id, username: u.username };
    }

    if (input.recipient_phone) {
      // Le modèle User n'expose pas `phone` directement → on tente une résolution
      // via Address.phone (le user a fourni au moins une adresse de livraison).
      const normalized = input.recipient_phone.replace(/[^\d+]/g, '');
      if (normalized.length < 8) return null;
      const addresses = await prisma.address.findMany({
        where: { phone: { contains: normalized.slice(-8) } },
        select: { user_id: true },
        take: 5,
      });
      const uniqueUserIds = [...new Set(addresses.map((a) => a.user_id))];
      if (uniqueUserIds.length === 0) return null;
      // Si plusieurs utilisateurs partagent le même numéro on refuse pour éviter
      // un transfert au mauvais destinataire (cas légitime : famille).
      if (uniqueUserIds.length > 1) return null;
      const u = await prisma.user.findUnique({
        where: { id: uniqueUserIds[0] },
        select: { id: true, username: true, account_suspended: true },
      });
      if (!u || u.account_suspended) return null;
      return { id: u.id, username: u.username };
    }

    return null;
  }

  /**
   * Transfert P2P entre deux wallets utilisateur (atomique).
   */
  async transferP2P(senderId: string, input: TransferP2PInput): Promise<TransferP2PResult> {
    if (!Number.isFinite(input.amount) || input.amount < MIN_TRANSFER_AMOUNT) {
      const err: any = new Error(`Montant minimum : ${MIN_TRANSFER_AMOUNT} XOF`);
      err.statusCode = 400;
      throw err;
    }
    if (input.amount > MAX_TRANSFER_AMOUNT) {
      const err: any = new Error(`Montant maximum par transfert : ${MAX_TRANSFER_AMOUNT.toLocaleString()} XOF`);
      err.statusCode = 400;
      throw err;
    }
    const amount = Math.round(input.amount); // XOF : pas de décimales

    // Sécurité : compte expéditeur opérationnel ?
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, account_suspended: true },
    });
    if (!sender || sender.account_suspended) {
      const err: any = new Error('Compte expéditeur indisponible');
      err.statusCode = 403;
      throw err;
    }

    const security = await walletSecurityService.getOrCreate(senderId);
    if (security.is_blocked) {
      const err: any = new Error(`Wallet bloqué: ${security.blocked_reason || 'sécurité'}`);
      err.statusCode = 403;
      throw err;
    }

    // Vérification PIN si configuré sur le compte
    if (security.pin_hash) {
      if (!input.pin) {
        const err: any = new Error('PIN requis pour ce transfert');
        err.statusCode = 401;
        throw err;
      }
      const ok = await walletSecurityService.validatePin(senderId, input.pin);
      if (!ok) {
        const err: any = new Error('PIN incorrect');
        err.statusCode = 401;
        throw err;
      }
    }

    // Limite quotidienne (réutilise la même limite que les retraits)
    const dailyLimit = security.withdrawal_daily_limit ?? 500_000;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usedToday = await prisma.transaction.aggregate({
      where: {
        user_id: senderId,
        type: 'wallet_transfer_out',
        status: { in: ['completed', 'pending'] },
        created_at: { gte: startOfDay },
      },
      _sum: { amount: true },
    });
    const used = usedToday._sum.amount ?? 0;
    if (used + amount > dailyLimit) {
      const err: any = new Error(
        `Limite quotidienne dépassée (${dailyLimit.toLocaleString()} XOF). Déjà utilisé aujourd'hui : ${used.toLocaleString()} XOF.`,
      );
      err.statusCode = 429;
      throw err;
    }

    // Résolution destinataire
    const recipient = await this.resolveRecipient(input);
    if (!recipient) {
      const err: any = new Error('Destinataire introuvable ou non éligible');
      err.statusCode = 404;
      throw err;
    }
    if (recipient.id === senderId) {
      const err: any = new Error('Impossible de se transférer à soi-même');
      err.statusCode = 400;
      throw err;
    }

    // Pré-création des wallets (hors transaction pour limiter le temps de lock)
    await this.getOrCreateUserWallet(senderId);
    await this.getOrCreateUserWallet(recipient.id);

    // Transaction atomique : tout passe ou rien ne passe.
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findFirst({
        where: { user_id: senderId, wallet_type: 'user' },
      });
      const recipientWallet = await tx.wallet.findFirst({
        where: { user_id: recipient.id, wallet_type: 'user' },
      });

      if (!senderWallet || !recipientWallet) {
        const err: any = new Error('Wallet introuvable');
        err.statusCode = 500;
        throw err;
      }

      const senderAvailable = senderWallet.available_balance ?? senderWallet.balance ?? 0;
      if (senderAvailable < amount) {
        const err: any = new Error(`Solde insuffisant. Disponible : ${senderAvailable.toLocaleString()} XOF`);
        err.statusCode = 402;
        throw err;
      }

      const senderBalanceBefore = senderAvailable;
      const senderBalanceAfter = senderBalanceBefore - amount;
      const recipientBalanceBefore = recipientWallet.available_balance ?? recipientWallet.balance ?? 0;
      const recipientBalanceAfter = recipientBalanceBefore + amount;

      const senderUpdated = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: senderBalanceAfter,
          available_balance: senderBalanceAfter,
          updated_at: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: {
          balance: recipientBalanceAfter,
          available_balance: recipientBalanceAfter,
          updated_at: new Date(),
        },
      });

      // NB : le modèle Transaction n'a pas de champ `reference_type` — on
      // encode le contexte dans `type` (ex: 'wallet_transfer_out') et on
      // stocke l'id de la contrepartie dans `reference_id`.
      const senderTx = await tx.transaction.create({
        data: {
          user_id: senderId,
          type: 'wallet_transfer_out',
          amount,
          currency: senderWallet.currency || 'XOF',
          status: 'completed',
          description: input.description || `Transfert vers @${recipient.username || recipient.id.slice(0, 8)}`,
          reference_id: recipient.id,
        },
      });

      // Transaction côté destinataire (visibilité « j'ai reçu »)
      await tx.transaction.create({
        data: {
          user_id: recipient.id,
          type: 'wallet_transfer_in',
          amount,
          currency: senderWallet.currency || 'XOF',
          status: 'completed',
          description: input.description || `Reçu de l'expéditeur`,
          reference_id: senderTx.id,
        },
      });

      // Ledger debit (sender)
      await tx.ledgerEntry.create({
        data: {
          wallet_id: senderWallet.id,
          type: 'transfer_out',
          amount: -amount,
          reference_id: senderTx.id,
          reference_type: 'wallet_transfer',
          description: `P2P → user:${recipient.id}`,
          balance_before: senderBalanceBefore,
          balance_after: senderBalanceAfter,
        },
      });

      // Ledger credit (recipient)
      await tx.ledgerEntry.create({
        data: {
          wallet_id: recipientWallet.id,
          type: 'transfer_in',
          amount,
          reference_id: senderTx.id,
          reference_type: 'wallet_transfer',
          description: `P2P ← user:${senderId}`,
          balance_before: recipientBalanceBefore,
          balance_after: recipientBalanceAfter,
        },
      });

      return {
        transferId: senderTx.id,
        senderBalanceAfter: senderUpdated.available_balance ?? senderBalanceAfter,
        currency: senderWallet.currency || 'XOF',
        createdAt: senderTx.created_at,
      };
    });

    logger.info('Wallet P2P transfer executed', {
      sender: senderId,
      recipient: recipient.id,
      amount,
      transferId: result.transferId,
    });

    // Notification temps réel destinataire (best-effort, non bloquant)
    try {
      const notificationModule = await import('./notification.service.js');
      await notificationModule.default.create(recipient.id, {
        type: 'wallet_received',
        title: 'Argent reçu',
        message: `Vous avez reçu ${amount.toLocaleString()} XOF.`,
        reference_type: 'wallet_transfer',
        reference_id: result.transferId,
        data: { amount, currency: result.currency, sender_user_id: senderId },
      });
    } catch (err) {
      logger.warn('wallet transfer notification failed', {
        recipient: recipient.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      success: true,
      transfer_id: result.transferId,
      sender_balance_after: result.senderBalanceAfter,
      recipient_user_id: recipient.id,
      amount,
      currency: result.currency,
      created_at: result.createdAt,
    };
  }

  /**
   * Solde et statistiques du wallet utilisateur.
   */
  async getBalance(userId: string) {
    const wallet = await this.getOrCreateUserWallet(userId);
    const security = await walletSecurityService.getOrCreate(userId);
    return {
      balance: wallet.available_balance ?? wallet.balance ?? 0,
      pending: wallet.pending_balance ?? 0,
      locked: wallet.locked_balance ?? 0,
      currency: wallet.currency || 'XOF',
      daily_limit: security.withdrawal_daily_limit ?? 500_000,
      pin_required: !!security.pin_hash,
      is_blocked: !!security.is_blocked,
    };
  }
}

export default new WalletService();
