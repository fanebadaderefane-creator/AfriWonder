/**
 * Données fictives Microcrédit AfriWonder — démo et pré-remplissage
 * Utilisées quand l’API ne renvoie pas encore de données réelles.
 */

const now = new Date();
const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

/** Projets à financer (côté prêteurs) */
export const MOCK_LOANS = [
  {
    id: 'mc-1',
    borrower_name: 'Awa Coulibaly',
    borrower_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    business_plan: 'Ouverture d\'un petit commerce de tissus et accessoires à Bamako. Besoin de stock initial et aménagement du local.',
    purpose: 'business',
    amount_requested: 800000,
    current_amount: 320000,
    interest_rate: 12,
    repayment_period_months: 6,
    lenders_count: 12,
    credit_score: 78,
    deadline: in60Days.toISOString(),
    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mc-2',
    borrower_name: 'Moussa Keita',
    borrower_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    business_plan: 'Achat d\'équipement agricole pour augmenter la productivité de ma parcelle (tracteur, semences).',
    purpose: 'agriculture',
    amount_requested: 1500000,
    current_amount: 900000,
    interest_rate: 8,
    repayment_period_months: 12,
    lenders_count: 24,
    credit_score: 82,
    deadline: in60Days.toISOString(),
    created_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mc-3',
    borrower_name: 'Fatou Diallo',
    borrower_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    business_plan: 'Frais de scolarité et fournitures pour la formation en informatique de mon fils.',
    purpose: 'education',
    amount_requested: 350000,
    current_amount: 175000,
    interest_rate: 5,
    repayment_period_months: 10,
    lenders_count: 8,
    credit_score: 88,
    deadline: in30Days.toISOString(),
    created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mc-4',
    borrower_name: 'Ibrahim Traoré',
    borrower_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    business_plan: 'Équipement médical pour mon cabinet de soins (tensiomètres, stéthoscopes, petit laboratoire).',
    purpose: 'sante',
    amount_requested: 1200000,
    current_amount: 0,
    interest_rate: 10,
    repayment_period_months: 9,
    lenders_count: 0,
    credit_score: 72,
    deadline: in60Days.toISOString(),
    created_at: now.toISOString(),
  },
  {
    id: 'mc-5',
    borrower_name: 'Mariam Sanogo',
    borrower_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    business_plan: 'Urgence familiale: prise en charge d\'un proche à l\'hôpital. Remboursement garanti sous 3 mois.',
    purpose: 'urgence',
    amount_requested: 200000,
    current_amount: 80000,
    interest_rate: 15,
    repayment_period_months: 3,
    lenders_count: 5,
    credit_score: 65,
    deadline: in30Days.toISOString(),
    created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/** Prêt actif fictif (côté emprunteur) */
export const MOCK_ACTIVE_LOAN = {
  id: 'active-1',
  totalAmount: 500000,
  repaidAmount: 95000,
  nextPaymentAmount: 48000,
  nextPaymentDate: (() => {
    const d = new Date();
    d.setDate(15);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  })(),
  remainingAmount: 404000,
  interestRate: 15,
  status: 'active',
};

/** Produits de crédit (Prêt Express, Commerce, Agricole) */
export const CREDIT_PRODUCTS = [
  {
    id: 'express',
    name: 'Prêt Express',
    description: 'Pour vos besoins urgents',
    maxAmount: 200000,
    rate: 12,
    durationMonths: 3,
    icon: 'zap',
  },
  {
    id: 'commerce',
    name: 'Prêt Commerce',
    description: 'Développez votre activité',
    maxAmount: 500000,
    rate: 10,
    durationMonths: 6,
    icon: 'store',
  },
  {
    id: 'agricole',
    name: 'Prêt Agricole',
    description: 'Pour les agriculteurs',
    maxAmount: 1000000,
    rate: 8,
    durationMonths: 12,
    icon: 'sprout',
  },
];

/** Options objet du prêt (dropdown) */
export const LOAN_PURPOSE_OPTIONS = [
  { value: '', label: 'Sélectionner...' },
  { value: 'fonds_roulement', label: 'Fonds de roulement' },
  { value: 'equipement', label: "Achat d'équipement" },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'education', label: 'Éducation' },
  { value: 'sante', label: 'Santé' },
  { value: 'autre', label: 'Autre' },
];
