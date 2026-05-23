import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plane, Hotel, MapPin, Calendar, Search } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';

export default function Voyage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('hotels');
  const [city, setCity] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const { data: hotelsData, isLoading: loadingHotels } = useQuery({
    queryKey: ['travel', 'hotels', city],
    queryFn: () => api.travel.listHotels({ city: city || undefined, limit: 20 }),
    enabled: tab === 'hotels',
  });
  const { data: flightsData, isLoading: loadingFlights } = useQuery({
    queryKey: ['travel', 'flights', origin, destination],
    queryFn: () => api.travel.listFlights({ origin: origin || undefined, destination: destination || undefined, limit: 20 }),
    enabled: tab === 'flights',
  });
  const { data: bookingsData } = useQuery({
    queryKey: ['travel', 'bookings'],
    queryFn: () => api.travel.getMyBookings({ limit: 20 }),
  });

  const hotels = hotelsData?.items ?? [];
  const flights = flightsData?.items ?? [];
  const bookings = bookingsData?.items ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-slate-950/95 border-b border-white/10 flex items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-primary">Voyage</h1>
      </header>
      <div className="p-3 space-y-4">
        <div className="flex gap-2 p-1 bg-black/30 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('hotels')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'hotels' ? 'bg-primary text-white' : 'text-white/60'}`}
          >
            Hôtels
          </button>
          <button
            type="button"
            onClick={() => setTab('flights')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'flights' ? 'bg-primary text-white' : 'text-white/60'}`}
          >
            Vols
          </button>
          <button
            type="button"
            onClick={() => setTab('bookings')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'bookings' ? 'bg-primary text-white' : 'text-white/60'}`}
          >
            Mes résas
          </button>
        </div>

        {tab === 'hotels' && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
              <Button size="sm" className="rounded-xl bg-primary">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {loadingHotels ? (
              <p className="text-white/60 text-sm">Chargement...</p>
            ) : (
              <div className="space-y-3">
                {hotels.length === 0 && <p className="text-white/60 text-sm">Aucun hôtel. Ajoutez-en via l’admin.</p>}
                {hotels.map((h) => (
                  <Card key={h.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{h.name}</h3>
                          <p className="text-white/60 text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {h.city}, {h.country}
                          </p>
                          <p className="text-primary text-sm mt-1">{h.price_per_night_cents / 100} {h.currency}/nuit</p>
                        </div>
                        <Hotel className="w-8 h-8 text-primary/60" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'flights' && (
          <>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Origine"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50"
              />
            </div>
            {loadingFlights ? (
              <p className="text-white/60 text-sm">Chargement...</p>
            ) : (
              <div className="space-y-3">
                {flights.length === 0 && <p className="text-white/60 text-sm">Aucun vol. Ajoutez-en via l’admin.</p>}
                {flights.map((f) => (
                  <Card key={f.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{f.origin} → {f.destination}</p>
                          <p className="text-white/60 text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(f.departure_at).toLocaleString()}
                          </p>
                          <p className="text-primary text-sm mt-1">{f.price_cents / 100} {f.currency}</p>
                        </div>
                        <Plane className="w-8 h-8 text-primary/60" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'bookings' && (
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-white/60 text-sm">Aucune réservation.</p>}
            {bookings.map((b) => (
              <Card key={b.id} className="bg-white/5 border-white/10">
                <CardContent className="p-3">
                  <p className="text-white font-medium capitalize">{b.type}</p>
                  <p className="text-white/60 text-sm">{b.status} · {b.total_cents / 100} {b.currency}</p>
                  {b.hotel && <p className="text-sm mt-1">{b.hotel.name}, {b.hotel.city}</p>}
                  {b.flight && <p className="text-sm mt-1">{b.flight.origin} → {b.flight.destination}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
