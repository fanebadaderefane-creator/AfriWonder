/**
 * CPO 10.21 — Mes points fidélité (par vendeur)
 */
import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAbsoluteImageUrl } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';

export default function LoyaltyPoints() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, [navigate]);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['loyalty-me', user?.id],
    queryFn: () => api.loyalty.getMe(),
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Points fidélité</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <Card className="p-8 text-center">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Aucun point fidélité</p>
            <p className="text-sm text-gray-500 mb-4">Achetez chez des vendeurs avec programme fidélité pour accumuler des points.</p>
            <Button variant="outline" onClick={() => navigate(createPageUrl('Marketplace'))}>
              Voir le marketplace
            </Button>
          </Card>
        ) : (
          list.map((entry) => {
            const seller = entry.program?.seller;
            const program = entry.program;
            return (
              <Card key={entry.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                    {seller?.profile_image && (
                      <img src={getAbsoluteImageUrl(seller.profile_image)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{seller?.full_name || seller?.username || 'Vendeur'}</p>
                    <p className="text-2xl font-bold text-amber-600">{entry.points_balance} pts</p>
                    {program && (
                      <p className="text-xs text-gray-500">
                        Récompense à {program.reward_threshold} pts ({program.reward_value}% de réduction)
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`${createPageUrl('SellerProfile')}?id=${entry.seller_id}`)}>
                    Boutique
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
