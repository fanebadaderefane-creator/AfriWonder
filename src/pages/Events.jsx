import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Plus, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/navigation/BottomNav';

export default function EventsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data: result, isLoading } = useQuery({
    queryKey: ['events', view, search, category],
    queryFn: async () => {
      const params = { page: 1, limit: 50, status: 'published' };
      if (search) params.search = search;
      if (category) params.category = category;
      if (view === 'upcoming') params.startDate = new Date().toISOString();
      return api.events.list(params);
    },
  });

  const events = result?.events ?? [];
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_date) > now);
  const pastEvents = events.filter(e => new Date(e.start_date) <= now);
  const displayEvents = view === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Événements</h1>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => navigate(createPageUrl('CreateEvent'))}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer
          </Button>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Toutes catégories</option>
            <option value="conference">Conférence</option>
            <option value="concert">Concert</option>
            <option value="workshop">Atelier</option>
            <option value="meetup">Meetup</option>
            <option value="sport">Sport</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div className="flex gap-2">
          {['upcoming', 'past'].map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                view === tab ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab === 'upcoming' ? 'À venir' : 'Passés'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayEvents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600">
                {view === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate(createPageUrl('CreateEvent'))}
              >
                Créer un événement
              </Button>
            </CardContent>
          </Card>
        ) : (
          displayEvents.map((event, index) => {
            const capacityText = event.capacity_remaining != null
              ? `${event.capacity_remaining} places restantes`
              : `${event.tickets_sold ?? 0} inscrits`;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`${createPageUrl('EventDetails')}?id=${event.id}`)}
                className="cursor-pointer"
              >
                <Card className="h-full overflow-hidden hover:shadow-md transition-shadow">
                  {event.image && (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  {!event.image && (
                    <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-orange-400" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {event.organizer_name || 'Organisateur'}
                        </p>
                      </div>
                      {event.is_featured && (
                        <Badge className="bg-amber-100 text-amber-800 shrink-0">Vedette</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description || '—'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>
                        {new Date(event.start_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-orange-500" />
                        <span>{capacityText}</span>
                      </div>
                      {event.is_free ? (
                        <Badge variant="secondary">Gratuit</Badge>
                      ) : (
                        <span className="font-semibold text-orange-600">
                          {Number(event.price || 0).toLocaleString()} {event.currency || 'FCFA'}
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${createPageUrl('EventDetails')}?id=${event.id}`);
                      }}
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Voir & réserver
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
