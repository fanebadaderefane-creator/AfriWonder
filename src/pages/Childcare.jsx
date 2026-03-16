// CPO 9.20 — Garde d'enfants / aide à la personne
import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Baby, Loader2, ArrowLeft, MapPin, Star, BadgeCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ModuleHero from '@/components/common/ModuleHero';
import ProviderCard from '@/components/common/ProviderCard';
import BottomNav from '@/components/navigation/BottomNav';

const CATEGORY = 'garde_enfants';

export default function Childcare() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['providers-childcare', search],
    queryFn: async () => {
      const res = await api.providers.list({
        category: CATEGORY,
        limit: 100,
        page: 1,
      });
      const list = res?.providers ?? res?.data?.providers ?? [];
      return Array.isArray(list) ? list : [];
    },
  });

  const providers = Array.isArray(data) ? data : [];
  const filtered = providers.filter((p) => {
    const name = (p.user?.full_name || p.user?.username || p.bio || '').toLowerCase();
    return !search.trim() || name.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Garde d'enfants & aide à la personne</h1>
        </div>
      </div>

      <ModuleHero
        title="Garde d'enfants & aide à la personne"
        subtitle="Trouvez un prestataire de confiance pour la garde d'enfants ou l'aide à domicile"
        icon={Baby}
        gradient="from-amber-500 to-orange-600"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un prestataire..."
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Baby className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Aucun prestataire pour le moment</p>
            <p className="text-sm text-gray-500 mt-1">Les professionnels de la garde d'enfants et de l'aide à la personne apparaîtront ici.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => navigate(createPageUrl('Providers'))}
            >
              Voir tous les prestataires
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                categoryName="Garde d'enfants / Aide à la personne"
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
