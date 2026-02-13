import React, { useState, useEffect } from 'react';
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
  HelpCircle, LogOut, ChevronRight, Wifi, WifiOff, Smartphone, MapPin, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/TranslationProvider";
import DataModeToggle from '../components/common/DataModeToggle';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

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
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'privacy',
      icon: Shield,
      label: t('privacy'),
      color: 'bg-green-100 text-green-600'
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
      color: 'bg-orange-100 text-orange-600'
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

  // Main settings screen
  if (activeSection === 'main') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold">{t('settings')}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* User Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 flex items-center gap-4"
          >
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-xl">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{user?.full_name || 'Utilisateur'}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.div>

          {/* Menu Items */}
          <div className="bg-white rounded-2xl overflow-hidden">
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
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
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
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-bold text-gray-800 block">Centre de contrôle</span>
                <span className="text-xs text-gray-500">Contrôle total AfriWonder</span>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-500" />
            </motion.button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl text-red-500"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-medium">{t('logout')}</span>
          </button>

          {/* App version */}
          <p className="text-center text-gray-400 text-sm pt-4">
            Version 1.0.0 • Fabriqué en Afrique 🌍
          </p>
        </div>
      </div>
    );
  }

  // Edit Profile
  if (activeSection === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold">Modifier le profil</h1>
            <Button 
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 rounded-full px-4"
            >
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileData.profile_image || user?.profile_image} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-2xl">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
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
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
              </label>
            </div>
            <label htmlFor="avatar-upload" className="mt-2 text-orange-500 font-medium text-sm cursor-pointer">
              Changer la photo
            </label>
          </div>

          {/* Form */}
          <div className="space-y-4 bg-white rounded-2xl p-4">
            <div>
              <Label>Nom complet</Label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Parlez de vous..."
                className="mt-1 rounded-xl h-24"
              />
            </div>
            <div>
              <Label>Localisation</Label>
              <Input
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                placeholder="Dakar, Sénégal"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label>Site web</Label>
              <Input
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                placeholder="https://..."
                className="mt-1 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Appearance (CDC 5.1: Mode sombre optionnel)
  if (activeSection === 'appearance') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold dark:text-white">{t('appearance')}</h1>
          </div>
        </div>

        <div className="p-4">
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

  // Data Mode
  if (activeSection === 'data') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold">Mode données</h1>
          </div>
        </div>

        <div className="p-4">
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

          <div className="mt-6 bg-white rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Télécharger en WiFi uniquement</span>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Mode hors-ligne</span>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Button onClick={() => setActiveSection('main')}>
        Retour aux paramètres
      </Button>
    </div>
  );
}

