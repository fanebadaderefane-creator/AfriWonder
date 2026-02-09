import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Search, Video, Calendar, Star,
  Heart, Stethoscope, Clock, Award, MapPin
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';

const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Aminata Diop', specialty: 'Médecin généraliste', rating: 4.9, reviews: 340, experience: 15, fee: 10000, languages: ['Français', 'Wolof', 'Anglais'], available: true, nextSlot: 'Aujourd\'hui 14h30', avatar: 'https://i.pravatar.cc/150?img=25' },
  { id: 2, name: 'Dr. Ousmane Sy', specialty: 'Pédiatre', rating: 4.8, reviews: 280, experience: 12, fee: 12000, languages: ['Français', 'Bambara'], available: true, nextSlot: 'Aujourd\'hui 16h00', avatar: 'https://i.pravatar.cc/150?img=33' },
  { id: 3, name: 'Dr. Fatou Ndiaye', specialty: 'Dermatologue', rating: 4.9, reviews: 195, experience: 10, fee: 15000, languages: ['Français', 'Anglais'], available: false, nextSlot: 'Demain 09h00', avatar: 'https://i.pravatar.cc/150?img=45' },
];

export default function Telemedicine() {
  const [searchQuery, setSearchQuery] = useState('');
  const [topDoctors, setTopDoctors] = useState(MOCK_DOCTORS);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.health.doctors.list({ limit: 10 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.doctors ?? [];
        if (list.length) setTopDoctors(list.map((d) => ({
          id: d.id,
          name: d.full_name,
          specialty: d.specialty,
          rating: d.rating ?? 5,
          reviews: d.total_consultations ?? 0,
          experience: d.years_experience ?? 0,
          fee: d.consultation_fee ?? 0,
          languages: Array.isArray(d.languages) ? d.languages : ['Français'],
          available: d.is_available !== false,
          nextSlot: d.available_hours || '—',
          avatar: d.profile_photo || 'https://i.pravatar.cc/150?img=25',
        })));
      })
      .catch(() => { if (!cancelled) setTopDoctors(MOCK_DOCTORS); })
      .finally(() => { if (!cancelled) setLoadingDoctors(false); });
    return () => { cancelled = true; };
  }, []);

  const specialties = [
    { id: 1, name: 'Généraliste', icon: Stethoscope, color: 'from-blue-500 to-cyan-500', available: 45 },
    { id: 2, name: 'Pédiatrie', icon: Heart, color: 'from-pink-500 to-rose-500', available: 23 },
    { id: 3, name: 'Dentiste', icon: Stethoscope, color: 'from-purple-500 to-indigo-500', available: 18 },
    { id: 4, name: 'Gynécologie', icon: Heart, color: 'from-red-500 to-pink-500', available: 15 },
    { id: 5, name: 'Dermatologie', icon: Stethoscope, color: 'from-green-500 to-teal-500', available: 12 },
    { id: 6, name: 'Ophtalmologie', icon: Heart, color: 'from-yellow-500 to-orange-500', available: 20 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Télémédecine</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un médecin, spécialité..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/30">
            <CardContent className="p-4 text-center">
              <Video className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Consultation vidéo</p>
              <p className="text-xs text-gray-300 mt-1">Disponible 24/7</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/30">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Mes rendez-vous</p>
              <Badge className="mt-2 bg-red-500">3 à venir</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Specialties */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Spécialités</h2>
          <div className="grid grid-cols-3 gap-3">
            {specialties.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <motion.button
                  key={specialty.id}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-xl bg-gradient-to-br ${specialty.color} text-white text-center`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-semibold mb-1">{specialty.name}</p>
                  <p className="text-[10px] opacity-80">{specialty.available} médecins</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Top Doctors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Médecins recommandés</h2>
            <Button variant="ghost" size="sm" className="text-cyan-400">
              Voir tout
            </Button>
          </div>
          <div className="space-y-3">
            {loadingDoctors && <p className="text-center text-gray-400 py-4">Chargement...</p>}
            {!loadingDoctors && topDoctors.map((doctor) => (
              <motion.div
                key={doctor.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl p-4"
              >
                <div className="flex gap-4">
                  <div className="relative">
                    <img
                      src={doctor.avatar}
                      alt={doctor.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    {doctor.available && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-bold text-white">{doctor.name}</h3>
                        <p className="text-xs text-gray-400">{doctor.specialty}</p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                        {doctor.rating}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-300 mb-2">
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {doctor.experience} ans
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {doctor.nextSlot}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doctor.languages.map((lang, idx) => (
                        <Badge key={idx} className="bg-white/10 text-white text-[10px]">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{doctor.fee.toLocaleString()} FCFA</p>
                      <Button
                        size="sm"
                        className={`${
                          doctor.available
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gray-500'
                        }`}
                        disabled={!doctor.available}
                      >
                        {doctor.available ? 'Consulter' : 'Indisponible'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pharmacies Nearby */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Pharmacies à proximité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Pharmacie du Plateau</p>
                  <p className="text-xs text-gray-400">Ouvert • 0.8 km</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  Itinéraire
                </Button>
              </div>
              <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Pharmacie de Garde</p>
                  <p className="text-xs text-gray-400">24/7 • 1.2 km</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  Itinéraire
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
