import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import verificationService from './verification.service.js';

/** Calcule credit_score (0-100) et risk_level à partir du profil emprunteur et des paramètres du prêt */
function computeCreditScore(borrowerId: string, amount: number, repaymentMonths: number, kycApproved: boolean, hasDefaultedLoan: boolean): { credit_score: number; risk_level: 'low' | 'medium' | 'high' } {
  let score = 50;
  if (kycApproved) score += 20;
  if (!hasDefaultedLoan) score += 15;
  if (repaymentMonths <= 6) score += 10;
  else if (repaymentMonths <= 12) score += 5;
  if (amount <= 100_000) score += 5;
  else if (amount > 500_000) score -= 5;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const risk_level: 'low' | 'medium' | 'high' = score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high';
  return { credit_score: score, risk_level };
}

class MicrocreditService {
  async list(page: number = 1, limit: number = 20, filters?: {
    status?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;

    const [loans, total] = await Promise.all([
      prisma.loanRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          borrower: { select: { id: true, full_name: true, profile_image: true, email: true } },
          contributions: { select: { id: true } },
        },
      }),
      prisma.loanRequest.count({ where }),
    ]);

    const loansWithBorrower = loans.map((loan: any) => ({
      ...loan,
      borrower_name: loan.borrower?.full_name ?? loan.borrower?.email?.split('@')[0] ?? 'Emprunteur',
      borrower_avatar: loan.borrower?.profile_image ?? undefined,
      lenders_count: loan.contributions?.length ?? 0,
    }));

    return {
      loans: loansWithBorrower,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Demandes de prêt de l'utilisateur connecté (historique + suivi). */
  async listLoansForBorrower(borrowerId: string, limit = 50) {
    const loans = await prisma.loanRequest.findMany({
      where: { borrower_id: borrowerId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        contributions: { select: { id: true } },
      },
    });
    return loans.map((loan) => {
      const { contributions, ...rest } = loan;
      return { ...rest, lenders_count: contributions.length };
    });
  }

  async getById(loanId: string) {
    const loan = await prisma.loanRequest.findUnique({
      where: { id: loanId },
      include: {
        borrower: { select: { id: true, full_name: true, profile_image: true, email: true } },
        contributions: {
          take: 20,
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!loan) return null;
    return {
      ...loan,
      borrower_name: loan.borrower?.full_name ?? loan.borrower?.email?.split('@')[0] ?? 'Emprunteur',
      borrower_avatar: loan.borrower?.profile_image ?? undefined,
      lenders_count: loan.contributions?.length ?? 0,
    };
  }

  async createRequest(borrowerId: string, data: {
    amount: number;
    purpose: string;
    repaymentPeriod: number;
    interestRate: number;
    business_plan?: string;
  }) {
    const strictKyc = process.env.STRICT_KYC_FINANCE === 'true';
    if (strictKyc) {
      const kycOk = await verificationService.isKycApproved(borrowerId);
      if (!kycOk) {
        const err: any = new Error('Vérification d\'identité (KYC) requise pour déposer une demande de prêt. Complétez votre vérification dans Paramètres.');
        err.statusCode = 403;
        throw err;
      }
    }

    const hasDefaultedLoan = await prisma.loanRequest.count({
      where: { borrower_id: borrowerId, status: 'defaulted' },
    }) > 0;
    if (hasDefaultedLoan) {
      const err: any = new Error('Vous avez un prêt en défaut. Règlez-le avant de déposer une nouvelle demande.');
      err.statusCode = 403;
      throw err;
    }
    const walletSecurity = (await import('./walletSecurity.service.js')).default;
    const sec = await walletSecurity.getOrCreate(borrowerId);
    if (sec.is_blocked) {
      const err: any = new Error(sec.blocked_reason || 'Compte bloqué pour les opérations financières.');
      err.statusCode = 403;
      throw err;
    }
    const kycApproved = await verificationService.isKycApproved(borrowerId);
    const { credit_score, risk_level } = computeCreditScore(
      borrowerId,
      data.amount,
      data.repaymentPeriod,
      kycApproved,
      hasDefaultedLoan,
    );

    const loan = await prisma.loanRequest.create({
      data: {
        borrower_id: borrowerId,
        amount_requested: data.amount,
        current_amount: 0,
        purpose: data.purpose,
        repayment_period_months: data.repaymentPeriod,
        interest_rate: data.interestRate,
        business_plan: data.business_plan ?? undefined,
        status: 'active',
        credit_score,
        risk_level,
      },
    });

    logger.info('Loan request created', { borrowerId, loanId: loan.id, credit_score, risk_level });
    return loan;
  }

  async contribute(loanId: string, lenderId: string, data: {
    amount: number;
    phone: string;
  }) {
    const loan = await prisma.loanRequest.findUnique({
      where: { id: loanId },
    });

    if (!loan || (loan.status !== 'active' && loan.status !== 'pending')) {
      throw new Error('Loan not found or not available');
    }

    // Créer la contribution en attente
    const contribution = await prisma.microloanContribution.create({
      data: {
        loan_id: loanId,
        lender_id: lenderId,
        amount: data.amount,
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: lenderId,
        type: 'loan_contribution',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Contribution microcrédit - Prêt ${loanId}`,
        reference_id: contribution.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        lenderId,
        contribution.id,
        {
          amount: data.amount,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/microcredit/${loanId}?contribution=success`,
        }
      );

      logger.info('Contribution microcrédit créée et paiement Orange Money initié', {
        contributionId: contribution.id,
        loanId,
        lenderId,
        amount: data.amount,
      });

      return {
        ...contribution,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      // En cas d'erreur, supprimer la contribution
      await prisma.microloanContribution.delete({
        where: { id: contribution.id },
      });

      await prisma.transaction.delete({
        where: { id: transaction.id },
      });

      throw error;
    }
  }

  /**
   * Confirmer une contribution après paiement Orange Money
   */
  async confirmContribution(contributionId: string) {
    const contribution = await prisma.microloanContribution.findUnique({
      where: { id: contributionId },
      include: {
        loan_request: true,
      },
    });

    if (!contribution) {
      throw new Error('Contribution non trouvée');
    }

    // Mettre à jour la transaction
    await prisma.transaction.updateMany({
      where: {
        reference_id: contributionId,
        type: 'loan_contribution',
      },
      data: {
        status: 'completed',
      },
    });

    // Vérifier si le prêt est complètement financé
    const totalContributions = await prisma.microloanContribution.aggregate({
      where: { loan_id: contribution.loan_id },
      _sum: { amount: true },
    });

    const totalFunded = totalContributions._sum.amount || 0;

    const targetAmount = contribution.loan_request?.amount_requested ?? 0;
    if (totalFunded >= targetAmount) {
      const fundedAt = new Date();
      await prisma.loanRequest.update({
        where: { id: contribution.loan_id },
        data: {
          status: 'funded',
          current_amount: totalFunded,
          funded_at: fundedAt,
        },
      });
      await this.generateRepaymentSchedule(contribution.loan_id, totalFunded, contribution.loan_request!);
    } else {
      await prisma.loanRequest.update({
        where: { id: contribution.loan_id },
        data: { current_amount: totalFunded },
      });
    }

    logger.info('Contribution microcrédit confirmée', { contributionId, loanId: contribution.loan_id });
    return contribution;
  }

  /** Génère les échéances (LoanRepayment) quand le prêt passe en funded */
  private async generateRepaymentSchedule(loanId: string, principal: number, loan: { interest_rate: number; repayment_period_months: number }) {
    const months = loan.repayment_period_months || 12;
    const totalToRepay = principal * (1 + (loan.interest_rate / 100) * (months / 12));
    const amountPerMonth = totalToRepay / months;
    const dueDates: { due_date: Date; amount_due: number }[] = [];
    const start = new Date();
    for (let i = 1; i <= months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      dueDates.push({ due_date: d, amount_due: Math.round(amountPerMonth * 100) / 100 });
    }
    await prisma.loanRepayment.createMany({
      data: dueDates.map(({ due_date, amount_due }) => ({
        loan_id: loanId,
        due_date,
        amount_due,
      })),
    });
    logger.info('Repayment schedule created', { loanId, installments: months });
  }

  /** Marquer une échéance comme payée (totalement ou partiellement) */
  async markRepaymentPaid(repaymentId: string, amountPaid: number) {
    const repayment = await prisma.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: { loan_request: true },
    });
    if (!repayment) throw new Error('Échéance non trouvée');
    if (repayment.loan_request.status !== 'funded') {
      const err: any = new Error('Ce prêt n\'est pas en cours de remboursement');
      err.statusCode = 400;
      throw err;
    }
    const newPaid = (repayment.amount_paid || 0) + amountPaid;
    const status = newPaid >= repayment.amount_due ? 'paid' : 'partial';
    const paidAt = newPaid >= repayment.amount_due ? new Date() : null;
    await prisma.loanRepayment.update({
      where: { id: repaymentId },
      data: { amount_paid: newPaid, status, paid_at: paidAt, updated_at: new Date() },
    });
    const allPaid = await prisma.loanRepayment.count({
      where: { loan_id: repayment.loan_id, status: { not: 'paid' } },
    }) === 0;
    if (allPaid) {
      await prisma.loanRequest.update({
        where: { id: repayment.loan_id },
        data: { status: 'completed', updated_at: new Date() },
      });
    }
    return { repayment: await prisma.loanRepayment.findUnique({ where: { id: repaymentId } }), loan_completed: allPaid };
  }

  /** Vérifier les échéances en retard et passer en defaulted + bloquer l'emprunteur (à appeler par cron ou admin) */
  async checkOverdueAndMarkDefault() {
    const overdueDays = parseInt(process.env.LOAN_OVERDUE_DAYS ?? '30', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - overdueDays);
    const overdue = await prisma.loanRepayment.findMany({
      where: {
        status: { in: ['pending', 'partial'] },
        due_date: { lt: cutoff },
        loan_request: { status: 'funded' },
      },
      include: { loan_request: true },
    });
    const loanIds = [...new Set(overdue.map((r) => r.loan_id))];
    const walletSecurity = (await import('./walletSecurity.service.js')).default;
    for (const loanId of loanIds) {
      const loan = await prisma.loanRequest.findUnique({
        where: { id: loanId },
        select: { borrower_id: true },
      });
      if (!loan) continue;
      await prisma.loanRequest.update({
        where: { id: loanId },
        data: { status: 'defaulted', updated_at: new Date() },
      });
      await prisma.loanRepayment.updateMany({
        where: { loan_id: loanId, status: { not: 'paid' } },
        data: { status: 'overdue', updated_at: new Date() },
      });
      await walletSecurity.blockUser(loan.borrower_id, 'Prêt en défaut de paiement (échéances non honorées). Contactez le support.');
      logger.warn('Loan marked defaulted and borrower blocked', { loanId, borrowerId: loan.borrower_id });
    }
    return { marked_defaulted: loanIds.length };
  }

  /** Liste des échéances d'un prêt */
  async getRepayments(loanId: string) {
    return prisma.loanRepayment.findMany({
      where: { loan_id: loanId },
      orderBy: { due_date: 'asc' },
    });
  }
}

export default new MicrocreditService();

