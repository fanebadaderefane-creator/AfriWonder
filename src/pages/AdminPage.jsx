import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Calendar, Car, UtensilsCrossed, Stethoscope, Home, 
  Briefcase, GraduationCap, Heart, Users, Video, FileText,
  Check, X, EyeOff, Ban, AlertTriangle, DollarSign,
  Search, CheckCircle, Clock, BarChart3, UserCheck
} from "lucide-react";
import { Card } from "@/components/ui/CardWrapper";
import { Badge } from "@/components/ui/BadgeWrapper";
import { Button } from "@/components/ui/ButtonWrapper";
import { Modal } from "@/components/ui/Modal";
import { useAdmin, SUBSCRIPTION_PLANS } from "@/lib/admin-context";
import { api } from '@/api/expressClient';

const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase();

const FEATURES = [
  { type: "event", name: "Événements", icon: Calendar, color: "bg-purple-100 text-purple-600" },
  { type: "transport_driver", name: "Chauffeurs", icon: Car, color: "bg-blue-100 text-blue-600" },
  { type: "food_restaurant", name: "Restaurants", icon: UtensilsCrossed, color: "bg-blue-100 text-blue-600" },
  { type: "service_provider", name: "Prestataires", icon: Users, color: "bg-green-100 text-green-600" },
  { type: "health_doctor", name: "Santé", icon: Stethoscope, color: "bg-red-100 text-red-600" },
  { type: "realestate_property", name: "Immobilier", icon: Home, color: "bg-blue-100 text-blue-600" },
  { type: "insurance_provider", name: "Assurances", icon: Briefcase, color: "bg-indigo-100 text-indigo-600" },
  { type: "course", name: "Formations", icon: GraduationCap, color: "bg-cyan-100 text-cyan-600" },
  { type: "crowdfunding_campaign", name: "Crowdfunding", icon: Heart, color: "bg-pink-100 text-pink-600" },
  { type: "civic_petition", name: "Pétitions", icon: FileText, color: "bg-gray-100 text-gray-600" },
  { type: "civic_report", name: "Signalements", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-600" },
  { type: "ad", name: "Publicités", icon: Video, color: "bg-violet-100 text-violet-600" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { 
    pendingEntities, approvedEntities, bannedEntities,
    approveEntity, rejectEntity, hideEntity, banEntity, unbanEntity,
    getStats, subscriptions 
  } = useAdmin();
  
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        if (!u || u?.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
          navigate('/Home');
          return;
        }
        setUser(u);
      } catch (e) {
        navigate('/Home');
      }
    };
    getUser();
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = getStats();

  const filteredEntities = () => {
    let entities = [];
    
    if (activeTab === "pending") {
      entities = pendingEntities;
    } else if (activeTab === "approved") {
      entities = approvedEntities;
    } else {
      entities = bannedEntities;
    }

    if (selectedType !== "all") {
      entities = entities.filter(e => e.type === selectedType);
    }

    if (searchQuery) {
      entities = entities.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return entities;
  };

  const handleApprove = (entity) => {
    approveEntity(entity.id);
  };

  const handleReject = () => {
    if (selectedEntity && rejectReason) {
      rejectEntity(selectedEntity.id, rejectReason);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Admin AfriWonder</h1>
                <p className="text-slate-300 text-sm">Tableau de bord de gestion</p>
              </div>
            </div>
            <Badge variant="success" className="bg-green-500/20 text-green-400 border-green-500/30">
              Système actif
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card padding="md" className="bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.totalPending}</p>
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
      </div>

      {/* Features Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <Card padding="lg" className="bg-white">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Aperçu par catégorie
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-3">
            {FEATURES.map(feature => {
              const pending = pendingEntities.filter(e => e.type === feature.type).length;
              const approved = approvedEntities.filter(e => e.type === feature.type).length;
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
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
                En attente ({pendingEntities.length})
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
      </div>

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
          
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Paiement via Orange Money
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Pour activer un abonnement, l&apos;utilisateur doit effectuer un paiement via Orange Money au numéro suivant:
            </p>
            <p className="text-xl font-black text-blue-900 mt-2">+223 70 00 00 00</p>
          </div>
          
          <Button fullWidth onClick={() => setShowSubscriptionModal(false)}>
            Fermer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
