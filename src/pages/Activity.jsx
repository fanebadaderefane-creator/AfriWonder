// Historique d'activité (CPO 1.15) — connexions, publications, achats, notifications
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, LogIn, FileText, ShoppingBag, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '@/components/navigation/BottomNav';

const TYPE_LABELS = {
  notification: { label: 'Notification', icon: Bell, color: 'text-blue-600 bg-blue-50' },
  connection: { label: 'Connexion', icon: LogIn, color: 'text-green-600 bg-green-50' },
  publication: { label: 'Publication', icon: FileText, color: 'text-purple-600 bg-purple-50' },
  purchase: { label: 'Achat', icon: ShoppingBag, color: 'text-amber-600 bg-amber-50' },
};

export default function Activity() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['me-activity', user?.id],
    queryFn: () => api.me.getActivity(80),
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Historique d'activité</h1>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">Aucune activité récente.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const config = TYPE_LABELS[item.type] || TYPE_LABELS.notification;
              const Icon = config.icon;
              return (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{config.label}</p>
                    {item.title && <p className="font-semibold text-gray-900 truncate">{item.title}</p>}
                    {item.description && (
                      <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
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
