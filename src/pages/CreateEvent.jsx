import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import BottomNav from '../components/navigation/BottomNav';

export default function CreateEvent() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    category: 'conference',
    location: '',
    is_online: false,
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    max_attendees: 100,
    ticket_price: 0,
    image_url: '',
    capacity: 0,
    speakers: [{ name: '', role: '' }, { name: '', role: '' }],
    sponsors: [{ name: '', logo_url: '', link: '' }],
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        window.location.href = '/';
      }
    };
    getUser();
  }, []);

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Connectez-vous d\'abord');
        return;
      }
      const startDate = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const endDate = new Date(`${eventData.end_date}T${eventData.end_time}`);
      return api.events.create({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        location: eventData.location || 'En ligne',
        startDate,
        endDate,
        image: eventData.image_url || undefined,
        event_type: eventData.is_online ? 'virtual' : 'physical',
        capacity: eventData.max_attendees || eventData.capacity || null,
        price: eventData.ticket_price || 0,
        is_free: !eventData.ticket_price || eventData.ticket_price === 0,
        speakers: eventData.speakers?.filter((s) => s.name?.trim()).map((s) => ({ name: s.name.trim(), role: s.role?.trim() || undefined })) || undefined,
        sponsors: eventData.sponsors?.filter((s) => s.name?.trim()).map((s) => ({ name: s.name.trim(), logo_url: s.logo_url?.trim() || undefined, link: s.link?.trim() || undefined })) || undefined,
      });
    },
    onSuccess: (event) => {
      toast.success('Événement créé. Il est en attente d\'approbation par un administrateur et sera visible une fois approuvé.');
      if (event?.id) {
        setTimeout(() => {
          window.location.href = `${createPageUrl('EventDetails')}?id=${event.id}`;
        }, 1000);
      } else {
        setTimeout(() => { window.location.href = createPageUrl('Events'); }, 1500);
      }
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || e.message || 'Erreur lors de la création');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.upload.video({ file });
      setEventData({...eventData, image_url: result.file_url});
      toast.success('Image ajoutée');
    } catch (_error) {
      toast.error('Erreur upload image');
    }
  };

  const steps = [
    { num: 1, title: 'Détails' },
    { num: 2, title: 'Date & Heure' },
    { num: 3, title: 'Tickets' },
    { num: 4, title: 'Vérification' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-1 -m-1 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Créer un événement</h1>
      </div>

      {/* Steps */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex justify-between gap-2">
          {steps.map(step => (
            <button
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              className={`flex-1 text-center text-xs font-medium py-2 rounded transition-all ${
                currentStep === step.num
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {step.num}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 space-y-4">
        {/* Step 1: Details */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre de l'événement *</label>
              <Input
                placeholder="Ex: Conférence Tech 2026"
                value={eventData.title}
                onChange={(e) => setEventData({...eventData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Textarea
                placeholder="Décrivez votre événement..."
                value={eventData.description}
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                className="h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select
                  value={eventData.category}
                  onChange={(e) => setEventData({...eventData, category: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="conference">Conférence</option>
                  <option value="workshop">Atelier</option>
                  <option value="concert">Concert</option>
                  <option value="networking">Networking</option>
                  <option value="webinaire">Webinaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <button
                  onClick={() => setEventData({...eventData, is_online: !eventData.is_online})}
                  className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                    eventData.is_online
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {eventData.is_online ? 'En ligne' : 'Physique'}
                </button>
              </div>
            </div>

            {!eventData.is_online && (
              <div>
                <label className="block text-sm font-medium mb-1">Lieu *</label>
                <Input
                  placeholder="Adresse ou lieu"
                  value={eventData.location}
                  onChange={(e) => setEventData({...eventData, location: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Intervenants (optionnel)</label>
              {(eventData.speakers || []).slice(0, 3).map((s, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input
                    placeholder={`Nom intervenant ${i + 1}`}
                    value={s.name}
                    onChange={(e) => {
                      const sp = [...(eventData.speakers || [])];
                      if (!sp[i]) sp[i] = { name: '', role: '' };
                      sp[i] = { ...sp[i], name: e.target.value };
                      setEventData({ ...eventData, speakers: sp });
                    }}
                  />
                  <Input
                    placeholder="Rôle"
                    value={s.role || ''}
                    onChange={(e) => {
                      const sp = [...(eventData.speakers || [])];
                      if (!sp[i]) sp[i] = { name: '', role: '' };
                      sp[i] = { ...sp[i], role: e.target.value };
                      setEventData({ ...eventData, speakers: sp });
                    }}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Partenaires / Sponsors (optionnel)</label>
              {(eventData.sponsors || []).slice(0, 2).map((s, i) => (
                <div key={i} className="flex flex-col gap-2 mt-2 p-2 border rounded-lg">
                  <Input
                    placeholder={`Nom partenaire ${i + 1}`}
                    value={s.name || ''}
                    onChange={(e) => {
                      const sp = [...(eventData.sponsors || [])];
                      if (!sp[i]) sp[i] = { name: '', logo_url: '', link: '' };
                      sp[i] = { ...sp[i], name: e.target.value };
                      setEventData({ ...eventData, sponsors: sp });
                    }}
                  />
                  <Input
                    placeholder="URL logo (optionnel)"
                    value={s.logo_url || ''}
                    onChange={(e) => {
                      const sp = [...(eventData.sponsors || [])];
                      if (!sp[i]) sp[i] = { name: '', logo_url: '', link: '' };
                      sp[i] = { ...sp[i], logo_url: e.target.value };
                      setEventData({ ...eventData, sponsors: sp });
                    }}
                  />
                  <Input
                    placeholder="Lien site (optionnel)"
                    value={s.link || ''}
                    onChange={(e) => {
                      const sp = [...(eventData.sponsors || [])];
                      if (!sp[i]) sp[i] = { name: '', logo_url: '', link: '' };
                      sp[i] = { ...sp[i], link: e.target.value };
                      setEventData({ ...eventData, sponsors: sp });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Image de l'événement</label>
              <label className="w-full min-h-[140px] p-6 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer bg-orange-50/50 hover:bg-orange-50 hover:border-orange-400 transition-all flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-orange-800">Cliquez ou glissez une image ici</span>
                <span className="text-xs text-orange-600">PNG, JPG — max. 5 Mo</span>
                <input type="file" accept={FILE_ACCEPT_IMAGES} onChange={handleImageUpload} className="hidden" />
              </label>
              {eventData.image_url && (
                <div className="mt-3 relative">
                  <img src={eventData.image_url} alt="Aperçu" className="w-full h-36 object-cover rounded-xl border border-orange-200" />
                  <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded">Image ajoutée</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date de début *</label>
              <Input
                type="date"
                value={eventData.start_date}
                onChange={(e) => setEventData({...eventData, start_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Heure de début *</label>
              <Input
                type="time"
                value={eventData.start_time}
                onChange={(e) => setEventData({...eventData, start_time: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date de fin *</label>
              <Input
                type="date"
                value={eventData.end_date}
                onChange={(e) => setEventData({...eventData, end_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Heure de fin *</label>
              <Input
                type="time"
                value={eventData.end_time}
                onChange={(e) => setEventData({...eventData, end_time: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre maximum de participants</label>
              <Input
                type="number"
                value={eventData.max_attendees}
                onChange={(e) => setEventData({...eventData, max_attendees: Number(e.target.value)})}
              />
            </div>
          </motion.div>
        )}

        {/* Step 3: Tickets */}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prix du ticket (FCFA)</label>
              <Input
                type="number"
                placeholder="0 pour gratuit"
                value={eventData.ticket_price}
                onChange={(e) => setEventData({...eventData, ticket_price: Number(e.target.value)})}
              />
            </div>

            <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-800 border border-orange-100">
              <p className="font-medium mb-2">💡 Conseil</p>
              <p>Définissez le prix à 0 pour un événement gratuit, ou fixez un montant pour les événements payants.</p>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
              <h3 className="font-bold mb-3 text-gray-900">Résumé de l'événement</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Titre:</span> {eventData.title}</p>
                <p><span className="font-medium">Type:</span> {eventData.is_online ? 'En ligne' : 'Physique'}</p>
                <p><span className="font-medium">Début:</span> {eventData.start_date} {eventData.start_time}</p>
                <p><span className="font-medium">Fin:</span> {eventData.end_date} {eventData.end_time}</p>
                <p><span className="font-medium">Prix:</span> {eventData.ticket_price === 0 ? 'Gratuit' : `${eventData.ticket_price} FCFA`}</p>
                <p><span className="font-medium">Capacité:</span> {eventData.max_attendees} personnes</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            >
              Précédent
            </Button>
          )}
          {currentStep < 4 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-sm"
            >
              Suivant
            </Button>
          )}
          {currentStep === 4 && (
            <Button
              onClick={() => createEventMutation.mutate()}
              disabled={createEventMutation.isPending || !eventData.title || !eventData.start_date}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-sm"
            >
              {createEventMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Créer l'événement
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

