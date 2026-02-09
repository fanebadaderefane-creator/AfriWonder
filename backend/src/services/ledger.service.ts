/**
 * Service Ledger — double écriture comptable.
 * Ne jamais modifier available_balance / balance directement.
 * Toutes les opérations passent par credit() / debit() qui créent des LedgerEntry.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export type LedgerReferenceType =
  | 'order'
  | 'contribution'
  | 'withdrawal'
  | 'refund'
  | 'tip'
  | 'campaign'
  | 'loan'
  | 'deposit'
  | 'payout'
  | 'escrow_hold'
  | 'escrow_release'
  | 'internal_transfer'
  | 'fee'
  | 'other';

class LedgerService {
  /**
   * Récupère ou crée le wallet principal (type user) d'un utilisateur.
   */
  async getOrCreateUserWallet(userId: string, currency: string = 'XOF') {
    let wallet = await prisma.wallet.findFirst({
      where: { user_id: userId, wallet_type: 'user' },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          user_id: userId,
          wallet_type: 'user',
          currency,
          available_balance: 0,
          pending_balance: 0,
          locked_balance: 0,
          balance: 0,
        },
      });
      logger.info('Wallet user créé', { userId, walletId: wallet.id });
    }
    return wallet;
  }

  /**
   * Crédit un wallet (double écriture: une entrée credit avec balance_before/balance_after).
   */
  async credit(
    walletId: string,
    amount: number,
    opts: {
      referenceId?: string;
      referenceType?: LedgerReferenceType;
      description?: string;
      updateTotals?: { earnings?: boolean; payouts?: boolean };
    } = {}
  ) {
    if (amount <= 0) throw new Error('Montant crédit doit être > 0');

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new Error('Wallet non trouvé');
      if (wallet.status !== 'active') throw new Error('Wallet non actif');

      const balanceBefore = wallet.available_balance;
      const balanceAfter = balanceBefore + amount;

      await tx.ledgerEntry.create({
        data: {
          wallet_id: walletId,
          type: 'credit',
          amount,
          reference_id: opts.referenceId ?? undefined,
          reference_type: opts.referenceType ?? undefined,
          description: opts.description ?? undefined,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });

      const updateData: any = {
        available_balance: balanceAfter,
        balance: balanceAfter, // sync legacy
      };
      if (opts.updateTotals?.earnings) updateData.total_earnings = { increment: amount };
      if (opts.updateTotals?.payouts) updateData.total_payouts = { increment: amount };

      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: updateData,
      });

      logger.info('Ledger credit', { walletId, amount, balanceAfter, referenceType: opts.referenceType });
      return updated;
    });
  }

  /**
   * Débit un wallet (double écriture).
   */
  async debit(
    walletId: string,
    amount: number,
    opts: {
      referenceId?: string;
      referenceType?: LedgerReferenceType;
      description?: string;
      updateTotals?: { payouts?: boolean };
    } = {}
  ) {
    if (amount <= 0) throw new Error('Montant débit doit être > 0');

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new Error('Wallet non trouvé');
      if (wallet.status !== 'active') throw new Error('Wallet non actif');
      if (wallet.available_balance < amount) throw new Error('Solde insuffisant');

      const balanceBefore = wallet.available_balance;
      const balanceAfter = balanceBefore - amount;

      await tx.ledgerEntry.create({
        data: {
          wallet_id: walletId,
          type: 'debit',
          amount,
          reference_id: opts.referenceId ?? undefined,
          reference_type: opts.referenceType ?? undefined,
          description: opts.description ?? undefined,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });

      const updateData: any = {
        available_balance: balanceAfter,
        balance: balanceAfter,
      };
      if (opts.updateTotals?.payouts) updateData.total_payouts = { increment: amount };

      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: updateData,
      });

      logger.info('Ledger debit', { walletId, amount, balanceAfter, referenceType: opts.referenceType });
      return updated;
    });
  }

  /**
   * Transfert interne: débit wallet A, crédit wallet B (2 écritures ledger par wallet = 4 au total, double entry).
   */
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    opts: {
      referenceId?: string;
      description?: string;
    } = {}
  ) {
    if (fromWalletId === toWalletId) throw new Error('Même wallet');
    if (amount <= 0) throw new Error('Montant doit être > 0');

    return await prisma.$transaction(async (tx) => {
      const from = await tx.wallet.findUnique({ where: { id: fromWalletId } });
      const to = await tx.wallet.findUnique({ where: { id: toWalletId } });
      if (!from || !to) throw new Error('Wallet non trouvé');
      if (from.available_balance < amount) throw new Error('Solde insuffisant');
      if (from.status !== 'active' || to.status !== 'active') throw new Error('Wallet non actif');

      const refId = opts.referenceId ?? `transfer-${Date.now()}`;

      // Debit from
      await tx.ledgerEntry.create({
        data: {
          wallet_id: fromWalletId,
          type: 'debit',
          amount,
          reference_id: refId,
          reference_type: 'internal_transfer',
          description: opts.description ?? `Transfert vers ${toWalletId}`,
          balance_before: from.available_balance,
          balance_after: from.available_balance - amount,
        },
      });
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: {
          available_balance: { decrement: amount },
          balance: { decrement: amount },
        },
      });

      // Credit to
      await tx.ledgerEntry.create({
        data: {
          wallet_id: toWalletId,
          type: 'credit',
          amount,
          reference_id: refId,
          reference_type: 'internal_transfer',
          description: opts.description ?? `Transfert depuis ${fromWalletId}`,
          balance_before: to.available_balance,
          balance_after: to.available_balance + amount,
        },
      });
      await tx.wallet.update({
        where: { id: toWalletId },
        data: {
          available_balance: { increment: amount },
          balance: { increment: amount },
        },
      });

      logger.info('Ledger transfer', { fromWalletId, toWalletId, amount });
      return { fromWalletId, toWalletId, amount };
    });
  }

  /**
   * Crée un wallet escrow pour une campagne et le lie.
   */
  async getOrCreateCampaignEscrowWallet(campaignId: string, creatorId: string, currency: string = 'XOF') {
    const existing = await prisma.wallet.findUnique({
      where: { campaign_id: campaignId },
    });
    if (existing) return existing;

    return await prisma.wallet.create({
      data: {
        user_id: creatorId,
        wallet_type: 'campaign_escrow',
        currency,
        campaign_id: campaignId,
        available_balance: 0,
        pending_balance: 0,
        locked_balance: 0,
        balance: 0,
      },
    });
  }

  /**
   * Liste les écritures ledger d'un wallet (historique).
   */
  async getLedgerEntries(
    walletId: string,
    opts: { limit?: number; before?: Date; referenceType?: LedgerReferenceType } = {}
  ) {
    const where: any = { wallet_id: walletId };
    if (opts.before) where.created_at = { lt: opts.before };
    if (opts.referenceType) where.reference_type = opts.referenceType;

    return await prisma.ledgerEntry.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: opts.limit ?? 50,
    });
  }

  /**
   * Solde disponible (lecture seule, depuis le wallet).
   */
  async getAvailableBalance(walletId: string): Promise<number> {
    const w = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: { available_balance: true },
    });
    return w?.available_balance ?? 0;
  }
}

export const ledgerService = new LedgerService();
export default ledgerService;
