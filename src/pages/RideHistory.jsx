import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, Car, Loader2 } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';
import { toast } from 'sonner';

const statusLabel = {
  requested: 'En attente',
  accepted: 'Acceptée',
  driver_arriving: 'Conducteur en route',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export default function RideHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const as = searchParams.get('as') || 'passenger';
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.transport.rides.list({ as, page, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setRides(res?.rides ?? []);
        setTotalPages(res?.pagination?.totalPages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.apiMessage || 'Impossible de charger l\'historique');
          setRides([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [as, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Transport')}>
            <Button variant="ghost" size="icon" className="text-white" aria-label="Retour"><ArrowLeft className="w-5 h-5" aria-hidden="true" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Historique des courses</h1>
          <div className="w-10" />
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <Button
            variant={as === 'passenger' ? 'default' : 'outline'}
            size="sm"
            className={as === 'passenger' ? 'bg-purple-500' : 'border-white/30 text-white'}
            onClick={() => { setPage(1); setSearchParams({ as: 'passenger' }); }}
          >
            Passager
          </Button>
          <Button
            variant={as === 'driver' ? 'default' : 'outline'}
            size="sm"
            className={as === 'driver' ? 'bg-purple-500' : 'border-white/30 text-white'}
            onClick={() => { setPage(1); setSearchParams({ as: 'driver' }); }}
          >
            Conducteur
          </Button>
        </div>
      </div>
      <div className="p-4 pb-24 space-y-4">
        {loading && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
        )}
        {!loading && rides.length === 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-8 text-center text-gray-400">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune course pour le moment.</p>
              <Link to={createPageUrl('Transport')}><Button className="mt-4 bg-purple-500">Demander une course</Button></Link>
            </CardContent>
          </Card>
        )}
        {!loading && rides.map((ride) => (
          <Card key={ride.id} className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className={
                  ride.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                  ride.status === 'cancelled' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                }>
                  {statusLabel[ride.status] || ride.status}
                </Badge>
                <span className="text-xs text-gray-400">
                  {ride.created_at ? new Date(ride.created_at).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-300 mb-1">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{ride.pickup_location}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-300 mb-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{ride.dropoff_location}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ride.vehicle_type}</span>
                {ride.price != null && <span className="font-semibold text-white">{Number(ride.price).toLocaleString()} {ride.currency || 'XOF'}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-white/30 text-white">Préc.</Button>
            <span className="text-gray-400 self-center px-2">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-white/30 text-white">Suiv.</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
