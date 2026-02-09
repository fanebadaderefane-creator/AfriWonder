import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PushNotificationService from '@/components/common/PushNotificationService';
import BottomNav from '../components/navigation/BottomNav';

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    orders: true,
    promotions: true,
    social: true,
    messages: true,
    lives: true,
    tips: true
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        await loadPreferences(u.id);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const loadPreferences = async (userId) => {
    try {
      const prefs = await PushNotificationService.getNotificationPreference(userId);
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (_error) {
      console.error('Erreur chargement préférences:', error);
    }
  };

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await PushNotificationService.updateNotificationPreference(user.id, preferences);
      toast.success('Préférences mises à jour');
    } catch (_error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      const hasPermission = await PushNotificationService.requestPermission();
      if (hasPermission) {
        await PushNotificationService.subscribeToPushNotifications(user.id);
        toast.success('Notifications push activées');
        handleToggle('push_enabled');
      }
    } catch (_error) {
      toast.error('Erreur lors de l\'activation des notifications');
    }
  };

  const settingCategories = [
    {
      title: 'Canaux de Communication',
      icon: Smartphone,
      settings: [
        {
          key: 'push_enabled',
          label: 'Notifications Push',
          description: 'Notifications en temps réel sur votre appareil'
        },
        {
          key: 'email_enabled',
          label: 'Email',
          description: 'Résumés et alertes par email'
        },
        {
          key: 'sms_enabled',
          label: 'SMS',
          description: 'Alertes critiques par SMS'
        }
      ]
    },
    {
      title: 'Types de Notifications',
      icon: Bell,
      settings: [
        {
          key: 'social',
          label: 'Activité Sociale',
          description: 'Likes, commentaires, suivis'
        },
        {
          key: 'messages',
          label: 'Messages Directs',
          description: 'Nouveaux messages privés'
        },
        {
          key: 'orders',
          label: 'Commandes',
          description: 'Mises à jour de vos commandes'
        },
        {
          key: 'promotions',
          label: 'Promotions',
          description: 'Offres spéciales et codes promo'
        },
        {
          key: 'lives',
          label: 'Lives',
          description: 'Quand vos créateurs abonnés publient un live'
        },
        {
          key: 'tips',
          label: 'Pourboires',
          description: 'Pourboires et cadeaux reçus'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Paramètres Notifications</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {settingCategories.map((category, idx) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
                <Icon className="w-5 h-5 text-orange-500" />
                <h2 className="font-semibold text-gray-800">{category.title}</h2>
              </div>

              <div className="divide-y divide-gray-50">
                {category.settings.map((setting) => (
                  <div
                    key={setting.key}
                    className="px-4 py-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{setting.label}</p>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <Switch
                      checked={preferences[setting.key]}
                      onChange={() => {
                        if (setting.key === 'push_enabled' && !preferences[setting.key]) {
                          handleEnablePush();
                        } else {
                          handleToggle(setting.key);
                        }
                      }}
                      className="ml-4"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3"
        >
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
          >
            {loading ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
