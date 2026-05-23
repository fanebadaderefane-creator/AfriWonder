/**
 * Dashboard admin fintech : volume, soldes, microcrédit, défauts, campagnes suspectes, retraits.
 */
import prisma from '../config/database.js';

export interface FinanceDashboard {
  wallets: {
    totalBalance: number;
    totalUserWallets: number;
    totalEscrowBalance: number;
    list?: Array<{ id: string; user_id: string; username?: string; balance: number; status: string }>;
  };
  transactions: {
    volumeLast24h: number;
    volumeLast7d: number;
    volumeLast30d: number;
    countLast24h: number;
  };
  microcredit: {
    activeLoans: number;
    activeAmount: number;
    fundedAmount: number;
    defaultedCount: number;
    defaultRate: number;
  };
  crowdfunding: {
    activeCampaigns: number;
    totalRaised: number;
    suspiciousCount: number;
    suspendedCount: number;
  };
  withdrawals: {
    pendingCount: number;
    pendingAmount: number;
  };
  alerts: string[];
}

class AdminFinanceService {
  async getFinanceDashboard(): Promise<FinanceDashboard> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const alerts: string[] = [];

    const [
      walletSums,
      tx24,
      tx7,
      tx30,
      activeLoans,
      defaultedLoans,
      fundedLoans,
      campaigns,
      suspiciousCampaigns,
      suspendedCampaigns,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.wallet.aggregate({
        _sum: { available_balance: true },
        where: { wallet_type: 'user' },
      }),
      prisma.transaction.aggregate({
        where: { status: 'completed', created_at: { gte: dayAgo } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { status: 'completed', created_at: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { status: 'completed', created_at: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      prisma.loanRequest.findMany({
        where: { status: 'active' },
        select: { amount_requested: true, current_amount: true },
      }),
      prisma.loanRequest.count({ where: { status: 'defaulted' } }),
      prisma.loanRequest.aggregate({
        where: { status: { in: ['funded', 'completed'] } },
        _sum: { current_amount: true },
      }),
      prisma.campaign.findMany({
        where: { status: 'active' },
        select: { current_amount: true },
      }),
      prisma.campaign.count({ where: { OR: [{ fraud_flag: true }, { report_count: { gte: 5 } }] } }),
      prisma.campaign.count({ where: { status: 'suspended' } }),
      prisma.withdrawal.aggregate({
        where: { status: 'pending' },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const escrowSum = await prisma.wallet.aggregate({
      _sum: { available_balance: true },
      where: { wallet_type: 'campaign_escrow' },
    });

    const totalUserBalance = walletSums._sum.available_balance ?? 0;

    const walletList = await prisma.wallet.findMany({
      where: { wallet_type: 'user' },
      take: 30,
      orderBy: { available_balance: 'desc' },
      include: { user: { select: { username: true } } },
    });
    const activeLoanAmount = activeLoans.reduce((s, l) => s + (l.current_amount ?? 0), 0);
    const fundedTotal = fundedLoans._sum.current_amount ?? 0;
    const defaultedCount = defaultedLoans;
    const defaultedSum = await prisma.loanRequest.aggregate({
      where: { status: 'defaulted' },
      _sum: { current_amount: true },
    });
    const totalEverFunded = fundedTotal + (defaultedSum._sum?.current_amount ?? 0);
    const defaultRate = totalEverFunded > 0 ? (defaultedCount / (defaultedCount + (await prisma.loanRequest.count({ where: { status: 'completed' } })))) * 100 : 0;

    if (suspiciousCampaigns > 0) alerts.push(`${suspiciousCampaigns} campagne(s) signalée(s) ou marquée(s) fraude`);
    if (pendingWithdrawals._count > 0) alerts.push(`${pendingWithdrawals._count} retrait(s) en attente`);

    return {
      wallets: {
        totalBalance: totalUserBalance,
        totalUserWallets: await prisma.wallet.count({ where: { wallet_type: 'user' } }),
        totalEscrowBalance: escrowSum._sum.available_balance ?? 0,
        list: walletList.map((w) => ({
          id: w.id,
          user_id: w.user_id,
          username: (w.user as { username?: string })?.username,
          balance: w.available_balance ?? w.balance ?? 0,
          status: w.status,
        })),
      },
      transactions: {
        volumeLast24h: tx24._sum.amount ?? 0,
        volumeLast7d: tx7._sum.amount ?? 0,
        volumeLast30d: tx30._sum.amount ?? 0,
        countLast24h: tx24._count ?? 0,
      },
      microcredit: {
        activeLoans: activeLoans.length,
        activeAmount: activeLoanAmount,
        fundedAmount: fundedTotal,
        defaultedCount,
        defaultRate: Math.round(defaultRate * 100) / 100,
      },
      crowdfunding: {
        activeCampaigns: campaigns.length,
        totalRaised: campaigns.reduce((s, c) => s + c.current_amount, 0),
        suspiciousCount: suspiciousCampaigns,
        suspendedCount: suspendedCampaigns,
      },
      withdrawals: {
        pendingCount: pendingWithdrawals._count ?? 0,
        pendingAmount: pendingWithdrawals._sum.amount ?? 0,
      },
      alerts,
    };
  }

  /** Geler un wallet (admin) */
  async freezeWallet(walletId: string) {
    const w = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!w) throw new Error('Wallet non trouvé');
    if (w.status === 'frozen') return w;
    return prisma.wallet.update({
      where: { id: walletId },
      data: { status: 'frozen' },
    });
  }

  /** Débloquer un wallet */
  async unfreezeWallet(walletId: string) {
    const w = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!w) throw new Error('Wallet non trouvé');
    return prisma.wallet.update({
      where: { id: walletId },
      data: { status: 'active' },
    });
  }

  /** Top N transactions récentes (pour admin finance) */
  async getTopTransactions(limit: number = 10) {
    return prisma.transaction.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });
  }
}

export const adminFinanceService = new AdminFinanceService();
export default adminFinanceService;
