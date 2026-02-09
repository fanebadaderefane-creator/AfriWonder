import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Search, Ticket, Music, Film,
  Bus, Trophy, Theater, Calendar, MapPin
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_MY_TICKETS = [
  { id: 1, event: 'Festival Jazz', date: '25 Fév 2027', qr: '***QR***', status: 'valid' },
  { id: 2, event: 'Dakar-Thiès Bus', date: '28 Fév 2027', qr: '***QR***', status: 'valid' },
];

export default function Ticketing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [myTickets, setMyTickets] = useState(MOCK_MY_TICKETS);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.tickets.getMyTickets()
      .then((list) => {
        if (cancelled) return;
        if (Array.isArray(list) && list.length) setMyTickets(list.map((t) => ({
          id: t.id,
          event: t.event_name || 'Événement',
          date: t.event_date ? new Date(t.event_date).toLocaleDateString('fr-FR') : '—',
          qr: t.qr_code || '***QR***',
          status: t.status === 'used' ? 'used' : 'valid',
        })));
      })
      .catch(() => { if (!cancelled) setMyTickets(MOCK_MY_TICKETS); })
      .finally(() => { if (!cancelled) setLoadingTickets(false); });
    return () => { cancelled = true; };
  }, []);

  const categories = [
    { id: 'concert', name: 'Concerts', icon: Music, color: 'from-purple-500 to-pink-500', count: 45 },
    { id: 'cinema', name: 'Cinéma', icon: Film, color: 'from-red-500 to-orange-500', count: 23 },
    { id: 'transport', name: 'Transport', icon: Bus, color: 'from-blue-500 to-cyan-500', count: 100 },
    { id: 'sports', name: 'Sports', icon: Trophy, color: 'from-green-500 to-teal-500', count: 18 },
    { id: 'theater', name: 'Théâtre', icon: Theater, color: 'from-indigo-500 to-purple-500', count: 12 },
  ];

  const events = [
    {
      id: 1,
      title: 'Concert Youssou N\'Dour',
      type: 'Concert',
      date: '15 Mars 2027',
      time: '20h00',
      venue: 'Grand Théâtre, Dakar',
      price: 15000,
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400',
      soldOut: false,
      trending: true
    },
    {
      id: 2,
      title: 'Match Sénégal vs Nigeria',
      type: 'Sports',
      date: '20 Mars 2027',
      time: '18h00',
      venue: 'Stade Abdoulaye Wade',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400',
      soldOut: false,
      trending: true
    },
    {
      id: 3,
      title: 'Avengers: Secret Wars',
      type: 'Cinéma',
      date: 'Tous les jours',
      time: '14h, 17h, 20h',
      venue: 'Canal Olympia',
      price: 3500,
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
      soldOut: false,
      trending: false
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Billetterie</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Ticket className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher événements, films..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* My Tickets */}
        {(loadingTickets || myTickets.length > 0) && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Mes billets</h2>
            {loadingTickets && <p className="text-gray-400 py-2">Chargement...</p>}
            {!loadingTickets && <div className="flex gap-3 overflow-x-auto pb-2">
              {myTickets.map((ticket) => (
                <Link key={ticket.id} to={`${createPageUrl('TicketDetails')}?id=${ticket.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="min-w-[200px] p-4 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl"
                  >
                    <div className="text-center mb-3">
                      <p className="text-white font-bold mb-1">{ticket.event}</p>
                      <p className="text-xs text-white/80">{ticket.date}</p>
                    </div>
                    <div className="w-full h-20 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs">
                      {ticket.qr}
                    </div>
                    <Badge className="w-full mt-2 bg-green-500 justify-center">
                      Valide
                    </Badge>
                  </motion.div>
                </Link>
              ))}
            </div>}
          </div>
        )}

        {/* Categories */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Catégories</h2>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-xl bg-gradient-to-br ${category.color} text-white text-center`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-semibold mb-1">{category.name}</p>
                  <Badge className="bg-white/20 text-[10px]">{category.count}</Badge>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Featured Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Événements à venir</h2>
            <Button variant="ghost" size="sm" className="text-purple-400">
              Voir tout
            </Button>
          </div>
          <div className="space-y-4">
            {events.map((event) => (
              <Link key={event.id} to={createPageUrl('TicketDetails')}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-40 object-cover"
                    />
                    {event.trending && (
                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500">
                        🔥 Tendance
                      </Badge>
                    )}
                    {event.soldOut && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge className="bg-red-500 text-lg px-6 py-2">COMPLET</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                        {event.type}
                      </Badge>
                      <p className="text-xl font-bold text-white">
                        {event.price.toLocaleString()} <span className="text-sm">FCFA</span>
                      </p>
                    </div>
                    <h3 className="font-bold text-white mb-2">{event.title}</h3>
                    <div className="space-y-1 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {event.date} • {event.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.venue}
                      </div>
                    </div>
                    <Button className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500" disabled={event.soldOut}>
                      {event.soldOut ? 'Complet' : 'Réserver'}
                    </Button>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        <CommissionNotice vertical="ticketing" compact className="text-white/70" />
      </div>

      <BottomNav />
    </div>
  );
}
