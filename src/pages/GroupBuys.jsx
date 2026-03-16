// CPO 9.25 — Mes groupes d'achat
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import BottomNav from '@/components/navigation/BottomNav';
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';

function formatPrice(amount, currency) {
  if (currency?.code) return `${Number(amount).toFixed(0)} ${currency.code}`;
  return `${Number(amount).toFixed(0)}`;
}

export default function GroupBuys() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { currency } = useMarketplaceCurrency();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['me-group-buys', user?.id],
    queryFn: () => api.me.getGroupBuys({ page: 1, limit: 50 }),
    enabled: !!user?.id,
  });
  const groups = groupsData?.groups ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Mes groupes d'achat</h1>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : groups.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Vous n'avez rejoint aucun groupe d'achat.</p>
            <Button className="mt-4" onClick={() => navigate(createPageUrl('Marketplace'))}>
              Voir le marketplace
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => {
              const product = g.product || g;
              const totalQty = (g.participants || []).reduce((s, p) => s + (p.quantity || 0), 0);
              const img = product.image ? getAbsoluteImageUrl(Array.isArray(product.image) ? product.image[0] : product.image) : MARKETPLACE_PLACEHOLDER_IMG;
              return (
                <li key={g.id}>
                  <Card
                    className="p-4 flex gap-3 cursor-pointer"
                    onClick={() => navigate(createPageUrl('Product') + `?id=${product.id}`)}
                  >
                    <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">{totalQty} / {g.min_quantity} participants</p>
                      <p className="text-sm font-semibold text-blue-600">{formatPrice(product.price, currency)} × {g.my_quantity || 1}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
