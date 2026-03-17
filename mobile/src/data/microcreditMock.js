const now = new Date();
const in30 = new Date(now.getTime() + 30 * 86400000);
const in60 = new Date(now.getTime() + 60 * 86400000);

export const MOCK_LOANS = [
  { id: 'mc-1', borrower_name: 'Awa Coulibaly', business_plan: 'Commerce tissus Bamako', purpose: 'business', amount_requested: 800000, current_amount: 320000, interest_rate: 12, repayment_period_months: 6, lenders_count: 12, credit_score: 78, deadline: in60.toISOString(), created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
  { id: 'mc-2', borrower_name: 'Moussa Keita', business_plan: 'Equipement agricole', purpose: 'agriculture', amount_requested: 1500000, current_amount: 900000, interest_rate: 8, repayment_period_months: 12, lenders_count: 24, credit_score: 82, deadline: in60.toISOString(), created_at: new Date(now.getTime() - 12 * 86400000).toISOString() },
  { id: 'mc-3', borrower_name: 'Fatou Diallo', business_plan: 'Scolarite formation info', purpose: 'education', amount_requested: 350000, current_amount: 175000, interest_rate: 5, repayment_period_months: 10, lenders_count: 8, credit_score: 88, deadline: in30.toISOString(), created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
];

export const MOCK_ACTIVE_LOAN = { id: 'active-1', totalAmount: 500000, repaidAmount: 95000, nextPaymentAmount: 48000, nextPaymentDate: '15 mars 2025', remainingAmount: 404000, interestRate: 15, status: 'active' };

export const CREDIT_PRODUCTS = [
  { id: 'express', name: 'Prêt Express', description: 'Besoins urgents', maxAmount: 200000, rate: 12, durationMonths: 3, icon: 'zap' },
  { id: 'commerce', name: 'Prêt Commerce', description: 'Développez votre activité', maxAmount: 500000, rate: 10, durationMonths: 6, icon: 'store' },
  { id: 'agricole', name: 'Prêt Agricole', description: 'Agriculteurs', maxAmount: 1000000, rate: 8, durationMonths: 12, icon: 'sprout' },
];

export const LOAN_PURPOSE_OPTIONS = [
  { value: '', label: 'Sélectionner...' },
  { value: 'fonds_roulement', label: 'Fonds de roulement' },
  { value: 'equipement', label: 'Achat équipement' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'education', label: 'Éducation' },
  { value: 'sante', label: 'Santé' },
  { value: 'autre', label: 'Autre' },
];

export const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'folder' },
  { id: 'business', label: 'Business', icon: 'briefcase' },
  { id: 'education', label: 'Éducation', icon: 'school' },
  { id: 'sante', label: 'Santé', icon: 'heart' },
  { id: 'agriculture', label: 'Agriculture', icon: 'leaf' },
  { id: 'urgence', label: 'Urgence', icon: 'alert-circle' },
  { id: 'equipement', label: 'Équipement', icon: 'construct' },
];
