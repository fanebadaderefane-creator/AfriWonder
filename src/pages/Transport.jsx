import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Bike, Car, Truck, MapPin, Clock,
  DollarSign, Star, Users, Navigation
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_DRIVERS = [
  { id: '1', name: 'Mamadou Diallo', vehicle: 'Yamaha NMAX', rating: 4.8, trips: 1250, distance: '0.5 km', avatar: 'https://i.pravatar.cc/150?img=12' },
  { id: '2', name: 'Fatou Sall', vehicle: 'Toyota Corolla', rating: 4.9, trips: 890, distance: '0.8 km', avatar: 'https://i.pravatar.cc/150?img=45' },
  { id: '3', name: 'Ousmane Ba', vehicle: 'Honda Beat', rating: 4.7, trips: 2100, distance: '1.2 km', avatar: 'https://i.pravatar.cc/150?img=33' },
];

export default function Transport() {
  const [selectedVehicle, setSelectedVehicle] = useState('moto');
  const [nearbyDrivers, setNearbyDrivers] = useState(MOCK_DRIVERS);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.transport.drivers.listNearby({ vehicle_type: selectedVehicle, limit: 10 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.drivers ?? [];
        if (list.length) setNearbyDrivers(list.map((d) => ({
          id: d.id,
          name: d.full_name,
          vehicle: [d.vehicle_brand, d.vehicle_model].filter(Boolean).join(' ') || 'Véhicule',
          rating: d.rating ?? 5,
          trips: d.total_rides ?? 0,
          distance: '—',
          avatar: d.avatar || 'https://i.pravatar.cc/150?img=12',
        })));
      })
      .catch(() => { if (!cancelled) setNearbyDrivers(MOCK_DRIVERS); })
      .finally(() => { if (!cancelled) setLoadingDrivers(false); });
    return () => { cancelled = true; };
  }, [selectedVehicle]);

  const vehicleTypes = [
    { id: 'moto', name: 'Moto-taxi', icon: Bike, price: '500-2000 FCFA', time: '5-15 min', color: 'from-orange-500 to-red-500' },
    { id: 'car', name: 'Voiture', icon: Car, price: '2000-5000 FCFA', time: '10-20 min', color: 'from-blue-500 to-purple-500' },
    { id: 'tricycle', name: 'Tricycle', icon: Bike, price: '300-1500 FCFA', time: '10-25 min', color: 'from-green-500 to-teal-500' },
    { id: 'van', name: 'Van/Bus', icon: Truck, price: '3000-8000 FCFA', time: '15-30 min', color: 'from-pink-500 to-rose-500' },
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
          <h1 className="text-xl font-bold text-white">Transport</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Navigation className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">Conducteurs</p>
              <p className="text-lg font-bold text-white">2,500+</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">Temps moyen</p>
              <p className="text-lg font-bold text-white">12 min</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-3 text-center">
              <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">Note moyenne</p>
              <p className="text-lg font-bold text-white">4.8</p>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Type Selection */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Choisissez votre véhicule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleTypes.map((vehicle) => {
              const Icon = vehicle.icon;
              return (
                <motion.button
                  key={vehicle.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                    selectedVehicle === vehicle.id
                      ? `bg-gradient-to-r ${vehicle.color} shadow-lg`
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedVehicle === vehicle.id ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{vehicle.name}</p>
                      <p className="text-xs text-gray-300">{vehicle.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{vehicle.price}</p>
                  </div>
                </motion.button>
              );
            })}
          </CardContent>
        </Card>

        {/* Location Input */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <input
                type="text"
                placeholder="Point de départ"
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              />
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <input
                type="text"
                placeholder="Destination"
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              />
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
              Trouver un conducteur
            </Button>
          </CardContent>
        </Card>

        {/* Nearby Drivers */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Conducteurs à proximité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDrivers && <p className="text-center text-gray-400 py-4">Chargement...</p>}
            {!loadingDrivers && nearbyDrivers.map((driver) => (
              <motion.div
                key={driver.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-white/5 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={driver.avatar || 'https://i.pravatar.cc/150?img=12'}
                    alt={driver.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-white">{driver.name}</p>
                    <p className="text-xs text-gray-400">{driver.vehicle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-white">{driver.rating}</span>
                      </div>
                      <span className="text-xs text-gray-400">• {driver.trips} courses</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                    {driver.distance}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Services */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('RideHistory')}>
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/20 hover:scale-105 transition-transform">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Historique</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('BecomeDriver')}>
            <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-white/20 hover:scale-105 transition-transform">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Devenir conducteur</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <CommissionNotice vertical="transport" compact className="text-white/70" />
      </div>

      <BottomNav />
    </div>
  );
}
