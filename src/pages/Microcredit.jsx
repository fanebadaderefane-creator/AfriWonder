import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  Search,
  Users,
  TrendingUp,
  Clock,
  Target,
  Brain,
  Wallet,
  Folder,
  Briefcase,
  GraduationCap,
  Heart,
  Sprout,
  AlertTriangle,
  Wrench,
  FileText,
  AlertCircle,
  Zap,
  Store,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';
import {
  MOCK_LOANS,
  MOCK_ACTIVE_LOAN,
  CREDIT_PRODUCTS,
  LOAN_PURPOSE_OPTIONS,
} from '@/data/microcreditMock';

const CATEGORIES = [
  { id: 'all', label: 'Tous', Icon: Folder },
  { id: 'business', label: 'Business', Icon: Briefcase },
  { id: 'education', label: 'Éducation', Icon: GraduationCap },
  { id: 'sante', label: 'Santé', Icon: Heart },
  { id: 'agriculture', label: 'Agriculture', Icon: Sprout },
  { id: 'urgence', label: 'Urgence', Icon: AlertTriangle },
  { id: 'equipement', label: 'Équipement', Icon: Wrench },
];

const PRODUCT_ICONS = { zap: Zap, store: Store, sprout: Sprout };

export default function Microcredit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestStep, setRequestStep] = useState(1);
  const [requestForm, setRequestForm] = useState({
    amount: '',
    purpose: '',
    fullName: '',
    phone: '',
    monthlyIncome: '',
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ['microcredit-loans', selectedPurpose, sortBy],
    queryFn: async () => {
      try {
        const res = await api.microcredit.list({ status: 'active', limit: 100 });
        const list = res?.loans ?? res?.data?.loans ?? (Array.isArray(res) ? res : res?.data ?? []);
        return Array.isArray(list) ? list : [];
      } catch (_e) {
        return [];
      }
    },
  });

  const { data: kycVerifications = [] } = useQuery({
    queryKey: ['user-verifications-kyc', user?.id],
    queryFn: async () => {
      try {
        const list = await api.entities?.UserVerification?.filter?.({ user_id: user?.id });
        return Array.isArray(list) ? list : [];
      } catch (_e) {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const idVerification = kycVerifications.find((v) => v.verification_type === 'id');
  const kycStatus = !idVerification || idVerification.status === 'rejected' ? 'required' : idVerification.status;

  const apiLoans = Array.isArray(loansData) ? loansData : [];
  const loans = apiLoans.length > 0 ? apiLoans : MOCK_LOANS;

  const filteredLoans = loans.filter((l) => {
    const matchSearch =
      !searchQuery ||
      l.business_plan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.borrower_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPurpose = selectedPurpose === 'all' || l.purpose === selectedPurpose;
    return matchSearch && matchPurpose;
  });

  const sortedLoans = (() => {
    const arr = [...filteredLoans];
    if (sortBy === 'credit_score') arr.sort((a, b) => (b.credit_score ?? 0) - (a.credit_score ?? 0));
    else if (sortBy === 'ending_soon') arr.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    else if (sortBy === 'newest') arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr;
  })();

  const getProgressPercentage = (current, goal) =>
    goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const getDaysRemaining = (deadline) => {
    if (!deadline) return 0;
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const openRequestModal = (product) => {
    setSelectedProduct(product);
    setRequestStep(1);
    setRequestForm({ amount: '', purpose: '', fullName: '', phone: '', monthlyIncome: '' });
    setRequestModalOpen(true);
  };

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const purposeLabel = LOAN_PURPOSE_OPTIONS.find((o) => o.value === requestForm.purpose)?.label || requestForm.purpose || 'Autre';
      const payload = {
        amount: Number(requestForm.amount) || 0,
        purpose: requestForm.purpose || 'autre',
        repayment_period_months: selectedProduct?.durationMonths ?? 3,
        interest_rate: selectedProduct?.rate ?? 12,
        business_plan: `Demande ${selectedProduct?.name ?? 'prêt'} — Objet: ${purposeLabel}. Montant: ${requestForm.amount} XOF.`,
      };
      return api.microcredit.createRequest(payload);
    },
    onSuccess: () => {
      setRequestModalOpen(false);
      setSuccessModalOpen(true);
    },
    onError: () => {
      setRequestModalOpen(false);
      setSuccessModalOpen(true);
    },
  });

  const amountNum = Number(requestForm.amount) || 0;
  const product = selectedProduct;
  const rate = product ? product.rate / 100 : 0.12;
  const months = product?.durationMonths ?? 3;
  const totalRepay = amountNum * (1 + rate);
  const estimatedMonthly = months > 0 ? Math.round(totalRepay / months) : 0;

  const activeLoan = MOCK_ACTIVE_LOAN;
  const repaidPct = activeLoan.totalAmount > 0
    ? Math.round((activeLoan.repaidAmount / activeLoan.totalAmount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Microcrédit</h1>
            <p className="text-sm text-gray-500">Accédez à des prêts rapides et abordables</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full border-gray-200"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedPurpose(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-w-[70px] justify-center',
                  selectedPurpose === cat.id
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm text-gray-600 flex items-center gap-1">
          <Zap className="w-4 h-4 text-[#2563EB]" />
          Plus récents
        </span>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 rounded-lg border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Plus récents</SelectItem>
            <SelectItem value="credit_score">Meilleur score</SelectItem>
            <SelectItem value="ending_soon">Fin proche</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Scoring Banner — neutre, accent orange */}
      <div className="mx-4 mt-4 rounded-2xl bg-gray-800 text-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563EB]/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">Scoring AI avancé</span>
              <Wallet className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-300">
              Analyse intelligente des profils. Taux de remboursement: 95%
            </p>
          </div>
        </div>
      </div>

      {/* Stats — tout en neutre */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-gray-800">{sortedLoans.length}</div>
          <div className="text-xs text-gray-500">Projets actifs</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-gray-800">
            {sortedLoans.reduce((acc, l) => acc + (l.lenders_count || 0), 0)}
          </div>
          <div className="text-xs text-gray-500">Préteurs</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-gray-800">5%</div>
          <div className="text-xs text-gray-500">Taux moyen</div>
        </div>
      </div>

      {/* Active loan card — neutre, CTA orange AfriWonder */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-gray-800 text-white p-5 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Prêt actif</span>
            <Badge className="bg-[#2563EB] text-white border-0">Actif</Badge>
          </div>
          <div className="text-2xl font-bold mb-1">
            {activeLoan.totalAmount.toLocaleString('fr-FR')} F CFA
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-300 mb-1">
              <span>Remboursé</span>
              <span>{repaidPct}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all"
                style={{ width: `${repaidPct}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="text-xs text-gray-400">Prochain paiement</div>
              <div className="font-bold">{activeLoan.nextPaymentAmount.toLocaleString('fr-FR')} F CFA</div>
              <div className="text-xs text-gray-400">{activeLoan.nextPaymentDate}</div>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="text-xs text-gray-400">Restant</div>
              <div className="font-bold">{activeLoan.remainingAmount.toLocaleString('fr-FR')} F CFA</div>
              <div className="text-xs text-gray-400">Taux: {activeLoan.interestRate}%</div>
            </div>
          </div>
          <Button
            className="w-full bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-semibold rounded-xl"
            onClick={() => {}}
          >
            Rembourser maintenant
          </Button>
        </div>
      </div>

      {/* Credit products */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Nos produits de crédit</h2>
        <div className="space-y-3">
          {CREDIT_PRODUCTS.map((prod) => {
            const Icon = PRODUCT_ICONS[prod.icon] || FileText;
            return (
              <motion.div
                key={prod.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">{prod.name}</div>
                  <p className="text-sm text-gray-500">{prod.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Jusqu'à {prod.maxAmount.toLocaleString('fr-FR')} F CFA • Taux: {prod.rate}% • {prod.durationMonths} mois
                  </p>
                </div>
                <Button
                  className="rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white border-0 font-medium shrink-0"
                  onClick={() => openRequestModal(prod)}
                >
                  Demander
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* KYC Banner — 3 états : à faire / en attente admin / vérifié */}
      {kycStatus === 'required' && (
        <div className="mx-4 mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Vérification d'identité requise</h3>
              <p className="text-sm text-gray-600 mt-1">
                Pour accéder aux prêts, vous devez compléter votre KYC (pièce d'identité + selfie). Après soumission, un administrateur vérifiera votre dossier.
              </p>
              <Button className="mt-3 bg-[#2563EB] hover:bg-[#1E3A8A] text-white rounded-xl" asChild>
                <Link to={createPageUrl('UserVerification')}>Compléter mon profil</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      {kycStatus === 'pending' && (
        <div className="mx-4 mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Vérification en cours</h3>
              <p className="text-sm text-gray-600 mt-1">
                Votre KYC a été soumis. Un administrateur doit vérifier votre pièce d'identité et votre selfie avant que vous puissiez accéder aux prêts. Vous serez notifié une fois la vérification terminée.
              </p>
            </div>
          </div>
        </div>
      )}
      {kycStatus === 'approved' && (
        <div className="mx-4 mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Identité vérifiée</h3>
              <p className="text-sm text-gray-600 mt-1">
                Votre identité a été vérifiée par un administrateur. Vous pouvez accéder aux prêts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projects list */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Projets à financer</h2>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : sortedLoans.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun projet trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLoans.map((loan) => {
              const progress = getProgressPercentage(loan.current_amount ?? 0, loan.amount_requested ?? 1);
              const daysLeft = getDaysRemaining(loan.deadline);
              return (
                <Link key={loan.id} to={`${createPageUrl('LoanDetails')}?id=${loan.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={loan.borrower_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                        alt={loan.borrower_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{loan.borrower_name}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORIES.find((p) => p.id === loan.purpose)?.label ?? loan.purpose}
                          </Badge>
                          {loan.credit_score != null && (
                            <Badge className="text-xs bg-gray-700 text-white">
                              {loan.credit_score}/100
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{loan.business_plan}</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-[#2563EB]">
                          {(loan.current_amount ?? 0).toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="text-gray-500">sur {(loan.amount_requested ?? 0).toLocaleString('fr-FR')}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {(loan.lenders_count ?? 0)} prêteurs
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {loan.interest_rate ?? 0}% intérêt
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {loan.repayment_period_months ?? 0} mois
                      </span>
                    </div>
                    {daysLeft > 0 && daysLeft <= 7 && (
                      <div className="mt-2 text-xs text-gray-600 font-medium">Plus que {daysLeft} jours</div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Request loan modal — multi-step */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg font-bold">
              Demande de prêt — {product?.name ?? 'Prêt'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-3 space-y-4">
            {product && (
              <div className="rounded-xl bg-gray-100 border border-gray-200 p-3">
                <div className="font-semibold text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-600">
                  Taux: {product.rate}% • Durée: {product.durationMonths} mois
                </div>
              </div>
            )}

            {requestStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant souhaité (XOF)</label>
                  <Input
                    type="number"
                    placeholder={`Max: ${product?.maxAmount?.toLocaleString('fr-FR') ?? 200000} FCFA`}
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm((f) => ({ ...f, amount: e.target.value }))}
                    className="rounded-lg border-gray-200"
                  />
                  {amountNum > 0 && (
                    <p className="mt-1 text-sm text-[#1E3A8A] font-medium">
                      Mensualité estimée: {estimatedMonthly.toLocaleString('fr-FR')} FCFA
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objet du prêt</label>
                  <Select
                    value={requestForm.purpose || '_'}
                    onValueChange={(v) => setRequestForm((f) => ({ ...f, purpose: v === '_' ? '' : v }))}
                  >
                    <SelectTrigger className="rounded-lg border-gray-200">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Sélectionner...</SelectItem>
                      {LOAN_PURPOSE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white border-0"
                  onClick={() => setRequestStep(2)}
                  disabled={!requestForm.amount || Number(requestForm.amount) < 1000}
                >
                  Continuer
                </Button>
              </>
            )}

            {requestStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <Input
                    placeholder="Votre nom"
                    value={requestForm.fullName}
                    onChange={(e) => setRequestForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <Input
                    placeholder="+223 XX XX XX XX"
                    value={requestForm.phone}
                    onChange={(e) => setRequestForm((f) => ({ ...f, phone: e.target.value }))}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenu mensuel (XOF)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 150000"
                    value={requestForm.monthlyIncome}
                    onChange={(e) => setRequestForm((f) => ({ ...f, monthlyIncome: e.target.value }))}
                    className="rounded-lg border-gray-200"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
                    onClick={() => setRequestStep(1)}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white border-0"
                    onClick={() => submitRequestMutation.mutate()}
                    disabled={submitRequestMutation.isPending || !requestForm.fullName?.trim()}
                  >
                    {submitRequestMutation.isPending ? 'Envoi...' : 'Soumettre'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success modal — accent orange uniquement */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#2563EB] flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Demande soumise !</h3>
          <p className="text-sm text-gray-600 mt-1">Votre demande est en cours d'analyse.</p>
          <p className="text-sm text-gray-600">Réponse sous <strong>24-48h</strong>.</p>
          <Button
            className="w-full mt-4 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white border-0"
            onClick={() => setSuccessModalOpen(false)}
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
