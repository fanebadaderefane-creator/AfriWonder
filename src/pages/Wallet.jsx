import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, CreditCard, Clock, CheckCircle2, Loader2, Plus, ArrowLeft, Coins, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const COIN_PACKAGES = [
  { coins: 100, label: 'Starter', priceFcfa: 500, popular: false },
  { coins: 500, label: 'Basique', priceFcfa: 2000, popular: false },
  { coins: 1500, label: 'Standard', priceFcfa: 5000, popular: true },
  { coins: 5000, label: 'Premium', priceFcfa: 15000, popular: false },
  { coins: 15000, label: 'Mega', priceFcfa: 40000, popular: false },
  { coins: 50000, label: 'Légende', priceFcfa: 100000, popular: false },
];

export default function WalletPage() {
  const navigate = useNavigate();
  const [walletTab, setWalletTab] = useState('coins'); // 'coins' | 'history'
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
    queryKey: ['walletSecurity'],
    queryFn: () => api.payments.getWalletSecurity()
  });
  const needsPin = walletSecurity?.has_pin && walletSecurity?.two_fa_required_for_withdrawal;

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      return await api.payments.getWallet();
    }
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const result = await api.payments.getTransactions({ page: 1, limit: 20 });
      return result.transactions || [];
    }
  });

  const { data: payoutsData } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => api.withdrawals.list({ page: 1, limit: 20 })
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
      queryClient.invalidateQueries({ queryKey: ['wallet', 'withdrawals'] });
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
            {wallet?.available_balance?.toLocaleString() ?? 0} <span className="text-lg font-normal text-blue-200">FCFA</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Total dépensé</p>
              <p className="text-lg font-semibold text-white">{totalSpent.toLocaleString()} FCFA</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Total gagné</p>
              <p className="text-lg font-semibold text-white">{(wallet?.total_earnings ?? totalEarned ?? 0).toLocaleString()} FCFA</p>
            </div>
          </div>
        </div>

        {/* Onglets Acheter des Coins | Historique */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setWalletTab('coins')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'coins' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <Coins className="w-4 h-4" />
            Acheter des Coins
          </button>
          <button
            onClick={() => setWalletTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${walletTab === 'history' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <History className="w-4 h-4" />
            Historique
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
                  <p className="text-xl font-bold text-white text-center">{pkg.coins.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 text-center mb-1">{pkg.label}</p>
                  <p className="text-sm text-blue-300 text-center font-medium">{pkg.priceFcfa.toLocaleString()} FCFA</p>
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
                  {(tx.type === 'deposit' || tx.type === 'earning') ? '+' : '-'}{(tx.amount || 0).toLocaleString()} FCFA
                </p>
              </div>
            ))}
          </div>
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
                Max: {wallet?.available_balance?.toLocaleString()} XOF
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