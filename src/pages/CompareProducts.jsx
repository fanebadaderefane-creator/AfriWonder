/**
 * CPO 6.18 — Comparateur de prix
 * URL : ?ids=id1,id2,id3 (max 10)
 */
import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Scale, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';
import BottomNav from '@/components/navigation/BottomNav';

const STORAGE_KEY = 'afriwonder_compare_ids';

export function getCompareIds() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function addToCompare(productId) {
  const ids = getCompareIds();
  if (ids.includes(productId)) return ids;
  const next = [...ids, productId].slice(-10);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeFromCompare(productId) {
  const ids = getCompareIds().filter((id) => id !== productId);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  return ids;
}

export default function CompareProducts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatPrice } = useMarketplaceCurrency();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const fromUrl = searchParams.get('ids');
    const list = fromUrl ? fromUrl.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10) : getCompareIds();
    setIds(list);
    if (list.length > 0 && !fromUrl) {
      setSearchParams({ ids: list.join(',') }, { replace: true });
    }
  }, [searchParams.get('ids')]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-compare', ids.join(',')],
    queryFn: () => api.products.compare(ids),
    enabled: ids.length > 0,
  });

  const handleRemove = (productId) => {
    const next = removeFromCompare(productId);
    setIds(next);
    setSearchParams(next.length ? { ids: next.join(',') } : {}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            Comparer les prix
          </h1>
        </div>
      </div>

      <div className="p-4">
        {ids.length === 0 ? (
          <Card className="p-8 text-center">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Aucun produit à comparer</p>
            <p className="text-sm text-gray-500 mb-4">Sur une fiche produit, utilisez « Ajouter au comparateur » puis revenez ici.</p>
            <Button onClick={() => navigate(createPageUrl('Marketplace'))}>Voir le marketplace</Button>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">Produits introuvables ou inactifs.</p>
            <Button variant="outline" className="mt-3" onClick={() => { setIds([]); setSearchParams({}); }}>Réinitialiser</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[500px] border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left p-3 text-xs font-medium text-gray-500 w-24">Image</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Produit</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Prix</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Vendeur</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500 w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="p-3">
                        <img
                          src={getAbsoluteImageUrl(p.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                          alt={p.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                        />
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => navigate(createPageUrl('Product') + `?id=${p.id}`)}
                          className="font-medium text-blue-600 hover:underline text-left"
                        >
                          {p.name}
                        </button>
                        {p.category && <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>}
                      </td>
                      <td className="p-3 font-semibold text-blue-600">{formatPrice(p.price)}</td>
                      <td className="p-3 text-sm text-gray-600">{p.seller?.username || p.seller_id || '—'}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(p.id)} aria-label="Retirer">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">Cliquez sur un produit pour voir la fiche. Vous pouvez ajouter jusqu’à 10 produits depuis les fiches produit.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
