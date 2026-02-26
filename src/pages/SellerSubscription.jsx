import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Loader2, Zap, Store, Wallet, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { SELLER_TIERS, getTierBySellerProfile } from '@/lib/sellerTiers';

export default function SellerSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedTierForPayment, setSelectedTierForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [orangeMoneyPhone, setOrangeMoneyPhone] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile', user?.id],
    queryFn: () => api.sellerProfile.getMe(),
    enabled: !!user?.id,
  });

  const currentTier = getTierBySellerProfile(profile);
  const currentTierId = profile?.subscription_tier || 'free';

  const chooseTierMutation = useMutation({
    mutationFn: async ({ tierId, method, phone }) => {
      if (tierId === 'free') {
        return api.sellerProfile.update({ subscription_tier: 'free' });
      }
      return api.sellerSubscription.subscribe(tierId, {
        payment_method: method || 'wallet',
        orange_money_phone: method === 'orange_money' ? phone : undefined,
      });
    },
    onSuccess: (data, { tierId }) => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-subscription-active'] });
      setSelectedTierForPayment(null);
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      toast.success(tierId === 'free' ? 'Retour au gratuit' : `Formule ${tierId} activée pour 1 mois`);
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Vous devez créer un compte vendeur d'abord.</p>
        <Button onClick={() => navigate(createPageUrl('BecomeSeller'))}>Devenir vendeur</Button>
      </div>
    );
  }

  const tiers = Object.values(SELLER_TIERS);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Formules vendeurs (CDC)</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-orange-800">
              Votre formule actuelle : <Badge className="ml-1">{currentTier.label}</Badge>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {currentTier.maxProducts === -1 ? 'Produits illimités' : `${currentTier.maxProducts} produits max`} · Phase 1 : abonnements uniquement
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {tiers.map((tier) => {
            const isCurrent = tier.id === currentTierId;
            const isFree = tier.id === 'free';
            return (
              <Card key={tier.id} className={isCurrent ? 'border-blue-500 border-2' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {tier.id === 'enterprise' ? <Zap className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                      {tier.label}
                    </CardTitle>
                    {isCurrent && <Badge className="bg-blue-500">Actuel</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-orange-500">
                      {tier.priceFcfa === 0 ? 'Gratuit' : `${tier.priceFcfa.toLocaleString('fr-FR')} FCFA/mois`}
                    </span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {tier.maxProducts === -1 ? 'Produits illimités' : `${tier.maxProducts} produits max`}</li>
                    <li>• Commission {tier.commissionPercent}%</li>
                    {tier.features.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <div className="space-y-2">
                      {!isFree && selectedTierForPayment === tier.id ? (
                        <>
                          <p className="text-xs font-medium text-gray-600">Mode de paiement</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant={paymentMethod === 'wallet' ? 'default' : 'outline'} className={paymentMethod === 'wallet' ? 'bg-blue-500' : ''} onClick={() => setPaymentMethod('wallet')}>
                              <Wallet className="w-4 h-4 mr-1" /> Wallet
                            </Button>
                            <Button size="sm" variant={paymentMethod === 'orange_money' ? 'default' : 'outline'} className={paymentMethod === 'orange_money' ? 'bg-blue-500' : ''} onClick={() => setPaymentMethod('orange_money')}>
                              <Smartphone className="w-4 h-4 mr-1" /> Orange Money
                            </Button>
                          </div>
                          {paymentMethod === 'orange_money' && (
                            <Input
                              placeholder="Numéro Orange Money (ex: 70123456)"
                              value={orangeMoneyPhone}
                              onChange={(e) => setOrangeMoneyPhone(e.target.value)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex gap-2">
                            <Button
                              className="bg-blue-500 hover:bg-blue-600"
                              onClick={() => chooseTierMutation.mutate({
                                tierId: tier.id,
                                method: paymentMethod,
                                phone: orangeMoneyPhone,
                              })}
                              disabled={chooseTierMutation.isPending || (paymentMethod === 'orange_money' && orangeMoneyPhone.trim().length < 8)}
                            >
                              {chooseTierMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Payer {tier.priceFcfa.toLocaleString('fr-FR')} FCFA</>}
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedTierForPayment(null)}>Annuler</Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          variant={isFree ? 'outline' : 'default'}
                          className={!isFree ? 'bg-blue-500 hover:bg-blue-600' : ''}
                          onClick={() => isFree ? chooseTierMutation.mutate({ tierId: tier.id }) : setSelectedTierForPayment(tier.id)}
                          disabled={chooseTierMutation.isPending}
                        >
                          {chooseTierMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              {isFree ? 'Passer au gratuit' : `S'abonner (${tier.priceFcfa.toLocaleString('fr-FR')} FCFA/mois)`}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Phase 1 : Abonnements uniquement (0% commission). Gratuit : 10 produits · Starter : 10k/mois, 100 produits · Business : 30k/mois, illimité · Enterprise : 50k/mois, illimité
        </p>
      </div>
    </div>
  );
}
