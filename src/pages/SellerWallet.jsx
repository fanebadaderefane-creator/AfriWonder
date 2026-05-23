import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDownToLine, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function SellerWallet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'orange_money',
    recipient: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const { data: wallet } = useQuery({
    queryKey: ['seller-wallet', user?.id],
    queryFn: async () => {
      const wallets = await api.entities.SellerWallet.filter({ seller_id: user.id });
      if (wallets.length === 0) {
        const newWallet = await api.entities.SellerWallet.create({
          seller_id: user.id,
          balance: 0,
          pending_balance: 0,
          total_earned: 0,
          total_withdrawn: 0
        });
        return newWallet;
      }
      return wallets[0];
    },
    enabled: !!user?.id
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['seller-payouts', user?.id],
    queryFn: () => api.entities.Payout.filter({ seller_id: user.id }, '-created_date', 50),
    enabled: !!user?.id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['seller-transactions', user?.id],
    queryFn: () => api.payments.getTransactions({ user_id: user.id }, '-created_date', 100),
    enabled: !!user?.id
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(withdrawData.amount);
      if (amount < 1000) throw new Error('Montant minimum: 1000 FCFA');
      if (amount > wallet.balance) throw new Error('Solde insuffisant');

      await api.entities.Payout.create({
        seller_id: user.id,
        amount,
        method: withdrawData.method,
        recipient_details: withdrawData.recipient,
        status: 'pending'
      });

      await api.entities.SellerWallet.update(wallet.id, {
        balance: wallet.balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount
      });
    },
    onSuccess: () => {
      toast.success('Demande de retrait envoyée');
      setShowWithdraw(false);
      setWithdrawData({ amount: '', method: 'orange_money', recipient: '' });
      queryClient.invalidateQueries(['seller-wallet']);
      queryClient.invalidateQueries(['seller-payouts']);
    },
    onError: (error) => {
      toast.error(error._message);
    }
  });

  if (!wallet) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Wallet Vendeur</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <p className="text-white/80 mb-2">Solde disponible</p>
          <p className="text-4xl font-bold mb-4">{(wallet?.balance ?? 0).toLocaleString()} FCFA</p>
          <Button
            onClick={() => setShowWithdraw(true)}
            disabled={(wallet?.balance ?? 0) < 1000}
            className="w-full bg-white text-green-600 hover:bg-gray-100"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Retirer
          </Button>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1">En attente</p>
            <p className="font-bold">{(wallet?.pending_balance ?? 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1">Total gagné</p>
            <p className="font-bold">{(wallet?.total_earned ?? 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 text-center">
            <ArrowDownToLine className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-1">Retiré</p>
            <p className="font-bold">{(wallet?.total_withdrawn ?? 0).toLocaleString()}</p>
          </Card>
        </div>

        {/* Recent Payouts */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Historique des retraits</h3>
          {payouts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun retrait</p>
          ) : (
            <div className="space-y-3">
              {payouts.map(payout => (
                <div key={payout.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div>
                    <p className="font-semibold">{payout.amount.toLocaleString()} FCFA</p>
                    <p className="text-xs text-gray-500">
                      {payout.method} • {formatDistanceToNow(new Date(payout.created_date), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                    payout.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {payout.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Transactions */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Transactions récentes</h3>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune transaction</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map(tx => (
                <div key={tx.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{tx._description || tx.type}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(tx.created_date), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <p className={`font-semibold ${tx.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'sale' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Withdraw Sheet */}
      <Sheet open={showWithdraw} onOpenChange={setShowWithdraw}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Retirer des fonds</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Montant (min. 1000 FCFA)</label>
              <Input
                type="number"
                placeholder="10000"
                value={withdrawData.amount}
                onChange={(e) => setWithdrawData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Méthode</label>
              <Select
                value={withdrawData.method}
                onValueChange={(value) => setWithdrawData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">🟠 Orange Money</SelectItem>
                  <SelectItem value="wave">💙 Wave</SelectItem>
                  <SelectItem value="mtn_money">🟡 MTN Money</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {withdrawData.method === 'bank_transfer' ? 'IBAN' : 'Numéro'}
              </label>
              <Input
                placeholder={withdrawData.method === 'bank_transfer' ? 'SN00...' : '77 123 45 67'}
                value={withdrawData.recipient}
                onChange={(e) => setWithdrawData(prev => ({ ...prev, recipient: e.target.value }))}
              />
            </div>

            <Button
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              className="w-full py-6 bg-gradient-to-r from-green-500 to-emerald-600"
            >
              Confirmer le retrait
            </Button>

            <p className="text-xs text-center text-gray-500">
              Les retraits sont traités sous 24-48h
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}

