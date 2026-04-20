import prisma from '../config/database.js';
import {
  COIN_EXCHANGE_MIN_COINS,
  COIN_FCFA_APPROX_PURCHASE_PER_COIN,
  COIN_FCFA_PER_COIN_PAYOUT,
  COIN_USD_PER_100_COINS_PAYOUT,
} from '../config/coinEconomy.js';
import ledgerService from './ledger.service.js';
import paymentService from './payment.service.js';
import { logger } from '../utils/logger.js';

export type CoinPackageConfig = {
  id: string;
  name: string;
  coins_amount: number;
  price_fcfa: number;
  bonus_coins: number;
  is_popular: boolean;
};

const COIN_PACKAGES: CoinPackageConfig[] = [
  { id: 'coins-100', name: 'Pack 100', coins_amount: 100, price_fcfa: 500, bonus_coins: 0, is_popular: false },
  { id: 'coins-500', name: 'Pack 500', coins_amount: 500, price_fcfa: 2500, bonus_coins: 25, is_popular: true },
  { id: 'coins-1000', name: 'Pack 1000', coins_amount: 1000, price_fcfa: 5000, bonus_coins: 75, is_popular: false },
  { id: 'coins-5000', name: 'Pack 5000', coins_amount: 5000, price_fcfa: 25000, bonus_coins: 500, is_popular: false },
];

function parsePackageIdFromReference(referenceId: string): string | null {
  const parts = String(referenceId || '').split(':');
  return parts[0] === 'coins' && parts[1] ? parts[1] : null;
}

function mapDbPackage(row: {
  slug: string;
  name: string;
  coins_amount: number;
  price_fcfa: number;
  bonus_coins: number;
  is_popular: boolean;
}): CoinPackageConfig {
  return {
    id: row.slug,
    name: row.name,
    coins_amount: row.coins_amount,
    price_fcfa: row.price_fcfa,
    bonus_coins: row.bonus_coins,
    is_popular: row.is_popular,
  };
}

