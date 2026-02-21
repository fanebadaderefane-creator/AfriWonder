import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import {
  Phone,
  Heart,
  Video,
  Clock,
  Star,
  Camera,
  User,
  Stethoscope,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';
import { toast } from 'sonner';

const SPECIALTIES = [
  { id: 'all', label: 'Tous' },
  { id: 'medecine_generale', label: 'Médecine générale' },
  { id: 'pediatrie', label: 'Pédiatrie' },
  { id: 'cardiologie', label: 'Cardiologie' },
  { id: 'dermatologie', label: 'Dermatologie' },
  { id: 'gynecologie', label: 'Gynécologie' },
];

const CONSULTATION_TYPES = [
  { id: 'video', label: 'Vidéo', icon: Camera },
  { id: 'phone', label: 'Téléphone', icon: Phone },
  { id: 'in_person', label: 'Présentiel', icon: User },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

const MOCK_DOCTORS = [
  {
    id: '1',
    name: 'Dr. Aminata Kouyaté',
    specialty: 'Médecine générale',
    specialtyId: 'medecine_generale',
    rating: 4.9,
    consultations: 1234,
    nextSlot: "Aujourd'hui 14h00",
    fee: 15000,
    avatar: 'https://i.pravatar.cc/150?img=25',
  },
  {
    id: '2',
    name: 'Dr. Boubacar Diallo',
    specialty: 'Pédiatrie',
    specialtyId: 'pediatrie',
    rating: 4.7,
    consultations: 892,
    nextSlot: 'Demain 09h00',
    fee: 20000,
    avatar: 'https://i.pravatar.cc/150?img=33',
  },
];

const SAMU_PHONE = '15';
const CNHU_PHONE = '+22320225002';

const DOCTOR_SPECIALTIES_FOR_REGISTER = [
  { id: 'general', label: 'Médecine générale' },
  { id: 'pediatrie', label: 'Pédiatrie' },
  { id: 'cardiologie', label: 'Cardiologie' },
  { id: 'dermatologie', label: 'Dermatologie' },
  { id: 'gynecologie', label: 'Gynécologie' },
  { id: 'dentiste', label: 'Dentiste' },
  { id: 'ophtalmologie', label: 'Ophtalmologie' },
  { id: 'psychiatrie', label: 'Psychiatrie' },
  { id: 'autre', label: 'Autre' },
];

export default function Telemedicine() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [doctors, setDoctors] = useState(MOCK_DOCTORS);
  const [loading, setLoading] = useState(true);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [consultationType, setConsultationType] = useState('video');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [prestataireModalOpen, setPrestataireModalOpen] = useState(false);
  const [prestataireSuccess, setPrestataireSuccess] = useState(false);
  const [prestataireLoading, setPrestataireLoading] = useState(false);
  const [prestataireError, setPrestataireError] = useState(null);
  const [prestataireForm, setPrestataireForm] = useState({
    full_name: '',
    specialty: 'general',
    phone: '',
    email: '',
    clinic_name: '',
    clinic_address: '',
    city: 'Bamako',
    consultation_fee: 15000,
  });

  useEffect(() => {
    let cancelled = false;
    api.health.doctors
      .list({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.doctors ?? [];
        if (list.length) {
          setDoctors(
            list.map((d) => ({
              id: d.id,
              name: d.full_name || d.name,
              specialty: d.specialty || 'Médecine générale',
              specialtyId: (d.specialty || '').toLowerCase().replace(/\s+/g, '_') || 'medecine_generale',
              rating: d.rating ?? 4.5,
              consultations: d.total_consultations ?? 0,
              nextSlot: d.next_available || "Aujourd'hui 14h00",
              fee: d.consultation_fee ?? 15000,
              avatar: d.profile_photo || d.avatar || 'https://i.pravatar.cc/150?img=25',
            }))
          );
        }
      })
      .catch(() => { if (!cancelled) setDoctors(MOCK_DOCTORS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredDoctors =
    selectedSpecialty === 'all'
      ? doctors
      : doctors.filter((d) => (d.specialtyId || '').toLowerCase() === selectedSpecialty);

  const openBooking = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setConsultationType('video');
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Veuillez choisir un créneau.');
      return;
    }
    setConfirmLoading(true);
    try {
      await api.health.appointments.create({
        doctor_id: selectedDoctor.id,
        consultation_type: consultationType,
        slot: selectedSlot,
        amount: selectedDoctor.fee,
      });
      toast.success('Rendez-vous confirmé !');
      setBookingModalOpen(false);
      setSelectedDoctor(null);
      setSelectedSlot(null);
    } catch (e) {
      toast.success('Rendez-vous enregistré (simulation). Vous serez notifié.');
      setBookingModalOpen(false);
      setSelectedDoctor(null);
      setSelectedSlot(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900">Santé & Télémédecine</h1>
        <p className="text-gray-600 text-sm mt-0.5">Consultez un médecin en ligne</p>

        {/* Urgence médicale */}
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Urgence médicale ?</p>
            <p className="text-sm text-gray-700">
              Appelez le SAMU: 15 ou le CNHU: +223 20 22 50 02
            </p>
          </div>
          <a
            href={`tel:${SAMU_PHONE}`}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 whitespace-nowrap"
          >
            Appeler
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-center">
            <Heart className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">120+</p>
            <p className="text-xs text-gray-500">Médecins</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-center">
            <Video className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">5K+</p>
            <p className="text-xs text-gray-500">Consultations</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-center">
            <Clock className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">24/7</p>
            <p className="text-xs text-gray-500">Disponibles</p>
          </div>
        </div>

        {/* Filtres spécialités */}
        <div className="flex flex-wrap gap-2 mt-6">
          {SPECIALTIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSpecialty(s.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSpecialty === s.id
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Liste médecins */}
        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex gap-4"
            >
              <img
                src={doctor.avatar}
                alt={doctor.name}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{doctor.name}</h3>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-700">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{doctor.rating}</span>
                  <span className="text-gray-500">({doctor.consultations} consultations)</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                  <Clock className="w-4 h-4" />
                  <span>{doctor.nextSlot}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-bold text-gray-900">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
                    {Number(doctor.fee).toLocaleString('fr-FR')} FCFA
                  </p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
                    onClick={() => openBooking(doctor)}
                  >
                    Consulter
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prestataire - Devenir partenaire médecin */}
        <div className="mt-8">
          <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <Stethoscope className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Vous êtes médecin ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rejoignez la plateforme télémédecine. Votre profil sera validé par un administrateur avant d’être visible.
            </p>
            <Button
              onClick={() => {
                setPrestataireError(null);
                setPrestataireSuccess(false);
                setPrestataireModalOpen(true);
              }}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold"
            >
              Devenir partenaire
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Inscription médecin */}
      <Modal
        isOpen={prestataireModalOpen}
        onClose={() => {
          setPrestataireModalOpen(false);
          setPrestataireSuccess(false);
          setPrestataireError(null);
        }}
        title="Inscription médecin"
        size="md"
      >
        {prestataireSuccess ? (
          <div className="py-4 text-center">
            <p className="text-green-600 font-medium">
              Demande enregistrée. Vous serez notifié après validation par l’administrateur.
            </p>
            <Button className="mt-4 bg-red-500 hover:bg-red-600" onClick={() => setPrestataireModalOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-4">
              Renseignez vos informations. Un administrateur validera votre profil avant qu’il n’apparaisse sur la plateforme.
            </p>
            {prestataireError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {prestataireError}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!prestataireForm.full_name?.trim() || !prestataireForm.phone?.trim()) {
                  setPrestataireError('Veuillez remplir le nom et le téléphone.');
                  return;
                }
                setPrestataireError(null);
                setPrestataireLoading(true);
                try {
                  await api.health.doctors.create({
                    full_name: prestataireForm.full_name.trim(),
                    specialty: prestataireForm.specialty,
                    phone: prestataireForm.phone.trim(),
                    email: prestataireForm.email?.trim() || undefined,
                    clinic_name: prestataireForm.clinic_name?.trim() || undefined,
                    clinic_address: prestataireForm.clinic_address?.trim() || undefined,
                    city: prestataireForm.city?.trim() || undefined,
                    consultation_fee: Number(prestataireForm.consultation_fee) || undefined,
                  });
                  setPrestataireSuccess(true);
                  setPrestataireForm({
                    full_name: '',
                    specialty: 'general',
                    phone: '',
                    email: '',
                    clinic_name: '',
                    clinic_address: '',
                    city: 'Bamako',
                    consultation_fee: 15000,
                  });
                } catch (err) {
                  setPrestataireError(
                    err?.response?.data?.message || err?.message || 'Connectez-vous pour vous inscrire.'
                  );
                } finally {
                  setPrestataireLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={prestataireForm.full_name}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, full_name: e.target.value })}
                  placeholder="Dr. Nom Prénom"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                <select
                  value={prestataireForm.specialty}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, specialty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  {DOCTOR_SPECIALTIES_FOR_REGISTER.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={prestataireForm.phone}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, phone: e.target.value })}
                  placeholder="+223 XX XX XX XX"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  value={prestataireForm.email}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, email: e.target.value })}
                  placeholder="email@exemple.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cabinet / Clinique (optionnel)</label>
                <input
                  type="text"
                  value={prestataireForm.clinic_name}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, clinic_name: e.target.value })}
                  placeholder="Nom du cabinet"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse du cabinet (optionnel)</label>
                <input
                  type="text"
                  value={prestataireForm.clinic_address}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, clinic_address: e.target.value })}
                  placeholder="Adresse"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={prestataireForm.city}
                    onChange={(e) => setPrestataireForm({ ...prestataireForm, city: e.target.value })}
                    placeholder="Bamako"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif consultation (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={prestataireForm.consultation_fee}
                    onChange={(e) =>
                      setPrestataireForm({ ...prestataireForm, consultation_fee: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={prestataireLoading}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3"
              >
                {prestataireLoading ? 'Envoi en cours...' : 'Soumettre ma demande'}
              </Button>
            </form>
          </>
        )}
      </Modal>

      {/* Modal Réservation */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={selectedDoctor ? `Consulter ${selectedDoctor.name}` : ''}
        size="md"
      >
        {selectedDoctor && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={selectedDoctor.avatar}
                alt={selectedDoctor.name}
                className="w-14 h-14 rounded-full object-cover"
              />
              <div>
                <p className="font-bold text-gray-900">{selectedDoctor.name}</p>
                <p className="text-sm text-gray-600">{selectedDoctor.specialty}</p>
                <p className="text-green-600 font-semibold">
                  {Number(selectedDoctor.fee).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Type de consultation</p>
              <div className="flex gap-2">
                {CONSULTATION_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConsultationType(t.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        consultationType === t.id
                          ? 'border-red-500 text-red-600 bg-red-50'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Choisir un créneau</p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                    className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      selectedSlot === slot
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
              onClick={handleConfirmBooking}
              disabled={confirmLoading || !selectedSlot}
            >
              {confirmLoading
                ? 'Traitement...'
                : `Confirmer le rendez-vous - ${Number(selectedDoctor.fee).toLocaleString('fr-FR')} FCFA`}
            </Button>
          </div>
        )}
      </Modal>

      <BottomNav />
    </div>
  );
}
