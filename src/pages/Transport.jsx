import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import {
  Car,
  Star,
  Phone,
  MessageCircle,
  FileText,
  User,
  Clock,
  MapPinned,
  ArrowLeft,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';

// Chauffeurs validés par l'admin et avec abonnement payant vérifié (mock)
const MOCK_DRIVERS = [
  {
    id: '1',
    name: 'Moussa Coulibaly',
    vehicle: 'Toyota Corolla 2020',
    plate: 'BA-1234-ML',
    rating: 4.9,
    courses: 1234,
    avatar: 'https://i.pravatar.cc/150?img=12',
    online: true,
    adminValidated: true,
    subscriptionActive: true,
  },
  {
    id: '2',
    name: 'Ibrahim Traoré',
    vehicle: 'Honda Civic 2019',
    plate: 'BA-5678-ML',
    rating: 4.7,
    courses: 892,
    avatar: 'https://i.pravatar.cc/150?img=33',
    online: true,
    adminValidated: true,
    subscriptionActive: true,
  },
];

const POPULAR_DESTINATIONS = [
  'Aéroport International',
  'Grand Marché',
  'ACI 2000',
  'Badalabougou',
  'Hamdallaye',
  'Hippodrome',
  'Sotuba',
  'Kalaban Coura',
];

export default function Transport() {
  const navigate = useNavigate();
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedDestinationTag, setSelectedDestinationTag] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDriverFoundModal, setShowDriverFoundModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showBecomeDriverModal, setShowBecomeDriverModal] = useState(false);
  const [rideRequested, setRideRequested] = useState(false);
  const [estimateFare, _setEstimateFare] = useState(3671);
  const [estimateDuration, _setEstimateDuration] = useState('~5 min');
  const [becomeDriverForm, setBecomeDriverForm] = useState({
    fullName: '',
    phone: '',
    vehicleMakeModel: '',
    vehicleColor: '',
    licensePlate: '',
    licenseNumber: '',
  });
  const [becomeDriverLoading, setBecomeDriverLoading] = useState(false);
  const [becomeDriverError, setBecomeDriverError] = useState(null);

  // Charger uniquement les chauffeurs validés par l'admin avec abonnement payant vérifié
  useEffect(() => {
    let cancelled = false;
    api.transport.drivers
      .listNearby({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.drivers ?? [];
        if (list.length) {
          const valid = list.filter(
            (d) => d.admin_validated !== false && d.subscription_active === true
          );
          setDrivers(
            valid.map((d) => ({
              id: d.id,
              name: d.full_name || d.name,
              vehicle: [d.vehicle_brand, d.vehicle_model].filter(Boolean).join(' ') || 'Véhicule',
              plate: d.license_plate || '',
              rating: d.rating ?? 5,
              courses: d.total_rides ?? 0,
              avatar: d.avatar || 'https://i.pravatar.cc/150?img=12',
              online: d.is_online !== false,
            }))
          );
        } else {
          setDrivers(MOCK_DRIVERS);
        }
      })
      .catch(() => {
        if (!cancelled) setDrivers(MOCK_DRIVERS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestRide = () => {
    if (!departure.trim() || !destination.trim()) return;
    setRideRequested(true);
    setSelectedDriver(drivers[0] || null);
    setShowDriverFoundModal(true);
  };

  const handleBecomeDriverSubmit = async (e) => {
    e.preventDefault();
    if (!becomeDriverForm.fullName?.trim() || !becomeDriverForm.phone?.trim()) {
      setBecomeDriverError('Veuillez remplir au moins le nom et le téléphone.');
      return;
    }
    if (!becomeDriverForm.licensePlate?.trim()) {
      setBecomeDriverError('La plaque d\'immatriculation est requise.');
      return;
    }
    setBecomeDriverError(null);
    setBecomeDriverLoading(true);
    try {
      await api.transport.drivers.updateProfile({
        full_name: becomeDriverForm.fullName.trim(),
        phone: becomeDriverForm.phone.trim(),
        vehicle_type: 'car',
        vehicle_brand: becomeDriverForm.vehicleMakeModel.split(' ')[0] || undefined,
        vehicle_model: becomeDriverForm.vehicleMakeModel.split(' ').slice(1).join(' ').trim() || undefined,
        vehicle_color: becomeDriverForm.vehicleColor?.trim() || undefined,
        license_plate: becomeDriverForm.licensePlate.trim(),
        license_number: becomeDriverForm.licenseNumber?.trim() || undefined,
      });
      setShowBecomeDriverModal(false);
      setBecomeDriverForm({
        fullName: '',
        phone: '',
        vehicleMakeModel: '',
        vehicleColor: '',
        licensePlate: '',
        licenseNumber: '',
      });
      navigate(createPageUrl('DriverDashboard'));
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;
      if (status === 401) {
        setBecomeDriverError('Connectez-vous pour vous inscrire comme chauffeur.');
      } else {
        setBecomeDriverError(msg || 'Une erreur est survenue. Réessayez.');
      }
    } finally {
      setBecomeDriverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Transport</h1>
              <p className="text-gray-500">Réservez une course rapidement</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setBecomeDriverError(null);
              setShowBecomeDriverModal(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shrink-0"
          >
            <Car className="w-4 h-4 mr-2" />
            Devenir chauffeur
          </Button>
        </div>

        {/* Carte interactive */}
        <div className="rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 p-8 mb-6 flex flex-col items-center justify-center min-h-[200px]">
          <MapPinned className="w-12 h-12 text-green-600 mb-2" />
          <p className="font-semibold text-gray-800">Carte interactive</p>
          <p className="text-sm text-gray-500">Bamako, Mali</p>
        </div>

        {/* Où allez-vous ? */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Où allez-vous ?</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              <input
                type="text"
                placeholder="Point de départ"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <input
                type="text"
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          <p className="text-sm font-medium text-gray-700 mt-3 mb-2">Destinations populaires</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_DESTINATIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setDestination(tag);
                  setSelectedDestinationTag(selectedDestinationTag === tag ? null : tag);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDestinationTag === tag
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {rideRequested && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">Estimation</p>
                <p className="text-lg font-bold text-green-600">{estimateFare} F CFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Durée estimée</p>
                <p className="text-lg font-bold text-green-600">{estimateDuration}</p>
              </div>
              <p className="w-full text-sm font-bold text-green-600">Chauffeur trouvé !</p>
              <Button
                onClick={() => setShowDriverFoundModal(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
              >
                Course en cours...
              </Button>
            </div>
          )}

          {!rideRequested && (
            <Button
              onClick={handleRequestRide}
              className="w-full mt-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
            >
              Demander une course
            </Button>
          )}
        </div>

        {/* Chauffeurs disponibles (validés admin + abonnement payant) */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Chauffeurs disponibles</h2>
          {loading ? (
            <p className="text-gray-500 py-4">Chargement...</p>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200"
                >
                  <img
                    src={driver.avatar}
                    alt={driver.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{driver.name}</p>
                    <p className="text-sm text-gray-600 truncate">{driver.vehicle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">{driver.rating}</span>
                      <span className="text-xs text-gray-500">{driver.courses} courses</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    En ligne
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowDriverFoundModal(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Choisir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Chauffeur trouvé ! */}
      <Modal
        isOpen={showDriverFoundModal}
        onClose={() => setShowDriverFoundModal(false)}
        title="Chauffeur trouvé !"
        size="md"
      >
        {selectedDriver && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <img
                src={selectedDriver.avatar}
                alt={selectedDriver.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{selectedDriver.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedDriver.vehicle} · {selectedDriver.plate || '—'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{selectedDriver.rating}</span>
                  <span className="text-xs text-gray-500">({selectedDriver.courses} courses)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-b border-gray-100">
              <span className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4" />
                Arrivée dans 5 min
              </span>
              <span className="font-bold text-green-600 text-lg">{estimateFare} FCFA</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Phone className="w-4 h-4 mr-2" />
                Appeler
              </Button>
              <Button variant="outline" className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
              onClick={() => setShowDriverFoundModal(false)}
            >
              Confirmer la course
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Devenir chauffeur */}
      <Modal
        isOpen={showBecomeDriverModal}
        onClose={() => setShowBecomeDriverModal(false)}
        title="Devenir chauffeur"
        size="md"
      >
        <p className="text-gray-600 text-sm mb-4">
          Rejoignez notre réseau de chauffeurs et gagnez en popularité au Mali ! Les inscriptions
          sont validées par un administrateur et un abonnement payant est requis.
        </p>
        {becomeDriverError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {becomeDriverError}
          </div>
        )}
        <form onSubmit={handleBecomeDriverSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={becomeDriverForm.fullName}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, fullName: e.target.value })
                }
                placeholder="Votre nom complet"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={becomeDriverForm.phone}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, phone: e.target.value })
                }
                placeholder="+223 XX XX XX XX"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>
          <h4 className="font-bold text-gray-900 flex items-center gap-2 pt-2">
            <Car className="w-4 h-4" />
            Informations du véhicule
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque/Modèle</label>
              <input
                type="text"
                value={becomeDriverForm.vehicleMakeModel}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, vehicleMakeModel: e.target.value })
                }
                placeholder="Toyota Corolla"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
              <input
                type="text"
                value={becomeDriverForm.vehicleColor}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, vehicleColor: e.target.value })
                }
                placeholder="Blanc"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plaque d'immatriculation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={becomeDriverForm.licensePlate}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, licensePlate: e.target.value })
                }
                placeholder="BA-1234-ML"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <h4 className="font-bold text-gray-900 flex items-center gap-2 pt-2">
            <FileText className="w-4 h-4" />
            Documents
          </h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de permis de conduire
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={becomeDriverForm.licenseNumber}
                onChange={(e) =>
                  setBecomeDriverForm({ ...becomeDriverForm, licenseNumber: e.target.value })
                }
                placeholder="ML-123456789"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={becomeDriverLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
          >
            S'inscrire comme chauffeur
          </Button>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}