class CoinsService {
  async listPackages(): Promise<CoinPackageConfig[]> {
    try {
      const rows = await prisma.coinPackage.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: 'asc' }, { coins_amount: 'asc' }],
      });
      if (rows.length === 0) return COIN_PACKAGES;
      return rows.map(mapDbPackage);
    } catch {
      return COIN_PACKAGES;
    }
  }

  async getPackageById(packageId: string): Promise<CoinPackageConfig | null> {
    const id = String(packageId || '').trim();
    if (!id) return null;
    try {
      const row = await prisma.coinPackage.findFirst({
        where: { OR: [{ slug: id }, { id }], is_active: true },
      });
      if (row) return mapDbPackage(row);
    } catch {
      /* fallback */
    }
    return COIN_PACKAGES.find((pkg) => pkg.id === id) || null;
  }

  async getOrCreateCoinsWallet(userId: string) {
    let wallet = await prisma.wallet.findFirst({
      where: { user_id: userId, wallet_type: 'coins' },
    });
    if (!wallet) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) {
        const err = new Error('Utilisateur introuvable.') as Error & { statusCode?: number };
        err.statusCode = 404;
        throw err;
      }
      wallet = await prisma.wallet.create({
        data: {
          user_id: userId,
          wallet_type: 'coins',
          currency: 'COIN',
          available_balance: 0,
          pending_balance: 0,
          locked_balance: 0,
          balance: 0,
        },
      });
      logger.info('Wallet coins créé', { userId, walletId: wallet.id });
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateCoinsWallet(userId);
    return {
      wallet_id: wallet.id,
      coins_balance: Math.round(wallet.available_balance || 0),
      pending_coins: Math.round(wallet.pending_balance || 0),
      currency: wallet.currency,
    };
  }

  async initiatePurchase(
    userId: string,
    data: { packageId: string; payment_method?: 'orange_money' | 'wave'; phone?: string; returnUrl?: string },
  ) {
    const pkg = await this.getPackageById(data.packageId);
    if (!pkg) throw new Error('Pack coins introuvable');

    const paymentMethod = data.payment_method || 'orange_money';
    const referenceId = `coins:${pkg.id}:${Date.now()}`;
    const baseReturnUrl = data.returnUrl || 'https://afriwonder.com/coins/complete';

    if (process.env.NODE_ENV === 'test') {
      await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'coins_purchase',
          amount: pkg.price_fcfa,
          currency: 'XOF',
          status: 'pending',
          description: `coins_package:${pkg.id}`,
          reference_id: referenceId,
          payment_method: paymentMethod,
          phone_number: data.phone,
        },
      });
      return {
        package: pkg,
        reference_id: referenceId,
        payment_method: paymentMethod,
        payment_url: baseReturnUrl,
        mock: true,
      };
    }

    if (paymentMethod === 'orange_money') {
      try {
        const result = await paymentService.initiateOrangeMoneyPayment(
          userId,
          referenceId,
          {
            amount: pkg.price_fcfa,
            phone: data.phone || '+22370000000',
            returnUrl: baseReturnUrl,
          },
          { useOrderPayment: false, transactionType: 'coins_purchase' }
        );
        return {
          package: pkg,
          reference_id: referenceId,
          payment_method: paymentMethod,
          payment_url: result.paymentUrl,
          mock: false,
        };
      } catch (error) {
        if (process.env.NODE_ENV === 'production') throw error;
        await prisma.transaction.create({
          data: {
            user_id: userId,
            type: 'coins_purchase',
            amount: pkg.price_fcfa,
            currency: 'XOF',
            status: 'pending',
            description: `coins_package:${pkg.id}`,
            reference_id: referenceId,
            payment_method: paymentMethod,
            phone_number: data.phone,
          },
        });
        return {
          package: pkg,
          reference_id: referenceId,
          payment_method: paymentMethod,
          payment_url: baseReturnUrl,
          mock: true,
        };
      }
    }

    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'coins_purchase',
        amount: pkg.price_fcfa,
        currency: 'XOF',
        status: 'pending',
        description: `coins_package:${pkg.id}`,
        reference_id: referenceId,
        payment_method: paymentMethod,
      },
    });

    const result = await paymentService.initiateWavePayment(userId, referenceId, {
      amount: pkg.price_fcfa,
      currency: 'XOF',
      returnUrl: baseReturnUrl,
    });

    return {
      package: pkg,
      reference_id: referenceId,
      payment_method: paymentMethod,
      payment_url: result.paymentUrl,
      mock: false,
    };
  }

  async confirmPurchase(referenceId: string, userId?: string) {
    const packageId = parsePackageIdFromReference(referenceId);
    if (!packageId) throw new Error('Référence coins invalide');
    const pkg = await this.getPackageById(packageId);
    if (!pkg) throw new Error('Pack coins introuvable');

    const tx = await prisma.transaction.findFirst({
      where: {
        reference_id: referenceId,
        type: 'coins_purchase',
        ...(userId ? { user_id: userId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
    if (!tx) throw new Error('Transaction coins introuvable');

    if (tx.status !== 'completed') {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'completed' },
      });
    }

    const wallet = await this.getOrCreateCoinsWallet(tx.user_id);
    const existingCredit = await prisma.ledgerEntry.findFirst({
      where: { wallet_id: wallet.id, reference_id: referenceId },
      select: { id: true },
    });
    if (!existingCredit) {
      await ledgerService.credit(wallet.id, pkg.coins_amount + pkg.bonus_coins, {
        referenceId,
        referenceType: 'other',
        description: `Achat coins ${pkg.id}`,
      });
    }

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
    return {
      reference_id: referenceId,
      package: pkg,
      coins_balance: Math.round(updatedWallet?.available_balance || 0),
      status: 'completed',
    };
  }

  async getPurchaseStatus(referenceId: string, userId: string) {
    const tx = await prisma.transaction.findFirst({
      where: { reference_id: referenceId, user_id: userId, type: 'coins_purchase' },
      orderBy: { created_at: 'desc' },
    });
    if (!tx) return null;

    const pkg = await this.getPackageById(parsePackageIdFromReference(referenceId) || '');
    const balance = await this.getBalance(userId);

    if (tx.status === 'completed') {
      await this.confirmPurchase(referenceId, userId);
      const refreshed = await this.getBalance(userId);
      return {
        reference_id: referenceId,
        status: 'completed',
        package: pkg,
        coins_balance: refreshed.coins_balance,
      };
    }

    return {
      reference_id: referenceId,
      status: tx.status,
      package: pkg,
      coins_balance: balance.coins_balance,
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [purchases, sentLiveGifts, receivedLiveGifts] = await Promise.all([
      prisma.transaction.findMany({
        where: { user_id: userId, type: 'coins_purchase' },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.liveGift.findMany({
        where: { sender_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      prisma.liveGift.findMany({
        where: { creator_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
    ]);

    return {
      purchases: purchases.map((tx) => ({
        id: tx.id,
        reference_id: tx.reference_id,
        status: tx.status,
        amount_fcfa: tx.amount,
        package_id: parsePackageIdFromReference(tx.reference_id || '') || null,
        created_at: tx.created_at,
      })),
      sent_live_gifts: sentLiveGifts.map((gift) => ({
        id: gift.id,
        gift_id: gift.gift_id,
        gift_name: gift.gift_name,
        total_amount_fcfa: gift.total_amount,
        quantity: gift.quantity,
        created_at: gift.created_at,
      })),
      received_live_gifts: receivedLiveGifts.map((gift) => ({
        id: gift.id,
        gift_id: gift.gift_id,
        gift_name: gift.gift_name,
        creator_earnings_fcfa: gift.creator_earnings,
        total_amount_fcfa: gift.total_amount,
        quantity: gift.quantity,
        created_at: gift.created_at,
      })),
      pagination: { page, limit },
    };
  }

  /** Phase 9 : taux document pour conversion coins → FCFA (retrait / portefeuille vendeur). */
  getCoinEconomyInfo() {
    return {
      fcfa_per_coin_payout: COIN_FCFA_PER_COIN_PAYOUT,
      approx_fcfa_per_coin_purchase: COIN_FCFA_APPROX_PURCHASE_PER_COIN,
      min_coins_for_exchange: COIN_EXCHANGE_MIN_COINS,
      usd_per_100_coins_payout: COIN_USD_PER_100_COINS_PAYOUT,
    };
  }

  /**
   * Échange des coins (wallet COIN) vers le solde FCFA `SellerWallet` au taux document (1 coin = 2 FCFA par défaut).
   */
  async exchangeCoinsToSellerFcfa(userId: string, coins: number) {
    const c = Math.floor(Number(coins));
    if (!Number.isFinite(c) || c < COIN_EXCHANGE_MIN_COINS) {
      const err: any = new Error(`Minimum ${COIN_EXCHANGE_MIN_COINS} coins pour l'échange.`);
      err.statusCode = 400;
      throw err;
    }

    const fcfa = Math.round(c * COIN_FCFA_PER_COIN_PAYOUT);
    if (fcfa < 1) {
      const err: any = new Error('Montant FCFA invalide');
      err.statusCode = 400;
      throw err;
    }

    const coinsWallet = await this.getOrCreateCoinsWallet(userId);
    const bal = coinsWallet.available_balance ?? coinsWallet.balance ?? 0;
    if (bal < c) {
      const err: any = new Error(`Solde insuffisant. Solde: ${Math.round(bal)} coins.`);
      err.statusCode = 400;
      throw err;
    }

    const refId = `coin-exchange:${userId}:${Date.now()}`;
    const withdrawalService = (await import('./withdrawal.service.js')).default;

    await ledgerService.debit(coinsWallet.id, c, {
      referenceId: refId,
      referenceType: 'payout',
      description: `Échange ${c} coins → ${fcfa} FCFA (portefeuille vendeur)`,
    });

    try {
      const sw = await withdrawalService.getSellerWallet(userId);
      await prisma.sellerWallet.update({
        where: { id: sw.id },
        data: { balance: { increment: fcfa } },
      });
      await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'coin_exchange_to_fcfa',
          amount: fcfa,
          currency: 'XOF',
          status: 'completed',
          description: `Échange ${c} coins → ${fcfa} FCFA`,
          reference_id: refId,
          payment_method: 'internal',
        },
      });
    } catch (e) {
      await ledgerService.credit(coinsWallet.id, c, {
        referenceId: `rollback-${refId}`,
        referenceType: 'other',
        description: 'Annulation échange coins (erreur crédit FCFA)',
      });
      throw e;
    }

    const updated = await this.getBalance(userId);
    const sw2 = await withdrawalService.getSellerWallet(userId);
    return {
      coins_debited: c,
      fcfa_credited: fcfa,
      coins_balance: updated.coins_balance,
      seller_wallet_balance_fcfa: sw2.balance,
      rate_fcfa_per_coin: COIN_FCFA_PER_COIN_PAYOUT,
    };
  }

  /** E — mission quotidienne : 10–50 coins (une fois / jour UTC). */
  async claimDailyCoinsMission(userId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    try {
      await prisma.dailyMissionCompletion.create({
        data: {
          user_id: userId,
          mission_type: 'coins_daily_grant',
          completed_date: today,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const err = new Error('Mission déjà réclamée aujourd’hui') as Error & { statusCode?: number };
        err.statusCode = 409;
        throw err;
      }
      throw e;
    }
    const coins = 10 + Math.floor(Math.random() * 41);
    const wallet = await this.getOrCreateCoinsWallet(userId);
    const ref = `daily-coins:${userId}:${today.toISOString().slice(0, 10)}`;
    await ledgerService.credit(wallet.id, coins, {
      referenceId: ref,
      referenceType: 'other',
      description: 'Mission quotidienne coins',
    });
    const bal = await this.getBalance(userId);
    return { coins_granted: coins, ...bal };
  }

  /**
   * E — crédit IAP (Apple/Google) : idempotence sur transaction_id.
   * En prod : valider le reçu côté App Store / Play Developer API avant d’appeler cette méthode.
   */
  async creditIapCoinPurchase(
    userId: string,
    body: { transaction_id: string; platform: 'ios' | 'android'; package_id: string },
  ) {
    const txId = String(body.transaction_id || '').trim();
    if (!txId) throw new Error('transaction_id requis');
    const pkg = await this.getPackageById(String(body.package_id || '').trim());
    if (!pkg) throw new Error('Pack introuvable');
    const ref = `iap:${body.platform}:${txId}`;
    const wallet = await this.getOrCreateCoinsWallet(userId);
    const existing = await prisma.ledgerEntry.findFirst({
      where: { wallet_id: wallet.id, reference_id: ref },
      select: { id: true },
    });
    if (existing) {
      const bal = await this.getBalance(userId);
      return { already_credited: true, coins_balance: bal.coins_balance, package: pkg };
    }
    const totalCoins = pkg.coins_amount + pkg.bonus_coins;
    await ledgerService.credit(wallet.id, totalCoins, {
      referenceId: ref,
      referenceType: 'deposit',
      description: `Achat IAP ${body.platform} ${pkg.id}`,
    });
    const bal = await this.getBalance(userId);
    return { already_credited: false, coins_credited: totalCoins, ...bal, package: pkg };
  }
}

export const coinsService = new CoinsService();
export default coinsService;
