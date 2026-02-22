import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, CreditCard, Clock, CheckCircle2, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WalletPage() {
  const navigate = useNavigate();
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 safe-area-pb"
    >
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-blue-900">Mon Portefeuille</h1>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Solde disponible</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {wallet?.available_balance?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-blue-400">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">En attente (7 jours)</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {wallet?.pending_balance?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <Clock className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gains totaux</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {wallet?.total_earnings?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total retraits</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {wallet?.total_payouts?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4">
        <Button
          onClick={() => navigate(createPageUrl('RechargeWallet'))}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Recharger
        </Button>
        {wallet?.available_balance > 0 && (
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            Demander un retrait
          </Button>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
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

      {/* Payouts History */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Historique des retraits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {!payouts?.length && <p className="text-sm text-gray-500">Aucun retrait</p>}
            {payouts?.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">{payout.payment_method === 'paypal' ? payout.paypal_email : (payout.orange_money_phone || payout.payout_method || 'Mobile Money')}</p>
                  <p className="text-sm text-gray-600">{new Date(payout.created_at || payout.requested_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{(payout.amount || 0).toLocaleString()} XOF</p>
                  <Badge className={payout.status === 'completed' || payout.status === 'approved' ? 'bg-blue-100 text-blue-800' : payout.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                    {payout.status === 'pending' ? 'En attente' : payout.status === 'approved' ? 'Effectué' : payout.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold capitalize">{tx.type}</p>
                  <p className="text-sm text-gray-600">{new Date(tx.created_at || tx.created_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type.includes('sent') || tx.type === 'payment' ? 'text-red-600' : 'text-blue-600'}`}>
                    {tx.type.includes('sent') || tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString()} XOF
                  </p>
                  <Badge className={tx.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}