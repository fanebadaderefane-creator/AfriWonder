import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Wallet, Loader2, Smartphone } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function RechargeWallet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const mockOrange = searchParams.get('mockOrange') === '1';
  const returnUrl = searchParams.get('returnUrl');
  const amountParam = searchParams.get('amount');
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [mockOrangePin, setMockOrangePin] = useState('');
  const [rechargePollBusy, setRechargePollBusy] = useState(false);
  const pollAttemptsRef = useRef(0);

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['live-wallet'],
    queryFn: () => api.live.getWallet(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Home')));
  }, [navigate]);

  useEffect(() => {
    if (amountParam && !amount) setAmount(amountParam);
  }, [amountParam, amount]);

  useEffect(() => {
    if (!transactionId || !user || mockOrange) return;

    const redirectUrl = returnUrl || sessionStorage.getItem('adCampaignRechargeReturnUrl');
    const maxAttempts = 45;
    const intervalMs = 2000;
    let cancelled = false;
    let timerId;

    const finishOk = async () => {
      const { data: w } = await refetchWallet();
      toast.success(`Recharge confirmée ! Solde : ${Number(w?.balance ?? 0).toLocaleString()} FCFA`);
      const doRedirect = () => {
        if (redirectUrl) {
          sessionStorage.removeItem('adCampaignRechargeReturnUrl');
          // replace : évite que « Retour » revienne sur RechargeWallet?transactionId=… puis relance la redirection auto
          window.location.replace(redirectUrl);
        } else {
          navigate(createPageUrl('AdvertiserDashboard'), { replace: true });
        }
      };
      setTimeout(doRedirect, 1200);
    };

    const pollOnce = async () => {
      try {
        const st = await api.live.getWalletRechargeStatus(transactionId);
        if (cancelled) return;
        if (st?.status === 'completed') {
          setRechargePollBusy(false);
          finishOk();
          return;
        }
        if (st?.status === 'failed' || st?.status === 'cancelled') {
          setRechargePollBusy(false);
          toast.error('Paiement non abouti. Réessaie ou contacte le support.');
          return;
        }
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.apiMessage ??
          (typeof e?.response?.data?.error === 'string'
            ? e.response.data.error
            : e?.response?.data?.error?.message) ??
          e?.message ??
          'Erreur';
        setRechargePollBusy(false);
        toast.error(msg);
        return;
      }

      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current >= maxAttempts) {
        setRechargePollBusy(false);
        toast.message('Paiement en cours de validation', {
          description:
            "Le crédit peut prendre quelques minutes. Rafraîchis la page ou vérifie ton solde plus tard.",
        });
        return;
      }
      timerId = window.setTimeout(pollOnce, intervalMs);
    };

    setRechargePollBusy(true);
    pollAttemptsRef.current = 0;
    pollOnce();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [transactionId, user?.id, returnUrl, navigate, refetchWallet, mockOrange]);

  const mockOrangeConfirmMutation = useMutation({
    mutationFn: () =>
      api.live.mockConfirmWalletRechargeOrange({
        transactionId,
        pin: mockOrangePin.replace(/\D/g, ''),
      }),
    onSuccess: async () => {
      const { data: w } = await refetchWallet();
      toast.success(`Recharge confirmée ! Solde : ${Number(w?.balance ?? 0).toLocaleString()} FCFA`);
      setMockOrangePin('');
      navigate(createPageUrl('RechargeWallet'), { replace: true });
    },
    onError: (e) => {
      const msg =
        e?.apiMessage ??
        (typeof e?.response?.data?.error === 'string'
          ? e.response.data.error
          : e?.response?.data?.error?.message) ??
        e?.message ??
        'Erreur';
      toast.error(msg);
    },
  });

  const rechargeMutation = useMutation({
    mutationFn: () => api.live.rechargeWallet({ amount: Number(amount) || 0, phone: (phone || '').replace(/\D/g, '') }),
    onSuccess: (res) => {
      if (res.payment_url) {
        if (res.mock) {
          toast.message('Étape suivante', {
            description: 'Entre ton code secret comme après une vraie demande Orange Money (simulation).',
          });
        }
        window.location.href = res.payment_url;
      } else {
        toast.success('Demande envoyée');
      }
    },
    onError: (e) => {
      const msg = e?.apiMessage ?? (typeof e?.response?.data?.error === 'string' ? e.response?.data?.error : e?.response?.data?.error?.message) ?? e?.message ?? 'Erreur lors de la recharge';
      toast.error(msg);
    },
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
    const phoneDigits = (phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      toast.error('Numéro Orange Money requis (ex: 77 XX XX XX XX)');
      return;
    }
    rechargeMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-10 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Recharger le portefeuille</h1>
      </div>

      <div className="p-4 space-y-4">
        {rechargePollBusy && !mockOrange && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            Vérification du paiement avec Orange…
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Solde actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {Number(wallet?.balance ?? 0).toLocaleString()} FCFA
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Utilisé pour envoyer des cadeaux pendant les lives
            </p>
          </CardContent>
        </Card>

        {mockOrange && transactionId && (
          <Card className="border-amber-200 bg-amber-50/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Code secret Orange Money (mode test)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Avec un <strong>vrai</strong> paiement Orange, une demande s’affiche sur ton téléphone (USSD) ou sur la page
                Orange : tu entres ton <strong>code secret</strong> là-bas — pas dans AfriWonder.
              </p>
              <p className="text-sm text-gray-700">
                Ici, sans compte marchand, saisis un code fictif de <strong>4 à 6 chiffres</strong> pour simuler cette
                étape.
              </p>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Ex. 1234"
                value={mockOrangePin}
                onChange={(e) => setMockOrangePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600"
                disabled={
                  mockOrangePin.length < 4 || mockOrangeConfirmMutation.isPending
                }
                onClick={() => mockOrangeConfirmMutation.mutate()}
              >
                {mockOrangeConfirmMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Valider le code (comme sur le téléphone)'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {!mockOrange && (
          <>
            <Alert className="border-blue-100 bg-blue-50/90 text-blue-900">
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Après « Payer avec Orange Money », tu seras renvoyé vers <strong>Orange</strong> (ou une demande apparaîtra
                sur ton <strong>téléphone</strong>). C’est à ce moment-là que tu dois <strong>entrer ton code secret</strong>{' '}
                pour accepter le paiement.
              </AlertDescription>
            </Alert>

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
                  placeholder="Numéro Orange Money (ex: 77 XX XX XX XX) *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  disabled={
                    !amount ||
                    Number(amount) < 100 ||
                    !phone?.replace(/\D/g, '').length ||
                    phone.replace(/\D/g, '').length < 8 ||
                    rechargeMutation.isPending
                  }
                  onClick={handleRecharge}
                >
                  {rechargeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer avec Orange Money'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
