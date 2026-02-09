import { api } from '@/api/expressClient';

/**
 * ML-based Credit Scoring Model for Microloans
 */
export class CreditScoringModel {
  
  /**
   * Calculate credit score (0-100) based on multiple factors
   */
  static async calculateCreditScore(borrowerId, loanRequest) {
    try {
      const [userHistory, borrowerData] = await Promise.all([
        this.getBorrowerHistory(borrowerId),
        this.getBorrowerProfile(borrowerId)
      ]);

      let score = 50; // Base score

      // 1. Repayment History (0-25 points)
      if (userHistory.totalLoans > 0) {
        const repaymentRate = userHistory.successfulRepayments / userHistory.totalLoans;
        score += repaymentRate * 25;
      } else {
        score += 10; // New borrower bonus
      }

      // 2. Loan Purpose Analysis (0-15 points)
      const purposeScores = {
        business: 15,
        agriculture: 14,
        education: 13,
        sante: 12,
        equipement: 11,
        urgence: 5,
        autre: 7
      };
      score += purposeScores[loanRequest.purpose] || 7;

      // 3. Loan-to-Income Ratio (0-20 points)
      if (borrowerData.estimatedIncome) {
        const loanToIncomeRatio = loanRequest.amount_requested / (borrowerData.estimatedIncome * 12);
        if (loanToIncomeRatio <= 3) score += 20;
        else if (loanToIncomeRatio <= 5) score += 15;
        else if (loanToIncomeRatio <= 7) score += 10;
        else score += 5;
      }

      // 4. Repayment Period Assessment (0-15 points)
      const monthlyPayment = loanRequest.monthly_payment;
      const estimatedMonthlyIncome = borrowerData.estimatedIncome || 50000;
      const paymentToIncomeRatio = monthlyPayment / estimatedMonthlyIncome;
      
      if (paymentToIncomeRatio <= 0.2) score += 15;
      else if (paymentToIncomeRatio <= 0.35) score += 12;
      else if (paymentToIncomeRatio <= 0.5) score += 8;
      else score += 3;

      // 5. Business Plan Quality (0-10 points)
      if (loanRequest.business_plan) {
        const planQuality = this.assessBusinessPlanQuality(loanRequest.business_plan);
        score += planQuality;
      }

      // 6. Guarantors & Collateral (0-5 points)
      if (loanRequest.guarantors && loanRequest.guarantors.length > 0) score += 3;
      if (loanRequest.collateral) score += 2;

      // 7. Multiple Loans History (0-10 points - active loans)
      if (userHistory.totalLoans >= 3) score += 10;
      else if (userHistory.totalLoans >= 2) score += 7;
      else if (userHistory.totalLoans === 1) score += 4;

      // 8. Document Completeness (0-5 points)
      if (loanRequest.documents && loanRequest.documents.length >= 2) score += 5;
      else if (loanRequest.documents && loanRequest.documents.length >= 1) score += 3;

      return Math.min(Math.max(Math.round(score), 0), 100);
    } catch (_error) {
      console.error('Erreur calcul score crédit:', error);
      return 50;
    }
  }

  /**
   * Assess business plan quality
   */
  static assessBusinessPlanQuality(businessPlan) {
    if (!businessPlan) return 0;
    
    const length = businessPlan.length;
    const hasNumbers = /\d+/.test(businessPlan);
    const hasDetails = businessPlan.length > 100;
    const hasTimeline = /semaine|mois|trimestre|année|janvier|février|mars|avril/i.test(businessPlan);
    
    let quality = 0;
    if (length > 50) quality += 2;
    if (length > 200) quality += 2;
    if (hasNumbers) quality += 2;
    if (hasDetails) quality += 2;
    if (hasTimeline) quality += 2;
    
    return Math.min(quality, 10);
  }

  /**
   * Get borrower's loan history
   */
  static async getBorrowerHistory(borrowerId) {
    try {
      const loans = await api.entities.LoanRequest.filter({
        borrower_id: borrowerId
      }, '-created_date', 100);

      let successfulRepayments = 0;
      let totalLoans = loans.length;
      let totalRepaid = 0;

      for (const loan of loans) {
        if (loan.status === 'completed') {
          successfulRepayments++;
          totalRepaid += loan.amount_requested;
        } else if (loan.status === 'defaulted') {
          totalLoans++; // Count as negative signal
        }
      }

      const repaymentHistory = loans
        .filter(l => l.repayment_history && l.repayment_history.length > 0)
        .flatMap(l => l.repayment_history);

      const onTimePayments = repaymentHistory.filter(r => r.status === 'paid').length;
      const latePayments = repaymentHistory.filter(r => r.status === 'late').length;
      const missedPayments = repaymentHistory.filter(r => r.status === 'missed').length;

      return {
        totalLoans,
        successfulRepayments,
        totalRepaid,
        onTimePayments,
        latePayments,
        missedPayments,
        averageLoanSize: totalLoans > 0 ? totalRepaid / totalLoans : 0
      };
    } catch (_error) {
      console.error('Erreur historique emprunteur:', error);
      return {
        totalLoans: 0,
        successfulRepayments: 0,
        totalRepaid: 0,
        onTimePayments: 0,
        latePayments: 0,
        missedPayments: 0
      };
    }
  }

