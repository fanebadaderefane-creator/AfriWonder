import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '../components/navigation/BottomNav';

export default function CivicCreatorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => { api.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['civic-creator-dashboard', user?.id],
    queryFn: () => api.civic.getCreatorDashboard(),
    enabled: !!user
  });

  const items = Array.isArray(dashboard) ? dashboard : (dashboard ? [dashboard] : []);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center p-4"><p className="text-gray-500">Connectez-vous pour accéder au dashboard.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Dashboard créateur</h1>
        <Link to={createPageUrl('CreatePetition')} className="ml-auto"><Button size="sm" className="bg-orange-500">Nouvelle pétition</Button></Link>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <Target className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p>Vous n'avez pas encore créé de pétition.</p>
          <Link to={createPageUrl('CreatePetition')}><Button className="mt-4 bg-orange-500">Créer une pétition</Button></Link>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {items.map((p) => (
            <div key={p.petitionId} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg line-clamp-1">{p.title}</h2>
                <Link to={`${createPageUrl('PetitionDetails')}?id=${p.petitionId}`}><Button size="sm" variant="outline">Voir</Button></Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><p className="text-xl font-bold text-blue-600">{p.current_signatures ?? 0}</p><p className="text-xs text-gray-600">signatures</p></div>
                <div className="p-2 bg-green-50 rounded-lg"><p className="text-xl font-bold text-green-600">{p.signaturesLast24h ?? 0}</p><p className="text-xs text-gray-600">24h</p></div>
                <div className="p-2 bg-purple-50 rounded-lg"><p className="text-xl font-bold text-purple-600">{p.shares_count ?? 0}</p><p className="text-xs text-gray-600">partages</p></div>
                <div className="p-2 bg-orange-50 rounded-lg"><p className="text-xl font-bold text-orange-600">{p.conversionRate ?? 0}%</p><p className="text-xs text-gray-600">objectif</p></div>
              </div>
              {p.topCities?.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2"><MapPin className="w-3 h-3 inline" /> Villes</p>
                  <div className="flex flex-wrap gap-2">{p.topCities.slice(0, 5).map((c, i) => <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{c.name} ({c.count})</span>)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
