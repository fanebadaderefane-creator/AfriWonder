import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  Car,
  DollarSign,
  Star,
  MapPin,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';
import { useAuth } from '@/lib/AuthContext';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);

  React.useEffect(() => {
    api.transport.drivers
      .getMyProfile()
      .then(setProfile)
      .catch(() => setProfile({ full_name: user?.username || 'Chauffeur', rating: 4.8, total_rides: 156 }));
  }, [user]);

  const todayEarnings = '245 000 FCFA';
  const todayRides = 12;
  const rating = profile?.rating ?? 4.8;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Tableau de bord chauffeur</h1>
          <Link to={createPageUrl('Transport')}>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
        </div>

        {/* Profil + note */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 mb-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xl font-bold text-green-700">
              {(profile?.full_name || user?.username || 'C')[0]}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">{profile?.full_name || user?.username || 'Chauffeur'}</p>
            <p className="text-sm text-gray-500">{profile?.phone || user?.email || '—'}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-gray-900">{rating}</span>
            </div>
            <p className="text-xs text-gray-500">{profile?.total_rides ?? 156} courses</p>
          </div>
        </div>

        {/* Hors ligne / Activer */}
        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <Car className="w-6 h-6 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">
                Vous êtes {isOnline ? 'en ligne' : 'hors ligne'}
              </p>
              <p className="text-sm text-gray-500">
                {isOnline ? 'Vous recevez des courses' : 'Activez pour recevoir des courses'}
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={isOnline}
            onClick={() => setIsOnline(!isOnline)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              isOnline ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                isOnline ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <DollarSign className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-lg font-bold text-gray-900">{todayEarnings}</p>
            <p className="text-xs text-gray-600">Aujourd'hui</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <Car className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-lg font-bold text-gray-900">{todayRides}</p>
            <p className="text-xs text-gray-600">Courses</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Star className="w-5 h-5 text-orange-600 mb-2" />
            <p className="text-lg font-bold text-gray-900">{rating}</p>
            <p className="text-xs text-gray-600">Note</p>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-2">
          <Link to={createPageUrl('RideHistory')}>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Historique des courses</span>
            </div>
          </Link>
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Gains et retraits</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Mes documents</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Paramètres</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full mt-6 border-blue-500 text-blue-600 hover:bg-blue-50"
          onClick={() => navigate(createPageUrl('Home'))}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
