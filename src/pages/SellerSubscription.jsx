import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Loader2, Zap, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { SELLER_TIERS, getTierBySellerProfile } from '@/lib/sellerTiers';

export default function SellerSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

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

  const updateTierMutation = useMutation({
    mutationFn: (tierId) => api.sellerProfile.update({ subscription_tier: tierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-profile', user?.id] });
      toast.success('Formule mise à jour');
    },
    onError: (e) => toast.error(e?.response?.data?.error || e?.message || 'Erreur'),
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
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-orange-800">
              Votre formule actuelle : <Badge className="ml-1">{currentTier.label}</Badge>
            </p>
            <p className="text-xs text-orange-700 mt-1">
              {currentTier.maxProducts === -1 ? 'Produits illimités' : `${currentTier.maxProducts} produits max`} · Commission {currentTier.commissionPercent}%
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {tiers.map((tier) => {
            const isCurrent = tier.id === currentTierId;
            const isFree = tier.id === 'free';
            return (
              <Card key={tier.id} className={isCurrent ? 'border-orange-500 border-2' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {tier.id === 'enterprise' ? <Zap className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                      {tier.label}
                    </CardTitle>
                    {isCurrent && <Badge className="bg-orange-500">Actuel</Badge>}
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
                    <Button
                      variant={isFree ? 'outline' : 'default'}
                      className={!isFree ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => updateTierMutation.mutate(tier.id)}
                      disabled={updateTierMutation.isPending}
                    >
                      {updateTierMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Choisir cette formule
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 text-center">
          CDC Marketplace Mali · Gratuit : 10 produits, 10% · Starter : 10k/mois, 100 produits, 7% · Business : 30k/mois, illimité, 5% · Enterprise : 50k/mois, 3%
        </p>
      </div>
    </div>
  );
}
