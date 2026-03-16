// CPO 9.22 — Co-voiturage
import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ArrowLeft, MapPin, Calendar, Loader2, Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ModuleHero from '@/components/common/ModuleHero';
import BottomNav from '@/components/navigation/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Covoiturage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showPropose, setShowPropose] = useState(false);
  const [showMyRides, setShowMyRides] = useState(false);
  const [bookRideId, setBookRideId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ride-share', origin, destination, fromDate, toDate],
    queryFn: async () => {
      const res = await api.rideShare.list({
        origin: origin || undefined,
        destination: destination || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page: 1,
        limit: 50,
      });
      return res?.rides ?? [];
    },
  });

  const rides = Array.isArray(data) ? data : [];

  const myRidesQuery = useQuery({
    queryKey: ['ride-share-me'],
    queryFn: () => api.rideShare.listMy(false).then((r) => r ?? []),
    enabled: !!user && showMyRides,
  });
  const myDriverQuery = useQuery({
    queryKey: ['ride-share-me-driver'],
    queryFn: () => api.rideShare.listMy(true).then((r) => r ?? []),
    enabled: !!user && showMyRides,
  });

  const proposeMutation = useMutation({
    mutationFn: (body) => api.rideShare.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride-share'] });
      queryClient.invalidateQueries({ queryKey: ['ride-share-me'] });
      queryClient.invalidateQueries({ queryKey: ['ride-share-me-driver'] });
      setShowPropose(false);
    },
  });

  const bookMutation = useMutation({
    mutationFn: ({ rideId, seats }) => api.rideShare.book(rideId, seats),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ride-share'] });
      queryClient.invalidateQueries({ queryKey: ['ride-share-me'] });
      setBookRideId(null);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Co-voiturage</h1>
        </div>
      </div>

      <ModuleHero
        title="Co-voiturage"
        subtitle="Proposez ou réservez un trajet"
        icon={Users}
        gradient="from-emerald-600 to-emerald-800"
      />

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Départ (ville)"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="rounded-xl"
          />
          <Input
            placeholder="Arrivée (ville)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="rounded-xl"
          />
          <Input
            type="date"
            placeholder="Du"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl"
          />
          <Input
            type="date"
            placeholder="Au"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {user && (
            <>
              <Button className="rounded-xl" onClick={() => setShowPropose(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Proposer un trajet
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowMyRides(!showMyRides)}>
                <List className="w-4 h-4 mr-2" />
                Mes trajets
              </Button>
            </>
          )}
          {!user && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate(createPageUrl('Landing'))}
            >
              Connexion pour proposer ou réserver
            </Button>
          )}
        </div>

        {/* Liste des trajets */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Users className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">Aucun trajet pour le moment</p>
            <p className="text-sm text-gray-500 mt-1">Proposez un trajet ou modifiez les filtres.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rides.map((ride) => (
              <li
                key={ride.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{ride.origin} → {ride.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(ride.departure_at)}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Conducteur : {ride.driver?.full_name ?? 'Anonyme'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{ride.seats_left ?? ride.seats_available} place(s)</span>
                      {ride.price_per_seat != null && ride.price_per_seat > 0 && (
                        <span className="text-emerald-600 font-medium">{Number(ride.price_per_seat).toFixed(0)} / place</span>
                      )}
                    </div>
                  </div>
                  {user && (ride.seats_left ?? 0) > 0 && ride.driver?.id !== user.id && (
                    <Button
                      size="sm"
                      className="rounded-xl flex-shrink-0"
                      onClick={() => setBookRideId(ride.id)}
                      disabled={bookMutation.isPending}
                    >
                      Réserver
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Mes trajets */}
        {showMyRides && user && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Mes trajets</h3>
            <div>
              <h4 className="text-sm text-gray-600 mb-2">En tant que conducteur</h4>
              {(myDriverQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun trajet proposé.</p>
              ) : (
                <ul className="space-y-2">
                  {(myDriverQuery.data ?? []).map((r) => (
                    <li key={r.id} className="text-sm">
                      {r.origin} → {r.destination} — {formatDate(r.departure_at)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm text-gray-600 mb-2">En tant que passager</h4>
              {(myRidesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucune réservation.</p>
              ) : (
                <ul className="space-y-2">
                  {(myRidesQuery.data ?? []).map((r) => (
                    <li key={r.id} className="text-sm">
                      {r.origin} → {r.destination} — {formatDate(r.departure_at)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Proposer un trajet */}
      <ProposeDialog
        open={showPropose}
        onClose={() => setShowPropose(false)}
        onSubmit={(body) => proposeMutation.mutate(body)}
        isPending={proposeMutation.isPending}
        error={proposeMutation.error}
      />

      {/* Modal Réserver */}
      <Dialog open={!!bookRideId} onOpenChange={(open) => !open && setBookRideId(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Réserver une place</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Nombre de places : 1</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookRideId(null)}>Annuler</Button>
            <Button
              onClick={() => {
                if (bookRideId) bookMutation.mutate({ rideId: bookRideId, seats: 1 });
              }}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function ProposeDialog({ open, onClose, onSubmit, isPending, error }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureAt, setDepartureAt] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const date = departureAt && departureTime
      ? new Date(`${departureAt}T${departureTime}:00`)
      : new Date(Date.now() + 86400000);
    if (!origin.trim() || !destination.trim()) return;
    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      departure_at: date.toISOString(),
      seats_available: Math.max(1, Math.min(8, parseInt(seats, 10) || 4)),
      price_per_seat: price === '' ? undefined : parseFloat(price) || 0,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposer un trajet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Départ (ville ou lieu)"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
            className="rounded-xl"
          />
          <Input
            placeholder="Arrivée (ville ou lieu)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            className="rounded-xl"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="Date"
              value={departureAt}
              onChange={(e) => setDepartureAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-xl"
            />
            <Input
              type="time"
              placeholder="Heure"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              max={8}
              placeholder="Places"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="rounded-xl"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Prix / place (optionnel)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Input
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl"
          />
          {error && (
            <p className="text-sm text-red-600">{error?.response?.data?.error?.message ?? error?.message ?? 'Erreur'}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier le trajet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
