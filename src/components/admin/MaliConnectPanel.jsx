import React, { useState } from "react";
import { 
  Shield, Calendar, Car, UtensilsCrossed, Stethoscope, Home, 
  Briefcase, GraduationCap, Heart, Users, Video, FileText,
  Check, X, EyeOff, Ban, AlertTriangle, DollarSign,
  Search, CheckCircle, Clock, BarChart3, UserCheck, MapPin, Wrench, ShoppingCart
} from "lucide-react";
import { Card } from "@/components/ui/CardWrapper";
import { Badge } from "@/components/ui/BadgeWrapper";
import { Button } from "@/components/ui/ButtonWrapper";
import { Modal } from "@/components/ui/Modal";
import { useAdmin, SUBSCRIPTION_PLANS } from "@/lib/admin-context";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FEATURES = [
  { type: "marketplace", name: "Marketplace", icon: ShoppingCart, color: "bg-amber-100 text-amber-600" },
  { type: "event", name: "Événements", icon: Calendar, color: "bg-purple-100 text-purple-600" },
  { type: "transport_driver", name: "Chauffeurs", icon: Car, color: "bg-blue-100 text-blue-600" },
  { type: "food_restaurant", name: "Restaurants", icon: UtensilsCrossed, color: "bg-blue-100 text-blue-600" },
  { type: "service_provider", name: "Prestataires", icon: Users, color: "bg-green-100 text-green-600" },
  { type: "marketplace_service", name: "Services", icon: Wrench, color: "bg-teal-100 text-teal-700" },
  { type: "health_doctor", name: "Santé", icon: Stethoscope, color: "bg-red-100 text-red-600" },
  { type: "realestate_property", name: "Immobilier", icon: Home, color: "bg-amber-100 text-amber-600" },
  { type: "insurance_provider", name: "Assurances", icon: Briefcase, color: "bg-indigo-100 text-indigo-600" },
  { type: "course", name: "Formations", icon: GraduationCap, color: "bg-cyan-100 text-cyan-600" },
  { type: "crowdfunding_campaign", name: "Crowdfunding", icon: Heart, color: "bg-pink-100 text-pink-600" },
  { type: "civic_petition", name: "Pétitions", icon: FileText, color: "bg-gray-100 text-gray-600" },
  { type: "civic_report", name: "Signalements", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-600" },
  { type: "ad", name: "Publicités", icon: Video, color: "bg-violet-100 text-violet-600" },
];

export default function MaliConnectPanel() {
  const { 
    pendingEntities, approvedEntities, bannedEntities,
    approveEntity, rejectEntity, hideEntity, banEntity, unbanEntity,
    getStats, subscriptions 
  } = useAdmin();
  
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch pending events from API
  const { data: pendingEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['admin-pending-events'],
    queryFn: async () => {
      try {
        return await api.events.getPending();
      } catch (error) {
        console.error('Error fetching pending events:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending restaurants from API
  const { data: pendingRestaurants = [], refetch: refetchRestaurants } = useQuery({
    queryKey: ['admin-pending-restaurants'],
    queryFn: async () => {
      try {
        return await api.food.restaurants.getPending();
      } catch (error) {
        console.error('Error fetching pending restaurants:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch pending doctors (télémédecine) from API
  const { data: pendingDoctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['admin-pending-doctors'],
    queryFn: async () => {
      try {
        return await api.health.doctors.getPending();
      } catch (error) {
        console.error('Error fetching pending doctors:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch pending properties (immobilier) from API
  const { data: pendingProperties = [], refetch: refetchProperties } = useQuery({
    queryKey: ['admin-pending-properties'],
    queryFn: async () => {
      try {
        return await api.properties.getPending();
      } catch (error) {
        console.error('Error fetching pending properties:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch pending insurance providers from API
  const { data: pendingInsuranceProviders = [], refetch: refetchInsuranceProviders } = useQuery({
    queryKey: ['admin-pending-insurance-providers'],
    queryFn: async () => {
      try {
        return await api.insurance.providers.getPending();
      } catch (error) {
        console.error('Error fetching pending insurance providers:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch pending service providers (prestataires locaux) from API
  const { data: pendingServiceProviders = [], refetch: refetchServiceProviders } = useQuery({
    queryKey: ['admin-pending-service-providers'],
    queryFn: async () => {
      try {
        return await api.providers.getPending();
      } catch (error) {
        console.error('Error fetching pending service providers:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Fetch pending course providers (formateurs) from API
  const { data: pendingCourseProviders = [], refetch: refetchCourseProviders } = useQuery({
    queryKey: ['admin-pending-course-providers'],
    queryFn: async () => {
      try {
        const res = await api.courses.providers.getPending();
        return Array.isArray(res) ? res : (res?.data ?? []);
      } catch (error) {
        console.error('Error fetching pending course providers:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });
  const { data: pendingServicesRaw, refetch: refetchPendingServices } = useQuery({
    queryKey: ['admin-pending-services'],
    queryFn: async () => {
      try {
        return await api.services.getPending({ page: 1, limit: 100 });
      } catch (error) {
        console.error('Error fetching pending services:', error);
        return { services: [] };
      }
    },
    refetchInterval: 30000,
  });
  const pendingServices = Array.isArray(pendingServicesRaw?.services)
    ? pendingServicesRaw.services
    : (Array.isArray(pendingServicesRaw) ? pendingServicesRaw : []);

  // Approve event mutation
  const approveEventMutation = useMutation({
    mutationFn: async (eventId) => {
      return await api.events.approve(eventId);
    },
    onSuccess: () => {
      toast.success('Événement approuvé');
      refetchEvents();
      queryClient.invalidateQueries(['events']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject event mutation
  const rejectEventMutation = useMutation({
    mutationFn: async ({ eventId, reason }) => {
      return await api.events.reject(eventId, reason);
    },
    onSuccess: () => {
      toast.success('Événement rejeté');
      refetchEvents();
      queryClient.invalidateQueries(['events']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors du rejet');
    },
  });

  // Approve restaurant mutation
  const approveRestaurantMutation = useMutation({
    mutationFn: async (restaurantId) => api.food.restaurants.approve(restaurantId),
    onSuccess: () => {
      toast.success('Restaurant approuvé');
      refetchRestaurants();
      queryClient.invalidateQueries(['restaurants']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject restaurant mutation
  const rejectRestaurantMutation = useMutation({
    mutationFn: async ({ restaurantId, reason }) => api.food.restaurants.reject(restaurantId, reason),
    onSuccess: () => {
      toast.success('Restaurant rejeté');
      refetchRestaurants();
      queryClient.invalidateQueries(['restaurants']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  // Approve doctor mutation
  const approveDoctorMutation = useMutation({
    mutationFn: async (doctorId) => api.health.doctors.approve(doctorId),
    onSuccess: () => {
      toast.success('Médecin approuvé');
      refetchDoctors();
      queryClient.invalidateQueries(['doctors']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject doctor mutation
  const rejectDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, reason }) => api.health.doctors.reject(doctorId, reason),
    onSuccess: () => {
      toast.success('Médecin rejeté');
      refetchDoctors();
      queryClient.invalidateQueries(['doctors']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  // Approve property (immobilier) mutation
  const approvePropertyMutation = useMutation({
    mutationFn: async (propertyId) => api.properties.approve(propertyId),
    onSuccess: () => {
      toast.success('Annonce immobilier approuvée');
      refetchProperties();
      queryClient.invalidateQueries(['properties']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject property (immobilier) mutation
  const rejectPropertyMutation = useMutation({
    mutationFn: async ({ propertyId, reason }) => api.properties.reject(propertyId, reason),
    onSuccess: () => {
      toast.success('Annonce immobilier rejetée');
      refetchProperties();
      queryClient.invalidateQueries(['properties']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  // Approve insurance provider mutation
  const approveInsuranceProviderMutation = useMutation({
    mutationFn: async (id) => api.insurance.providers.approve(id),
    onSuccess: () => {
      toast.success('Prestataire assurance approuvé');
      refetchInsuranceProviders();
      queryClient.invalidateQueries(['insurance-providers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject insurance provider mutation
  const rejectInsuranceProviderMutation = useMutation({
    mutationFn: async ({ id, reason }) => api.insurance.providers.reject(id, reason),
    onSuccess: () => {
      toast.success('Prestataire assurance rejeté');
      refetchInsuranceProviders();
      queryClient.invalidateQueries(['insurance-providers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  // Approve service provider (prestataire local) mutation
  const approveServiceProviderMutation = useMutation({
    mutationFn: async (id) => api.providers.approve(id),
    onSuccess: () => {
      toast.success('Prestataire approuvé');
      refetchServiceProviders();
      queryClient.invalidateQueries(['providers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  // Reject service provider (prestataire local) mutation
  const rejectServiceProviderMutation = useMutation({
    mutationFn: async ({ id, reason }) => api.providers.reject(id, reason),
    onSuccess: () => {
      toast.success('Prestataire rejeté');
      refetchServiceProviders();
      queryClient.invalidateQueries(['providers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  const approveCourseProviderMutation = useMutation({
    mutationFn: async (id) => api.courses.providers.approve(id),
    onSuccess: () => {
      toast.success('Formateur approuvé');
      refetchCourseProviders();
      queryClient.invalidateQueries(['courses']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'approbation');
    },
  });

  const rejectCourseProviderMutation = useMutation({
    mutationFn: async ({ id, reason }) => api.courses.providers.reject(id, reason),
    onSuccess: () => {
      toast.success('Formateur rejeté');
      refetchCourseProviders();
      queryClient.invalidateQueries(['courses']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });
  const approveServiceMutation = useMutation({
    mutationFn: async (id) => api.services.approve(id),
    onSuccess: () => {
      toast.success('Service approuvé');
      refetchPendingServices();
      queryClient.invalidateQueries(['services-list']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l approbation');
    },
  });
  const rejectServiceMutation = useMutation({
    mutationFn: async ({ id }) => api.services.reject(id),
    onSuccess: () => {
      toast.success('Service rejeté');
      refetchPendingServices();
      queryClient.invalidateQueries(['services-list']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors du rejet');
    },
  });

  // Combine pending entities with pending events, pending restaurants, doctors, properties, insurance providers and service providers
  const allPendingEntities = [
    ...pendingEntities,
    ...pendingEvents.map(event => ({
      id: event.id,
      type: 'event',
      name: event.title,
      description: event.description || '',
      status: 'pending',
      submittedAt: new Date(event.created_at),
      phone: event.organizer?.email || '',
      price: event.price || 0,
      organizer: event.organizer_name,
      event: event, // Keep full event data
    })),
    ...pendingRestaurants.map(restaurant => ({
      id: restaurant.id,
      type: 'food_restaurant',
      name: restaurant.name,
      description: restaurant.description || restaurant.address || '',
      status: 'pending',
      submittedAt: new Date(restaurant.created_at),
      phone: restaurant.phone || '',
      organizer: restaurant.owner?.full_name || '',
      restaurant: restaurant, // Keep full restaurant data
    })),
    ...pendingDoctors.map(doctor => ({
      id: doctor.id,
      type: 'health_doctor',
      name: doctor.full_name,
      description: doctor.specialty || doctor.bio || '',
      status: 'pending',
      submittedAt: new Date(doctor.created_at),
      phone: doctor.phone || '',
      organizer: doctor.user?.full_name || '',
      doctor: doctor, // Keep full doctor data
    })),
    ...pendingProperties.map(property => ({
      id: property.id,
      type: 'realestate_property',
      name: property.title,
      description: property.description || property.address || '',
      status: 'pending',
      submittedAt: new Date(property.created_at),
      phone: property.owner_phone || property.owner?.email || '',
      organizer: property.owner_name || property.owner?.full_name || '',
      property: property, // Keep full property data
    })),
    ...pendingInsuranceProviders.map(provider => ({
      id: provider.id,
      type: 'insurance_provider',
      name: provider.company_name,
      description: provider.description || provider.contact_name || '',
      status: 'pending',
      submittedAt: new Date(provider.created_at),
      phone: provider.phone || '',
      organizer: provider.contact_name || provider.user?.full_name || '',
      provider: provider, // Keep full provider data
    })),
    ...pendingServiceProviders.map(provider => ({
      id: provider.id,
      type: 'service_provider',
      name: provider.user?.full_name || provider.user?.username || 'Prestataire',
      description: provider.bio || (provider.service_categories || []).join(', ') || '',
      status: 'pending',
      submittedAt: new Date(provider.created_at),
      phone: provider.phone || provider.user?.email || '',
      organizer: provider.user?.full_name || '',
      provider: provider, // Keep full provider data
    })),
    ...pendingCourseProviders.map(provider => ({
      id: provider.id,
      type: 'course',
      name: provider.full_name || provider.user?.full_name || 'Formateur',
      description: provider.bio || provider.domains || '',
      status: 'pending',
      submittedAt: new Date(provider.created_at),
      phone: provider.phone || provider.user?.email || '',
      organizer: provider.full_name || provider.user?.full_name || '',
      provider: provider,
    })),
    ...pendingServices.map(service => ({
      id: service.id,
      type: 'marketplace_service',
      name: service.title || 'Service',
      description: service.description || service.category || '',
      status: 'pending',
      submittedAt: new Date(service.created_at),
      phone: service.provider?.phone || service.provider?.user?.email || '',
      organizer: service.provider?.user?.full_name || service.provider?.user?.username || '',
      price: service.price || 0,
      service,
    })),
  ];

  const stats = getStats();

  const filteredEntities = () => {
    let entities = [];
    
    if (activeTab === "pending") {
      entities = allPendingEntities;
    } else if (activeTab === "approved") {
      entities = approvedEntities;
    } else {
      entities = bannedEntities;
    }

    if (selectedType !== "all") {
      if (selectedType === "marketplace") {
        entities = entities.filter(e => e.type === "service_provider" || e.type === "marketplace_service");
      } else {
        entities = entities.filter(e => e.type === selectedType);
      }
    }

    if (searchQuery) {
      entities = entities.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return entities;
  };

  const handleApprove = async (entity) => {
    if (entity.type === 'event' && entity.event) {
      await approveEventMutation.mutateAsync(entity.id);
    } else if (entity.type === 'food_restaurant' && entity.restaurant) {
      await approveRestaurantMutation.mutateAsync(entity.id);
    } else if (entity.type === 'health_doctor' && entity.doctor) {
      await approveDoctorMutation.mutateAsync(entity.id);
    } else if (entity.type === 'realestate_property' && entity.property) {
      await approvePropertyMutation.mutateAsync(entity.id);
    } else if (entity.type === 'insurance_provider' && entity.provider) {
      await approveInsuranceProviderMutation.mutateAsync(entity.id);
    } else if (entity.type === 'service_provider' && entity.provider) {
      await approveServiceProviderMutation.mutateAsync(entity.id);
    } else if (entity.type === 'course' && entity.provider) {
      await approveCourseProviderMutation.mutateAsync(entity.id);
    } else if (entity.type === 'marketplace_service' && entity.service) {
      await approveServiceMutation.mutateAsync(entity.id);
    } else {
      approveEntity(entity.id);
    }
  };

  const handleReject = async () => {
    if (selectedEntity && rejectReason) {
      if (selectedEntity.type === 'event' && selectedEntity.event) {
        await rejectEventMutation.mutateAsync({ eventId: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'food_restaurant' && selectedEntity.restaurant) {
        await rejectRestaurantMutation.mutateAsync({ restaurantId: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'health_doctor' && selectedEntity.doctor) {
        await rejectDoctorMutation.mutateAsync({ doctorId: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'realestate_property' && selectedEntity.property) {
        await rejectPropertyMutation.mutateAsync({ propertyId: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'insurance_provider' && selectedEntity.provider) {
        await rejectInsuranceProviderMutation.mutateAsync({ id: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'service_provider' && selectedEntity.provider) {
        await rejectServiceProviderMutation.mutateAsync({ id: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'course' && selectedEntity.provider) {
        await rejectCourseProviderMutation.mutateAsync({ id: selectedEntity.id, reason: rejectReason });
      } else if (selectedEntity.type === 'marketplace_service' && selectedEntity.service) {
        await rejectServiceMutation.mutateAsync({ id: selectedEntity.id });
      } else {
        rejectEntity(selectedEntity.id, rejectReason);
      }
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedEntity(null);
    }
  };

  const handleBan = () => {
    if (selectedEntity && banReason) {
      banEntity(selectedEntity.id, banReason);
      setShowBanModal(false);
      setBanReason("");
      setSelectedEntity(null);
    }
  };

  const getFeatureInfo = (type) => {
    return FEATURES.find(f => f.type === type) || { name: type, icon: FileText, color: "bg-gray-100 text-gray-600" };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Gestion AfriWonder</h2>
              <p className="text-slate-300 text-sm">Approbation et modération des entités AfriWonder</p>
            </div>
          </div>
          <Badge variant="success" className="bg-green-500/20 text-green-400 border-green-500/30">
            Système actif
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card padding="md" className="bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{allPendingEntities.length}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </div>
          </div>
        </Card>
        
        <Card padding="md" className="bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stats.totalApproved}</p>
              <p className="text-xs text-gray-500">Approuvés</p>
            </div>
          </div>
        </Card>
        
        <Card padding="md" className="bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stats.totalBanned}</p>
              <p className="text-xs text-gray-500">Bannis</p>
            </div>
          </div>
        </Card>
        
        <Card padding="md" className="bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stats.totalSubscriptions}</p>
              <p className="text-xs text-gray-500">Abonnements</p>
            </div>
          </div>
        </Card>
        
        <Card padding="md" className="bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{stats.revenue.toLocaleString()} CFA</p>
              <p className="text-xs text-gray-500">Revenus</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Features Overview */}
      <Card padding="lg" className="bg-white">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Aperçu par catégorie
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {FEATURES.map(feature => {
            const isMarketplace = feature.type === 'marketplace';
            const pending = isMarketplace
              ? allPendingEntities.filter(e => e.type === 'service_provider' || e.type === 'marketplace_service').length
              : allPendingEntities.filter(e => e.type === feature.type).length;
            const approved = isMarketplace
              ? approvedEntities.filter(e => e.type === 'service_provider' || e.type === 'marketplace_service').length
              : approvedEntities.filter(e => e.type === feature.type).length;
            return (
              <button
                key={feature.type}
                onClick={() => setSelectedType(selectedType === feature.type ? "all" : feature.type)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedType === feature.type 
                    ? "ring-2 ring-blue-500 bg-blue-50" 
                    : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-gray-700 truncate">{feature.name}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {pending > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                      {pending}
                    </span>
                  )}
                  <span className="text-xs text-green-600 font-semibold">{approved}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Content */}
      <Card padding="lg" className="bg-white">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === "pending" 
                  ? "bg-yellow-100 text-yellow-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              En attente ({allPendingEntities.length})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === "approved" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Approuvés ({approvedEntities.length})
            </button>
            <button
              onClick={() => setActiveTab("banned")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === "banned" 
                  ? "bg-red-100 text-red-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Bannis ({bannedEntities.length})
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              icon={<DollarSign className="w-4 h-4" />}
              onClick={() => setShowSubscriptionModal(true)}
            >
              Abonnements
            </Button>
          </div>
        </div>

        {/* Entities List */}
        <div className="space-y-3">
          {filteredEntities().length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Aucune demande trouvée</p>
            </div>
          ) : (
            filteredEntities().map(entity => {
              const feature = getFeatureInfo(entity.type);
              return (
                <div
                  key={entity.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{entity.name}</h3>
                      <Badge variant={entity.status === "pending" ? "warning" : entity.status === "approved" ? "success" : "error"}>
                        {entity.status === "pending" ? "En attente" : entity.status === "approved" ? "Approuvé" : "Banni"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{entity.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entity.submittedAt)}
                      </span>
                      {entity.phone && <span>{entity.phone}</span>}
                      {entity.price && <span className="font-semibold text-green-600">{entity.price} CFA</span>}
                      {entity.event && entity.event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entity.event.location}
                        </span>
                      )}
                      {entity.restaurant && entity.restaurant.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entity.restaurant.address}
                        </span>
                      )}
                      {entity.doctor && (entity.doctor.phone || entity.doctor.clinic_address) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entity.doctor.clinic_address || entity.doctor.phone}
                        </span>
                      )}
                      {entity.property && (entity.property.address || entity.property.city) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[entity.property.address, entity.property.city].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeTab === "pending" && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          icon={<Check className="w-4 h-4" />}
                          onClick={() => handleApprove(entity)}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<X className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedEntity(entity);
                            setShowRejectModal(true);
                          }}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    
                    {activeTab === "approved" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<EyeOff className="w-4 h-4" />}
                          onClick={() => hideEntity(entity.id)}
                        >
                          Masquer
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Ban className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedEntity(entity);
                            setShowBanModal(true);
                          }}
                        >
                          Bannir
                        </Button>
                      </>
                    )}
                    
                    {activeTab === "banned" && (
                      <Button
                        variant="success"
                        size="sm"
                        icon={<UserCheck className="w-4 h-4" />}
                        onClick={() => unbanEntity(entity.id)}
                      >
                        Débannir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rejeter la demande"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir rejeter cette demande ? Cette action est irréversible.
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Motif du rejet</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Veuillez indiquer le motif du rejet..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowRejectModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="danger" 
              fullWidth 
              onClick={handleReject}
              disabled={!rejectReason}
            >
              Rejeter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Bannir l'utilisateur"
      >
        <div className="p-6 space-y-4">
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Cette action bannira définitivement cet utilisateur de la plateforme.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Motif du bannissement</label>
            <textarea
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              placeholder="Veuillez indiquer le motif du bannissement..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowBanModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="danger" 
              fullWidth 
              onClick={handleBan}
              disabled={!banReason}
            >
              Bannir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription Plans Modal */}
      <Modal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Plans d'abonnement"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div
                key={plan.id}
                className={`rounded-xl p-4 border-2 ${
                  plan.popular ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <Badge variant="info" className="mb-2">Plus populaire</Badge>
                )}
                <h3 className="font-bold text-gray-900">{plan.nameFr}</h3>
                <p className="text-2xl font-black text-gray-900">{plan.price === 0 ? "Gratuit" : `${plan.price.toLocaleString()} CFA`}</p>
                <p className="text-xs text-gray-500">{plan.duration} jours</p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="bg-orange-50 rounded-xl p-4">
            <h4 className="font-bold text-orange-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Paiement via Orange Money
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              Pour activer un abonnement, l&apos;utilisateur doit effectuer un paiement via Orange Money au numéro suivant:
            </p>
            <p className="text-xl font-black text-orange-900 mt-2">+223 70 00 00 00</p>
          </div>
          
          <Button fullWidth onClick={() => setShowSubscriptionModal(false)}>
            Fermer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
