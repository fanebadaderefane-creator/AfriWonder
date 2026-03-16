import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from 'next-themes';
import { 
  ArrowLeft, Camera, User, Bell, Shield, Globe, Moon, Sun, Monitor,
  HelpCircle, LogOut, ChevronRight, Wifi, WifiOff, Smartphone, MapPin, ShieldCheck,
  Users, MonitorSmartphone, UserPlus, Activity, Gift, Plane, ShoppingBag, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/TranslationProvider";
import DataModeToggle from '../components/common/DataModeToggle';
import { useAuth } from '@/lib/AuthContext';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation(user?.language || 'fr');
  
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    dark_mode: false,
    data_mode: 'auto',
    language: 'fr',
    private_account: false,
    show_activity: true
  });

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    location: '',
    website: '',
    profile_image: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        setProfileData({
          full_name: u.full_name || '',
          bio: u.bio || '',
          location: u.location || '',
          website: u.website || '',
          profile_image: u.profile_image || ''
        });
        setSettings({
          ...settings,
          ...u.settings,
          data_mode: u.data_saver_mode ? 'lite' : (settings.data_mode || 'auto')
        });
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await api.auth.updateMe(profileData);
      toast.success('Profil mis à jour');
      
      // Invalider le cache des vidéos pour recharger avec les nouvelles données du créateur
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['profile-videos'] });
      
      // Recharger les données utilisateur
      const updatedUser = await api.auth.me();
      setUser(updatedUser);
      
      setActiveSection('main');
    } catch (_error) {
      toast.error('Erreur lors de la sauvegarde');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    // Nettoyer les tokens
    api.auth.logout();
    // Appeler la fonction logout du contexte auth pour mettre à jour l'état
    logout();
    // Rediriger vers Landing
    navigate(createPageUrl('Landing'), { replace: true });
  };

  const menuItems = [
    {
      id: 'profile',
      icon: User,
      label: t('editProfile'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'notifications',
      icon: Bell,
      label: t('notifications'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'privacy',
      icon: Shield,
      label: t('privacy'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'data',
      icon: Wifi,
      label: t('dataMode'),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: 'Adresses de livraison',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'closeFriends',
      icon: Users,
      label: 'Liste proches',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'followRequests',
      icon: UserPlus,
      label: 'Demandes de suivi',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'sessions',
      icon: MonitorSmartphone,
      label: 'Sessions actives',
      color: 'bg-gray-100 text-gray-600'
    },
    {
      id: 'activity',
      icon: Activity,
      label: 'Historique d\'activité',
      color: 'bg-emerald-100 text-emerald-600'
    },
    {
      id: 'loyalty',
      icon: Gift,
      label: 'Points fidélité',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'travelAlerts',
      icon: Plane,
      label: 'Alertes prix voyage',
      color: 'bg-sky-100 text-sky-600'
    },
    {
      id: 'messagingE2E',
      icon: Lock,
      label: 'Messagerie E2E (chiffrement)',
      color: 'bg-slate-100 text-slate-600'
    },
    {
      id: 'groupBuys',
      icon: ShoppingBag,
      label: 'Mes groupes d\'achat',
      color: 'bg-violet-100 text-violet-600'
    },
    {
      id: 'language',
      icon: Globe,
      label: t('language'),
      color: 'bg-cyan-100 text-cyan-600'
    },
    {
      id: 'appearance',
      icon: Moon,
      label: t('appearance'),
      color: 'bg-gray-100 text-gray-600'
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: t('help'),
      color: 'bg-yellow-100 text-yellow-600'
    },
  ];

  // Main settings screen — couleurs explicites pour PWA mobile (éviter texte blanc sur fond blanc)
  if (activeSection === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40 text-gray-900">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label="Retour"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-blue-900">{t('settings')}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4 text-gray-900">
          {/* User Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 flex items-center gap-4 text-gray-900"
          >
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-gray-900">{user?.full_name || 'Utilisateur'}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </motion.div>

          {/* Menu Items */}
          <div className="bg-white rounded-2xl overflow-hidden text-gray-900">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (item.id === 'language') {
                      navigate(createPageUrl('Language'));
                    } else if (item.id === 'help') {
                      navigate(createPageUrl('Help'));
                    } else if (item.id === 'notifications') {
                      navigate(createPageUrl('NotificationSettings'));
                    } else if (item.id === 'addresses') {
                      navigate(createPageUrl('Addresses'));
                    } else if (item.id === 'activity') {
                      navigate(createPageUrl('Activity'));
                    } else if (item.id === 'loyalty') {
                      navigate(createPageUrl('LoyaltyPoints'));
                    } else if (item.id === 'travelAlerts') {
                      navigate(createPageUrl('TravelAlerts'));
                    } else if (item.id === 'groupBuys') {
                      navigate(createPageUrl('GroupBuys'));
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-gray-900"
                >
                  <div className={`w-10 h-10 rounded-full shrink-0 ${item.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left font-medium text-gray-900">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </motion.button>
              );
            })}
          </div>

          {/* Admin - Centre de contrôle (réservé à l'email SUPER_ADMIN) */}
          {user?.email?.toLowerCase() === (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase() && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(createPageUrl('AdminDashboard'))}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-bold text-gray-800 block">Centre de contrôle</span>
                <span className="text-xs text-gray-500">Contrôle total AfriWonder</span>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-600" />
            </motion.button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl text-blue-600"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-medium text-blue-600">{t('logout')}</span>
          </button>

          {/* App version */}
          <p className="text-center text-gray-500 text-sm pt-4">
            Version 1.0.0 • Fabriqué en Afrique 🌍
          </p>
        </div>
      </div>
    );
  }

  // Edit Profile — couleurs explicites pour PWA mobile
  if (activeSection === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40 text-gray-900">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Modifier le profil</h1>
            <Button 
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full px-4"
            >
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6 text-gray-900">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileData.profile_image || user?.profile_image} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept={FILE_ACCEPT_IMAGES}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      toast.loading('Téléchargement...');
                      const result = await api.upload.image(file);
                      const file_url = result?.file_url || result?.data?.file_url;
                      if (!file_url) throw new Error('Pas d\'URL reçue');
                      await api.auth.updateMe({ profile_image: file_url });
                      
                      // Invalider les caches pour afficher la nouvelle photo partout
                      queryClient.invalidateQueries({ queryKey: ['videos'] });
                      queryClient.invalidateQueries({ queryKey: ['profile-videos'] });
                      queryClient.invalidateQueries({ queryKey: ['auth'] });
                      queryClient.invalidateQueries({ queryKey: ['follow-stats'] });
                      
                      // Recharger les données utilisateur
                      const updatedUser = await api.auth.me();
                      setUser(updatedUser);
                      setProfileData({ ...profileData, profile_image: file_url });
                      
                      toast.dismiss();
                      toast.success('Photo chargée');
                    } catch (_error) {
                      toast.dismiss();
                      toast.error('Erreur lors du téléchargement');
                    }
                  }
                }}
              />
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
              </label>
            </div>
            <label htmlFor="avatar-upload" className="mt-2 text-blue-600 font-medium text-sm cursor-pointer">
              Changer la photo
            </label>
          </div>

          {/* Form */}
          <div className="space-y-4 bg-white rounded-2xl p-4 text-gray-900">
            <div>
              <Label className="text-gray-700">Nom complet</Label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="mt-1 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 border border-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700">Bio</Label>
              <Textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Parlez de vous..."
                className="mt-1 rounded-xl h-24 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700">Localisation</Label>
              <Input
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                placeholder="Dakar, Sénégal"
                className="mt-1 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 border border-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700">Site web</Label>
              <Input
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                placeholder="https://..."
                className="mt-1 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 border border-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Appearance (CDC 5.1: Mode sombre optionnel) — couleurs explicites pour PWA mobile
  if (activeSection === 'appearance') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('appearance')}</h1>
          </div>
        </div>

        <div className="p-4 text-gray-900 dark:text-gray-100">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Choisir le thème de l&apos;application</p>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" />
                Clair
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" />
                Sombre
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setTheme('system')}
              >
                <Monitor className="w-4 h-4" />
                Système
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Data Mode — couleurs explicites pour PWA mobile
  if (activeSection === 'data') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40 text-gray-900">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Mode données</h1>
          </div>
        </div>

        <div className="p-4 text-gray-900">
          <DataModeToggle
            mode={settings.data_mode}
            onChange={async (mode) => {
              setSettings({ ...settings, data_mode: mode });
              try {
                await api.auth.updateMe({ data_saver_mode: mode === 'lite' });
                toast.success('Mode données mis à jour');
              } catch (_e) {
                toast.error('Erreur lors de la mise à jour');
              }
            }}
          />

          <div className="mt-6 bg-white rounded-2xl p-4 space-y-4 text-gray-900">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-900">Télécharger en WiFi uniquement</span>
                </div>
                <Switch className="data-[state=checked]:bg-blue-600 shrink-0" />
              </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="font-medium text-gray-900">Mode hors-ligne</span>
              </div>
              <Switch className="data-[state=checked]:bg-blue-600 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Liste proches (CPO 1.18)
  if (activeSection === 'closeFriends') {
    const { data: closeFriends = [], refetch: refetchClose } = useQuery({
      queryKey: ['close-friends', user?.id],
      queryFn: () => api.me.getCloseFriends(),
      enabled: !!user?.id,
    });
    const removeCloseMutation = useMutation({
      mutationFn: (friendId) => api.me.removeCloseFriend(friendId),
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['close-friends', user?.id] }); toast.success('Retiré de la liste'); },
      onError: () => toast.error('Erreur'),
    });
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-lg font-bold">Liste proches</h1>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">Les publications « Proches uniquement » ne sont visibles que par les personnes de cette liste.</p>
          <div className="bg-white rounded-2xl divide-y divide-gray-100">
            {closeFriends.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Aucun proche. Ajoutez des Wonderers depuis leur profil (menu → Ajouter aux proches).</p>
            ) : (
              closeFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 p-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.profile_image} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700">{(friend.full_name || friend.username || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{friend.full_name || friend.username}</p>
                    <p className="text-xs text-gray-500">@{friend.username}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeCloseMutation.mutate(friend.id)} disabled={removeCloseMutation.isPending}>Retirer</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Demandes de suivi (CPO 2.2)
  if (activeSection === 'followRequests') {
    const { data: requests = [], refetch: refetchReq } = useQuery({
      queryKey: ['follow-requests', user?.id],
      queryFn: () => api.me.getFollowRequests(),
      enabled: !!user?.id,
    });
    const acceptMutation = useMutation({
      mutationFn: (id) => api.me.acceptFollowRequest(id),
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['follow-requests', user?.id] }); toast.success('Demande acceptée'); },
      onError: () => toast.error('Erreur'),
    });
    const rejectMutation = useMutation({
      mutationFn: (id) => api.me.rejectFollowRequest(id),
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['follow-requests', user?.id] }); toast.success('Demande refusée'); },
      onError: () => toast.error('Erreur'),
    });
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-lg font-bold">Demandes de suivi</h1>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-2xl divide-y divide-gray-100">
            {requests.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Aucune demande en attente.</p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={req.requester?.profile_image} />
                    <AvatarFallback className="bg-amber-100 text-amber-700">{(req.requester?.full_name || req.requester?.username || 'U')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{req.requester?.full_name || req.requester?.username}</p>
                    <p className="text-xs text-gray-500">@{req.requester?.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => acceptMutation.mutate(req.id)} disabled={acceptMutation.isPending}>Accepter</Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(req.id)} disabled={rejectMutation.isPending}>Refuser</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sessions actives (CPO 1.22)
  if (activeSection === 'sessions') {
    const { data: sessions = [], refetch: refetchSessions } = useQuery({
      queryKey: ['me-sessions', user?.id],
      queryFn: () => api.me.getSessions(),
      enabled: !!user?.id,
    });
    const revokeMutation = useMutation({
      mutationFn: (id) => api.me.revokeSession(id),
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['me-sessions', user?.id] }); toast.success('Session révoquée'); },
      onError: () => toast.error('Erreur'),
    });
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-lg font-bold">Sessions actives</h1>
          </div>
        </div>
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">Appareils connectés à votre compte. Révoquez une session pour déconnecter cet appareil.</p>
          <div className="bg-white rounded-2xl divide-y divide-gray-100">
            {sessions.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Aucune session enregistrée.</p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><MonitorSmartphone className="w-5 h-5 text-gray-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{s.user_agent?.slice(0, 50) || 'Appareil'}</p>
                    <p className="text-xs text-gray-500">{s.last_seen ? new Date(s.last_seen).toLocaleString() : s.created_at ? new Date(s.created_at).toLocaleString() : ''}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => revokeMutation.mutate(s.id)} disabled={revokeMutation.isPending}>Révoquer</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // CPO 4.40 — Messagerie E2E (préférence ; chiffrement à venir)
  if (activeSection === 'messagingE2E') {
    const updateE2EMutation = useMutation({
      mutationFn: (enabled) => api.auth.updateMe({ messaging_e2e_enabled: enabled }),
      onSuccess: (_data, enabled) => {
        setUser((u) => (u ? { ...u, messaging_e2e_enabled: enabled } : u));
        toast.success(enabled ? 'E2E activé (préférence enregistrée)' : 'E2E désactivé');
      },
      onError: () => toast.error('Erreur'),
    });
    const e2eEnabled = !!user?.messaging_e2e_enabled;
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}><ArrowLeft className="w-6 h-6" /></Button>
            <h1 className="text-lg font-bold">Messagerie E2E</h1>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-slate-600" />
              <div>
                <p className="font-medium text-gray-900">Chiffrement de bout en bout</p>
                <p className="text-sm text-gray-500">Active la préférence E2E. L&apos;implémentation complète du chiffrement sera disponible dans une prochaine version.</p>
              </div>
            </div>
            <Switch
              checked={e2eEnabled}
              onCheckedChange={(v) => updateE2EMutation.mutate(v)}
              disabled={updateE2EMutation.isPending}
              className="data-[state=checked]:bg-blue-600 shrink-0"
            />
          </div>
        </div>
      </div>
    );
  }

  // Default fallback — couleurs explicites pour PWA mobile
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
      <Button onClick={() => setActiveSection('main')}>
        Retour aux paramètres
      </Button>
    </div>
  );
}

