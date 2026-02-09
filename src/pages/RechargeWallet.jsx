import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wallet, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function RechargeWallet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['live-wallet'],
    queryFn: () => api.live.getWallet(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Home')));
  }, [navigate]);

  useEffect(() => {
    if (transactionId && user) {
      api.live.confirmWalletRecharge(transactionId)
        .then((res) => {
          toast.success(`Recharge confirmée ! Solde : ${res.new_balance?.toLocaleString()} FCFA`);
          refetchWallet();
        })
        .catch((e) => toast.error(e.response?.data?.error || e.message || 'Erreur'));
    }
  }, [transactionId, user, refetchWallet]);

  const rechargeMutation = useMutation({
    mutationFn: () => api.live.rechargeWallet({ amount: Number(amount) || 0, phone: phone || undefined }),
    onSuccess: (res) => {
      if (res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        toast.success('Demande envoyée');
      }
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const handleRecharge = () => {
    const num = Number(amount);
    if (num < 100) {
      toast.error('Minimum 100 FCFA');
      return;
    }
    if (num > 1000000) {
      toast.error('Maximum 1 000 000 FCFA');
      return;
    }
    rechargeMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-10 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Recharger le portefeuille</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Solde actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {Number(wallet?.balance ?? 0).toLocaleString()} FCFA
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Utilisé pour envoyer des cadeaux pendant les lives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Montant de recharge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((a) => (
                <Button
                  key={a}
                  variant={Number(amount) === a ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(String(a))}
                >
                  {a.toLocaleString()}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Autre montant (FCFA)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={100}
              max={1000000}
            />
            <Input
              type="tel"
              placeholder="Numéro Orange Money (optionnel)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!amount || Number(amount) < 100 || rechargeMutation.isPending}
              onClick={handleRecharge}
            >
              {rechargeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer avec Orange Money'}
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
