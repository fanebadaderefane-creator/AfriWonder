import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, Star, Search, Wrench, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'menage', label: 'Ménage' },
  { value: 'jardinage', label: 'Jardinage' },
  { value: 'peinture', label: 'Peinture' },
  { value: 'menuiserie', label: 'Menuiserie' },
  { value: 'informatique', label: 'Informatique' },
];

// Données fictives pour que l'interface ne soit pas vide avant d'avoir de vrais prestataires validés
// Images : plomberie, ménage, électricien (sources libres de droits)
const MOCK_SERVICES = [
  {
    id: 'mock-plomberie',
    title: "Plomberie d'urgence",
    description: 'Dépannage plomberie rapide',
    price: 15000,
    rating: 4.7,
    total_bookings: 89,
    duration: 60,
    category: 'plomberie',
    _mock: true,
    image_url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=240&fit=crop',
    provider: { phone: '+22370123456', city: 'Bamako', user: { full_name: 'Seydou Plombier' } },
  },
  {
    id: 'mock-menage',
    title: 'Ménage complet',
    description: 'Nettoyage complet de votre logement',
    price: 10000,
    rating: 4.9,
    total_bookings: 234,
    duration: 120,
    category: 'menage',
    _mock: true,
    image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=240&fit=crop',
    provider: { phone: '+22370987654', city: 'Bamako', user: { full_name: 'Nettoyage Pro Mali' } },
  },
  {
    id: 'mock-electricite',
    title: 'Électricien certifié',
    description: 'Installation et dépannage électrique',
    price: 20000,
    rating: 4.5,
    total_bookings: 67,
    duration: 180,
    category: 'electricite',
    _mock: true,
    image_url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=240&fit=crop',
    provider: { phone: '+22370111222', city: 'Bamako', user: { full_name: 'ElecMali' } },
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [imageErrors, setImageErrors] = useState(() => ({}));
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [orangePhone, setOrangePhone] = useState('');
  const [targetPlanType, setTargetPlanType] = useState(null);
  const [afterSubscribeAction, setAfterSubscribeAction] = useState(null);
  const { data: subscriptionState } = useQuery({
    queryKey: ['marketplace-subscription-me'],
    queryFn: () => api.marketplaceSubscription.getMe(),
  });
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['marketplace-subscription-plans'],
    queryFn: () => api.marketplaceSubscription.getPlans(),
  });
  const subscribeMutation = useMutation({
    mutationFn: ({ planType, phone }) =>
      api.marketplaceSubscription.subscribe(planType, {
        payment_method: 'orange_money',
        orange_money_phone: phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-subscription-me'] });
      toast.success('Abonnement marketplace mis à jour');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Impossible de mettre à jour l'abonnement");
    },
  });
  const permissions = subscriptionState?.permissions || {};
  const planType = subscriptionState?.plan_type || 'free';
  const pendingSubscription = subscriptionState?.pending_subscription;
  const canContactProvider = !!permissions.contact_provider;
  const canPostService = !!permissions.post_service;
  const closeSubscribeModal = () => {
    setShowSubscribeModal(false);
    setOrangePhone('');
    setTargetPlanType(null);
    setAfterSubscribeAction(null);
  };
  const startMarketplaceSubscription = (plan, onAfterPaid) => {
    setTargetPlanType(plan);
    setAfterSubscribeAction(onAfterPaid || null);
    setShowSubscribeModal(true);
  };
  const handleConfirmMarketplaceSubscription = () => {
    const phone = orangePhone.trim();
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      toast.error('Numéro Orange Money invalide');
      return;
    }
    if (!targetPlanType) return;
    subscribeMutation.mutate(
      { planType: targetPlanType, phone },
      {
        onSuccess: (res) => {
          closeSubscribeModal();
          if (res?.paymentUrl) {
            window.location.href = res.paymentUrl;
            return;
          }
          if (afterSubscribeAction) afterSubscribeAction();
        },
      },
    );
  };
  const contactProviderMutation = useMutation({
    mutationFn: (serviceId) => api.services.contact(serviceId),
    onSuccess: (payload) => {
      const providerUserId = payload?.provider_user_id;
      if (!providerUserId) {
        toast.error('Impossible d ouvrir la conversation');
        return;
      }
      navigate(`${createPageUrl('Chat')}?_userId=${providerUserId}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Impossible de contacter le prestataire');
    },
  });
  const { data: servicesData, isLoading, isError } = useQuery({
    queryKey: ['services-list', selectedCategory],
    queryFn: async () => {
      const params = { page: 1, limit: 50 };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      return api.services.list(params);
    },
  });

  const apiServices = servicesData?.services ?? [];
  const useMock = apiServices.length === 0 && !isLoading && !isError;
  const services = useMock ? MOCK_SERVICES : apiServices;

  const filteredServices = searchTerm.trim()
    ? services.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.provider?.user?.full_name || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
    : selectedCategory === 'all'
      ? services
      : services.filter((s) => (s.category || '').toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Prestataires locaux</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trouvez un professionnel de confiance</p>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                className={
                  selectedCategory === cat.value
                    ? 'bg-teal-600 hover:bg-teal-700 text-white rounded-full'
                    : 'rounded-full border-gray-300 text-gray-700'
                }
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-gray-600">Abonnement Marketplace</p>
              <p className="font-bold text-gray-900 uppercase">{planType}</p>
              {pendingSubscription ? (
                <p className="text-xs text-orange-700 mt-1">Paiement abonnement en attente de confirmation Orange Money</p>
              ) : null}
              {!canContactProvider ? (
                <p className="text-xs text-orange-700 mt-1">Contact et commande bloqués sur FREE</p>
              ) : null}
            </div>
            {!canContactProvider ? (
              <div className="flex gap-2">
                {subscriptionPlans
                  .filter((p) => p.plan_type === 'basic' || p.plan_type === 'pro')
                  .map((plan) => (
                    <Button
                      key={plan.plan_type}
                      size="sm"
                      disabled={subscribeMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      onClick={() => startMarketplaceSubscription(plan.plan_type)}
                    >
                      S'abonner {String(plan.label || plan.plan_type).toUpperCase()}
                    </Button>
                  ))}
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : isError ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-700 font-medium">Accès Marketplace indisponible</p>
            <p className="text-sm text-gray-500 mt-1">Connectez-vous puis activez un abonnement marketplace.</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun service trouvé</p>
            <p className="text-sm text-gray-400 mt-1">
              Seuls les prestataires validés par AfriWonder sont visibles ici.
            </p>
          </div>
        ) : (
          <>
            {useMock && (
              <p className="text-sm text-gray-500 mb-4 text-center">
                Exemples de prestataires - les vrais apparaîtront ici une fois validés par AfriWonder.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden">
                  {service.image_url && !imageErrors[service.id] ? (
                    <img
                      src={service.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setImageErrors((prev) => ({ ...prev, [service.id]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wrench className="w-12 h-12 text-orange-400/80" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white shadow">
                      Disponible
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {service.provider?.user?.full_name || service.provider?.user?.username || 'Prestataire'}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold">{(service.rating || 0).toFixed(1)}</span>
                    <span className="text-xs text-gray-500">
                      ({service.total_bookings || 0} avis)
                    </span>
                  </div>
                  {service.duration && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>&lt; {Math.ceil(service.duration / 60)}h</span>
                    </div>
                  )}
                  {service.provider?.city && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{service.provider.city}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="font-bold text-green-600">
                      {Number(service.price || 0).toLocaleString()} FCFA
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        disabled={contactProviderMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canContactProvider) {
                            toast.info('Abonnez-vous en BASIC ou PRO pour contacter le prestataire');
                            return;
                          }
                          if (service._mock) {
                            toast.info('Exemple de service: le chat est actif sur les services valides.');
                            return;
                          }
                          contactProviderMutation.mutate(service.id);
                        }}
                      >
                        Contacter
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canContactProvider) {
                            toast.info('Abonnez-vous en BASIC ou PRO pour commander ce service');
                            return;
                          }
                          if (service._mock) {
                            toast.info('Ceci est un exemple. Les vrais prestataires apparaîtront ici après validation par l\'admin.');
                            return;
                          }
                          navigate(createPageUrl('ServiceBooking') + `?serviceId=${service.id}`);
                        }}
                      >
                        Réserver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            ))}
            </div>
          </>
        )}

        {/* Devenir prestataire */}
        <div className="mt-8 rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 p-6 text-center">
          <Building2 className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2">Vous êtes professionnel ?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Rejoignez AfriWonder. Votre compte sera validé par un administrateur AfriWonder avant d&apos;apparaître sur la plateforme - pour éviter les arnaques.
          </p>
          <Button
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            disabled={subscribeMutation.isPending}
            onClick={() => {
              if (!canPostService) {
                startMarketplaceSubscription('pro', () => {
                  toast.success('Plan PRO activé. Complétez votre profil prestataire.');
                    navigate(createPageUrl('BecomeProvider'));
                });
                return;
              }
              navigate(createPageUrl('BecomeProvider'));
            }}
          >
            {canPostService ? 'Devenir prestataire' : 'Passer PRO pour publier'}
          </Button>
        </div>
      </div>

      <BottomNav />

      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
            <h3 className="text-lg font-bold text-gray-900">Paiement Orange Money</h3>
            <p className="text-sm text-gray-600 mt-1">
              Entrez votre numéro pour activer le plan {String(targetPlanType || '').toUpperCase()}.
            </p>
            <div className="mt-4">
              <Input
                value={orangePhone}
                onChange={(e) => setOrangePhone(e.target.value)}
                placeholder="Ex: 70123456"
                className="rounded-lg"
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={closeSubscribeModal} disabled={subscribeMutation.isPending}>
                Annuler
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={handleConfirmMarketplaceSubscription}
                disabled={subscribeMutation.isPending}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