  /**
   * Get borrower profile and estimate income
   */
  static async getBorrowerProfile(borrowerId) {
    try {
      const user = await [];
      
      if (user.length === 0) {
        return { estimatedIncome: 30000 };
      }

      // Estimate income based on activity and profile
      let estimatedIncome = 30000; // Default minimum
      
      // Check if user has seller profile (from marketplace)
      const sellerProfile = await api.entities.SellerProfile.filter({
        seller_id: borrowerId
      });

      if (sellerProfile.length > 0) {
        const avgOrderValue = 50000;
        const estimatedMonthlyOrders = 3;
        estimatedIncome = Math.max(estimatedIncome, avgOrderValue * estimatedMonthlyOrders);
      }

      return { estimatedIncome };
    } catch (_error) {
      console.error('Erreur profil emprunteur:', error);
      return { estimatedIncome: 30000 };
    }
  }

  /**
   * Predict default risk (0-100, higher = higher risk)
   */
  static async predictDefaultRisk(borrowerId, creditScore, loanRequest) {
    try {
      const history = await this.getBorrowerHistory(borrowerId);
      
      let riskScore = 100 - creditScore; // Base risk from credit score

      // Adjust based on late/missed payments
      if (history.latePayments > 0) {
        riskScore += history.latePayments * 5;
      }
      if (history.missedPayments > 0) {
        riskScore += history.missedPayments * 15;
      }

      // Adjust based on loan purpose
      const purposeRisk = {
        urgence: 25,
        autre: 20,
        education: 15,
        sante: 15,
        equipement: 12,
        business: 10,
        agriculture: 12
      };
      riskScore -= (purposeRisk[loanRequest.purpose] || 15);

      // Loan amount risk - higher amounts = higher risk
      if (loanRequest.amount_requested > 500000) riskScore += 10;
      if (loanRequest.amount_requested > 1000000) riskScore += 15;

      // Repayment period - longer = higher risk
      if (loanRequest.repayment_period_months > 36) riskScore += 8;

      return Math.min(Math.max(Math.round(riskScore), 0), 100);
    } catch (_error) {
      console.error('Erreur prédiction risque:', error);
      return 50;
    }
  }

  /**
   * Get risk category
   */
  static getRiskCategory(riskScore) {
    if (riskScore <= 25) return { category: 'Très faible', color: 'green', icon: '✅' };
    if (riskScore <= 45) return { category: 'Faible', color: 'emerald', icon: '✓' };
    if (riskScore <= 65) return { category: 'Modéré', color: 'yellow', icon: '⚠️' };
    if (riskScore <= 85) return { category: 'Élevé', color: 'orange', icon: '⚠️' };
    return { category: 'Très élevé', color: 'red', icon: '❌' };
  }

  /**
   * Recommend loan terms based on credit score
   */
  static recommendLoanTerms(creditScore, requestedAmount) {
    let recommendedAmount = requestedAmount;
    let recommendedRate = 10; // Base rate

    if (creditScore >= 80) {
      recommendedRate = 5;
      recommendedAmount = requestedAmount * 1.2; // Can borrow 20% more
    } else if (creditScore >= 70) {
      recommendedRate = 7;
      recommendedAmount = requestedAmount * 1.1;
    } else if (creditScore >= 60) {
      recommendedRate = 8;
      recommendedAmount = requestedAmount;
    } else if (creditScore >= 50) {
      recommendedRate = 10;
      recommendedAmount = requestedAmount * 0.8;
    } else {
      recommendedRate = 12;
      recommendedAmount = requestedAmount * 0.6;
    }

    return {
      recommendedAmount: Math.round(recommendedAmount),
      interestRate: recommendedRate,
      approvalLikelihood: creditScore // Percentage
    };
  }

  /**
   * Generate detailed credit report
   */
  static async generateCreditReport(borrowerId, loanRequest) {
    try {
      const creditScore = await this.calculateCreditScore(borrowerId, loanRequest);
      const defaultRisk = await this.predictDefaultRisk(borrowerId, creditScore, loanRequest);
      const history = await this.getBorrowerHistory(borrowerId);
      const riskCategory = this.getRiskCategory(defaultRisk);
      const recommendations = this.recommendLoanTerms(creditScore, loanRequest.amount_requested);

      return {
        creditScore,
        defaultRisk,
        riskCategory,
        recommendations,
        history,
        timestamp: new Date().toISOString(),
        analysis: {
          repaymentHistory: history.totalLoans > 0 
            ? `${Math.round((history.successfulRepayments / history.totalLoans) * 100)}% de repayment réussi`
            : 'Nouvel emprunteur',
          paymentBehavior: `${history.onTimePayments} paiements à l'heure, ${history.latePayments} en retard, ${history.missedPayments} manqués`,
          loanPurpose: `Objectif: ${loanRequest.purpose}`,
          recommendation: creditScore >= 70 
            ? `✅ Approuvé recommandé au taux de ${recommendations.interestRate}%`
            : `⚠️ À examiner avec prudence - Score faible`
        }
      };
    } catch (_error) {
      console.error('Erreur rapport crédit:', error);
      return null;
    }
  }
}

export default CreditScoringModel;


