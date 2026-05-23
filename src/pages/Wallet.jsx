// AfriWonder full review PR - CodeRabbit
import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, Plus, ArrowLeft, Coins, History, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useTranslation } from '@/components/common/useTranslation';
import { useAuth } from '@/lib/AuthContext';

const COIN_PACKAGES = [
  { coins: 100, label: 'Starter', priceFcfa: 500, popular: false },
  { coins: 500, label: 'Basique', priceFcfa: 2000, popular: false },
  { coins: 1500, label: 'Standard', priceFcfa: 5000, popular: true },
  { coins: 5000, label: 'Premium', priceFcfa: 15000, popular: false },
  { coins: 15000, label: 'Mega', priceFcfa: 40000, popular: false },
  { coins: 50000, label: 'Légende', priceFcfa: 100000, popular: false },
];

export default function WalletPage() {
  const { formatNumber } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [walletTab, setWalletTab] = useState('coins'); // 'coins' | 'history' | 'virtual-cards' | 'transfers'
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'orange_money',
    orange_money_phone: '',
    paypal_email: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    pin: ''
  });
  const queryClient = useQueryClient();

  const { data: walletSecurity } = useQuery({
    queryKey: ['walletSecurity', user?.id],
    queryFn: () => api.payments.getWalletSecurity(),
    enabled: !!user?.id,
    networkMode: 'offlineFirst',
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const needsPin = walletSecurity?.has_pin && walletSecurity?.two_fa_required_for_withdrawal;

  const { data: wallet, isLoading, isError, refetch } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      return await api.payments.getWallet();
    },
    enabled: !!user?.id,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const result = await api.payments.getTransactions({ page: 1, limit: 20 });
      return result.transactions || [];
    },
    enabled: !!user?.id,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: payoutsData } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: () => api.withdrawals.list({ page: 1, limit: 20 }),
    enabled: !!user?.id,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
  const payouts = payoutsData?.withdrawals ?? payoutsData?.data ?? (Array.isArray(payoutsData) ? payoutsData : []);

  const withdrawMutation = useMutation({
    mutationFn: async (data) => {
      const amount = parseFloat(data.amount);
      if (!amount || amount <= 0) throw new Error('Montant invalide');
      const pinOpt = needsPin ? { pin: data.pin } : {};
      if (['orange_money', 'mtn_money', 'wave'].includes(data.method)) {
        const phone = data.orange_money_phone?.trim() || data.phone?.trim();
        if (!phone) throw new Error('Numéro de téléphone requis');
        if (amount < 5000) throw new Error('Montant minimum: 5 000 FCFA');
        if (needsPin && !data.pin) throw new Error('PIN wallet requis pour ce retrait');
        return api.withdrawals.request(amount, phone, { ...pinOpt, payment_method: data.method });
      }
      if (data.method === 'paypal') {
        const email = data.paypal_email?.trim();
        if (!email) throw new Error('Email PayPal requis');
        if (amount < 5000) throw new Error('Montant minimum: 5 000 FCFA');
        if (needsPin && !data.pin) throw new Error('PIN wallet requis pour ce retrait');
        return api.withdrawals.request(amount, null, { ...pinOpt, payment_method: 'paypal', paypal_email: email });
      }
      if (wallet && wallet.available_balance < amount) throw new Error('Solde insuffisant');
      if (needsPin && !data.pin) throw new Error('PIN wallet requis pour ce retrait');
      await api.payments.withdrawFromWallet(amount, `Retrait ${data.method} - ${data.account_holder || ''}`, pinOpt);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Demande de retrait enregistrée. Traitement sous 24-48h.');
      setShowWithdrawModal(false);
      setWithdrawData({
        amount: '',
        method: 'orange_money',
        orange_money_phone: '',
        paypal_email: '',
        bank_name: '',
        account_number: '',
        account_holder: '',
        pin: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || error.message || 'Erreur');
    }
  });

  if (isLoading) return <div className="text-center py-12">Chargement...</div>;

  if (isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-950 text-white">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur z-10 border-b border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl text-white hover:bg-white/10" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Portefeuille</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <p className="text-gray-300 font-medium mb-4">Une erreur s&apos;est produite.</p>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white">
            Réessayer
          </Button>
        </div>
      </motion.div>
    );
  }

  const totalSpent = (transactions || []).reduce((s, tx) => s + (tx.type === 'withdrawal' || tx.type === 'payment' ? Number(tx.amount || 0) : 0), 0);
  const totalEarned = (transactions || []).reduce((s, tx) => s + (tx.type === 'deposit' || tx.type === 'earning' ? Number(tx.amount || 0) : 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-950 text-white safe-area-pb"
    >
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur z-10 border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl text-white hover:bg-white/10" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Portefeuille</h1>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Carte Solde actuel (bleu AfriWonder) */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-6 h-6 text-blue-200" />
            <span className="text-sm text-blue-100">Solde actuel</span>
          </div>
          <p className="text-4xl font-bold text-white mb-4">
            {formatNumber(wallet?.available_balance ?? 0)} <span className="text-lg font-normal text-blue-200">FCFA</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Total dépensé</p>
              <p className="text-lg font-semibold text-white">{formatNumber(totalSpent)} FCFA</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Total gagné</p>
              <p className="text-lg font-semibold text-white">{formatNumber(wallet?.total_earnings ?? totalEarned ?? 0)} FCFA</p>
            </div>
          </div>
        </div>

        {/* Onglets Acheter des Coins | Historique */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setWalletTab('coins')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'coins' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <Coins className="w-4 h-4" />
            Coins
          </button>
          <button
            onClick={() => setWalletTab('history')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'history' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <History className="w-4 h-4" />
            Historique
          </button>
          <button
            onClick={() => setWalletTab('virtual-cards')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'virtual-cards' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <CreditCard className="w-4 h-4" />
            Cartes
          </button>
          <button
            onClick={() => setWalletTab('transfers')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'transfers' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <Send className="w-4 h-4" />
            Transferts
          </button>
        </div>

        {walletTab === 'coins' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {COIN_PACKAGES.map((pkg) => (
                <motion.button
                  key={pkg.coins}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(createPageUrl('RechargeWallet') + `?amount=${pkg.priceFcfa}`)}
                  className={`relative rounded-xl bg-gray-800/80 border p-4 text-left hover:border-blue-500/50 transition-colors ${pkg.popular ? 'border-blue-500/70 ring-1 ring-blue-500/30' : 'border-gray-700'}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] font-bold text-white">POPULAIRE</span>
                  )}
                  <div className="flex justify-center mb-2">
                    <span className="text-2xl">🪙</span>
                  </div>
                  <p className="text-xl font-bold text-white text-center">{formatNumber(pkg.coins)}</p>
                  <p className="text-xs text-gray-400 text-center mb-1">{pkg.label}</p>
                  <p className="text-sm text-blue-300 text-center font-medium">{formatNumber(pkg.priceFcfa)} FCFA</p>
                </motion.button>
              ))}
            </div>
            <Button
              onClick={() => navigate(createPageUrl('RechargeWallet'))}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Recharger (montant libre)
            </Button>
          </>
        )}

        {walletTab === 'history' && (
          <div className="space-y-2 mb-6">
            {!transactions?.length && <p className="text-gray-400 text-center py-8">Aucune transaction</p>}
            {transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-800/60 border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(tx.type === 'deposit' || tx.type === 'earning') ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-300'}`}>
                    {(tx.type === 'deposit' || tx.type === 'earning') ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{tx.description || tx.type === 'deposit' ? 'Achat de coins' : tx.type}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at || tx.created_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <p className={`font-semibold ${(tx.type === 'deposit' || tx.type === 'earning') ? 'text-green-400' : 'text-gray-300'}`}>
                  {(tx.type === 'deposit' || tx.type === 'earning') ? '+' : '-'}{formatNumber(tx.amount || 0)} FCFA
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CPO 5.9 — Cartes virtuelles (complet) */}
        {walletTab === 'virtual-cards' && (
          <WalletVirtualCards />
        )}

        {/* CPO 5.23 + 5.39 — Transferts internationaux + Préautorisations */}
        {walletTab === 'transfers' && (
          <WalletTransfersAndPreauths />
        )}

        {wallet?.available_balance > 0 && (
          <div className="mb-6">
            <Button
              onClick={() => setShowWithdrawModal(true)}
              variant="outline"
              className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 rounded-xl"
              size="lg"
            >
              Demander un retrait
            </Button>
          </div>
        )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <Card className="mb-8 border-blue-500/30 bg-gray-800 text-white">
          <CardHeader>
            <CardTitle>Retrait de fonds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Montant</label>
              <Input
                type="number"
                placeholder="Montant en FCFA"
                value={withdrawData.amount}
                onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})}
                max={wallet?.available_balance}
              />
              <p className="text-xs text-gray-600 mt-1">
                Max: {formatNumber(wallet?.available_balance ?? 0)} XOF
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Méthode de retrait</label>
              <Select 
                value={withdrawData.method}
                onValueChange={(value) => setWithdrawData({...withdrawData, method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['orange_money', 'mtn_money', 'wave'].includes(withdrawData.method) && (
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Numéro {withdrawData.method === 'orange_money' ? 'Orange Money' : withdrawData.method === 'mtn_money' ? 'MTN Money' : 'Wave'} *
                </label>
                <Input
                  placeholder="77 12 34 56 78 ou 76 12 34 56 78"
                  value={withdrawData.orange_money_phone}
                  onChange={(e) => setWithdrawData({...withdrawData, orange_money_phone: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Min. 5 000 FCFA • Délai 2-7 jours</p>
              </div>
            )}

            {withdrawData.method === 'paypal' && (
              <div>
                <label className="text-sm font-semibold block mb-2">Email PayPal *</label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={withdrawData.paypal_email}
                  onChange={(e) => setWithdrawData({...withdrawData, paypal_email: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Min. 5 000 FCFA • Conversion XOF→USD</p>
              </div>
            )}

            {withdrawData.method === 'bank_transfer' && (
              <>
                <Input
                  placeholder="Nom de la banque"
                  value={withdrawData.bank_name}
                  onChange={(e) => setWithdrawData({...withdrawData, bank_name: e.target.value})}
                />
                <Input
                  placeholder="Numéro de compte"
                  value={withdrawData.account_number}
                  onChange={(e) => setWithdrawData({...withdrawData, account_number: e.target.value})}
                />
                <Input
                  placeholder="Titulaire du compte"
                  value={withdrawData.account_holder}
                  onChange={(e) => setWithdrawData({...withdrawData, account_holder: e.target.value})}
                />
              </>
            )}

            {needsPin && (
              <div>
                <label className="text-sm font-semibold block mb-2">PIN wallet *</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="4 à 8 chiffres"
                  value={withdrawData.pin}
                  onChange={(e) => setWithdrawData({...withdrawData, pin: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => withdrawMutation.mutate(withdrawData)}
                disabled={withdrawMutation.isPending || !withdrawData.amount || (['orange_money', 'mtn_money', 'wave'].includes(withdrawData.method) && !withdrawData.orange_money_phone?.trim()) || (withdrawData.method === 'paypal' && !withdrawData.paypal_email?.trim()) || (needsPin && !withdrawData.pin) || (parseFloat(withdrawData.amount) < 5000)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {withdrawMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
              </Button>
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      </div>
    </motion.div>
  );
}

// CPO 5.9 — Cartes virtuelles (liste, créer, révoquer)
function WalletVirtualCards() {
  const queryClient = useQueryClient();
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['me-virtual-cards'],
    queryFn: () => api.me.getVirtualCards(),
  });
  const createMutation = useMutation({
    mutationFn: (opts) => api.me.createVirtualCard(opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-virtual-cards'] });
      toast.success('Carte créée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const revokeMutation = useMutation({
    mutationFn: (id) => api.me.revokeVirtualCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-virtual-cards'] });
      toast.success('Carte bloquée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const formatExpiry = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' }) : '');
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Mes cartes virtuelles</h3>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          onClick={() => createMutation.mutate({})}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Nouvelle carte
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : cards.length === 0 ? (
        <Card className="border-gray-700 bg-gray-800/80 text-white">
          <CardContent className="p-6 text-center">
            <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">Aucune carte. Cliquez sur « Nouvelle carte » pour en générer une.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Card key={card.id} className="border-gray-700 bg-gray-800/80 text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• {card.last4}</p>
                    <p className="text-xs text-gray-500">Expire {formatExpiry(card.expires_at)} · {card.status}</p>
                  </div>
                </div>
                {card.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg"
                    onClick={() => revokeMutation.mutate(card.id)}
                    disabled={revokeMutation.isPending}
                  >
                    Bloquer
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// CPO 5.23 + 5.39 — Transferts internationaux + Préautorisations
function WalletTransfersAndPreauths() {
  const queryClient = useQueryClient();
  const [showTransferForm, setShowTransferForm] = useState(false);
  const { data: transfersData, isLoading: loadingTransfers } = useQuery({
    queryKey: ['me-international-transfers'],
    queryFn: () => api.me.getInternationalTransfers({ page: 1, limit: 20 }),
  });
  const { data: preauthsData, isLoading: loadingPreauths } = useQuery({
    queryKey: ['me-preauths'],
    queryFn: () => api.me.getPreauths({ page: 1, limit: 20 }),
  });
  const transfers = transfersData?.items ?? [];
  const preauths = preauthsData?.items ?? [];
  const createTransferMutation = useMutation({
    mutationFn: (payload) => api.me.createInternationalTransfer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-international-transfers'] });
      setShowTransferForm(false);
      toast.success('Demande de transfert enregistrée');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });
  const capturePreauthMutation = useMutation({
    mutationFn: (id) => api.me.capturePreauth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-preauths'] });
      toast.success('Préautorisation capturée');
    },
  });
  const cancelPreauthMutation = useMutation({
    mutationFn: (id) => api.me.cancelPreauth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-preauths'] });
      toast.success('Préautorisation annulée');
    },
  });
  const [transferForm, setTransferForm] = useState({
    recipient_name: '',
    recipient_country: '',
    recipient_iban: '',
    amount: '',
    currency: 'XOF',
  });
  const handleCreateTransfer = (e) => {
    e.preventDefault();
    const amount = parseFloat(transferForm.amount);
    if (!transferForm.recipient_name?.trim() || !transferForm.recipient_country?.trim() || !amount || amount <= 0) {
      toast.error('Nom, pays et montant requis');
      return;
    }
    createTransferMutation.mutate({
      recipient_name: transferForm.recipient_name.trim(),
      recipient_country: transferForm.recipient_country.trim(),
      recipient_iban: transferForm.recipient_iban?.trim() || undefined,
      amount,
      currency: transferForm.currency,
    });
  };
  return (
    <div className="space-y-6 mb-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">Transferts internationaux (CPO 5.23)</h3>
          <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => setShowTransferForm(!showTransferForm)}>
            {showTransferForm ? 'Fermer' : 'Nouveau transfert'}
          </Button>
        </div>
        {showTransferForm && (
          <Card className="mb-4 border-gray-700 bg-gray-800 text-white">
            <CardContent className="p-4">
              <form onSubmit={handleCreateTransfer} className="space-y-3">
                <Input placeholder="Nom du bénéficiaire" value={transferForm.recipient_name} onChange={(e) => setTransferForm((p) => ({ ...p, recipient_name: e.target.value }))} className="rounded-lg bg-gray-900 border-gray-600" />
                <Input placeholder="Pays (ex. Sénégal)" value={transferForm.recipient_country} onChange={(e) => setTransferForm((p) => ({ ...p, recipient_country: e.target.value }))} className="rounded-lg bg-gray-900 border-gray-600" />
                <Input placeholder="IBAN (optionnel)" value={transferForm.recipient_iban} onChange={(e) => setTransferForm((p) => ({ ...p, recipient_iban: e.target.value }))} className="rounded-lg bg-gray-900 border-gray-600" />
                <Input type="number" placeholder="Montant" value={transferForm.amount} onChange={(e) => setTransferForm((p) => ({ ...p, amount: e.target.value }))} className="rounded-lg bg-gray-900 border-gray-600" />
                <Button type="submit" className="rounded-xl w-full" disabled={createTransferMutation.isPending}>
                  {createTransferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer la demande'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        {loadingTransfers ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div> : transfers.length === 0 ? <p className="text-gray-500 text-sm">Aucun transfert.</p> : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-800/80 border border-gray-700">
                <div>
                  <p className="text-white font-medium">{t.recipient_name} · {t.recipient_country}</p>
                  <p className="text-xs text-gray-500">{formatNumber(Number(t.amount))} {t.currency} · {t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-2">Préautorisations (CPO 5.39)</h3>
        {loadingPreauths ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div> : preauths.length === 0 ? <p className="text-gray-500 text-sm">Aucune préautorisation.</p> : (
          <div className="space-y-2">
            {preauths.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-800/80 border border-gray-700">
                <div>
                  <p className="text-white font-medium">{formatNumber(Number(p.amount))} {p.currency}</p>
                  <p className="text-xs text-gray-500">{p.status} · {p.reference || p.order_id || ''}</p>
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg text-green-400 border-green-500/50" onClick={() => capturePreauthMutation.mutate(p.id)} disabled={capturePreauthMutation.isPending}>Capturer</Button>
                    <Button size="sm" variant="outline" className="rounded-lg text-red-400 border-red-500/50" onClick={() => cancelPreauthMutation.mutate(p.id)} disabled={cancelPreauthMutation.isPending}>Annuler</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}