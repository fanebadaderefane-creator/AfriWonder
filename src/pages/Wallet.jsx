import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, CreditCard, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function WalletPage() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'orange_money',
    orange_money_phone: '',
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
      if (data.method === 'orange_money') {
        if (!data.orange_money_phone?.trim()) throw new Error('Numéro Orange Money requis');
        if (needsPin && !data.pin) throw new Error('PIN wallet requis pour ce retrait');
        return api.withdrawals.request(amount, data.orange_money_phone.trim(), pinOpt);
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
      <h1 className="text-3xl font-bold mb-8">Mon Portefeuille</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Solde disponible</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {wallet?.available_balance?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">En attente (7 jours)</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {wallet?.pending_balance?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="cursor-pointer">
          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gains totaux</p>
                  <p className="text-3xl font-bold text-green-600">
                    {wallet?.total_earnings?.toLocaleString() || 0} XOF
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-200" />
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

      {/* Withdraw Button */}
      {wallet?.available_balance > 0 && (
        <div className="mb-8">
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            size="lg"
          >
            Demander un retrait
          </Button>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <Card className="mb-8 border-orange-200 bg-orange-50">
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
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {withdrawData.method === 'orange_money' && (
              <div>
                <label className="text-sm font-semibold block mb-2">Numéro Orange Money *</label>
                <Input
                  placeholder="77 123 45 67"
                  value={withdrawData.orange_money_phone}
                  onChange={(e) => setWithdrawData({...withdrawData, orange_money_phone: e.target.value})}
                />
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
                disabled={withdrawMutation.isPending || !withdrawData.amount || (withdrawData.method === 'orange_money' && !withdrawData.orange_money_phone?.trim()) || (needsPin && !withdrawData.pin)}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
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
                  <p className="font-semibold">{payout.orange_money_phone || payout.payout_method || 'Orange Money'}</p>
                  <p className="text-sm text-gray-600">{new Date(payout.created_at || payout.requested_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{(payout.amount || 0).toLocaleString()} XOF</p>
                  <Badge className={payout.status === 'completed' || payout.status === 'approved' ? 'bg-green-100 text-green-800' : payout.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
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
                  <p className={`font-bold ${tx.type.includes('sent') || tx.type === 'payment' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.type.includes('sent') || tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString()} XOF
                  </p>
                  <Badge className={tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
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