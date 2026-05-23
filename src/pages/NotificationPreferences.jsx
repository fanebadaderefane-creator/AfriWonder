import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Bell, Mail, MessageSquare, ShoppingBag, 
  Heart, Video, DollarSign, Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const notificationCategories = [
  {
    id: 'orders',
    icon: ShoppingBag,
    label: 'Commandes',
    description: 'Nouvelles commandes, mises à jour de statut'
  },
  {
    id: 'promotions',
    icon: Megaphone,
    label: 'Promotions',
    description: 'Offres spéciales, soldes, codes promo'
  },
  {
    id: 'social',
    icon: Heart,
    label: 'Social',
    description: 'Likes, commentaires, nouveaux abonnés'
  },
  {
    id: 'messages',
    icon: MessageSquare,
    label: 'Messages',
    description: 'Messages directs et conversations'
  },
  {
    id: 'lives',
    icon: Video,
    label: 'Lives',
    description: 'Lives des créateurs que vous suivez'
  },
  {
    id: 'tips',
    icon: DollarSign,
    label: 'Pourboires',
    description: 'Pourboires reçus de vos fans'
  }
];

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const prefs = await api.entities.NotificationPreference.filter({ user_id: user.id });
      if (prefs.length > 0) return prefs[0];
      
      // Create default preferences
      return api.entities.NotificationPreference.create({
        user_id: user.id,
        push_enabled: true,
        email_enabled: true,
        orders: true,
        promotions: true,
        social: true,
        messages: true,
        lives: true,
        tips: true
      });
    },
    enabled: !!user?.id
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates) => {
      await api.entities.NotificationPreference.update(preferences.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-preferences']);
      toast.success('Préférences mises à jour');
    }
  });

  const handleToggle = (field, value) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  if (isLoading || !preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Préférences de notification</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Global Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Canaux de notification</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label className="font-medium">Notifications push</Label>
                  <p className="text-sm text-gray-500">Sur votre appareil</p>
                </div>
              </div>
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <Label className="font-medium">Notifications email</Label>
                  <p className="text-sm text-gray-500">Par email</p>
                </div>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <Label className="font-medium">Notifications SMS</Label>
                  <p className="text-sm text-gray-500">Par SMS</p>
                </div>
              </div>
              <Switch
                checked={preferences.sms_enabled}
                onCheckedChange={(checked) => handleToggle('sms_enabled', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Category Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Types de notifications</h3>
          
          <div className="space-y-4">
            {notificationCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <Label className="font-medium">{category.label}</Label>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[category.id]}
                    onCheckedChange={(checked) => handleToggle(category.id, checked)}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p>
            💡 Astuce: Vous pouvez désactiver certaines notifications tout en gardant 
            les plus importantes activées pour ne rien manquer.
          </p>
        </div>
      </div>
    </div>
  );
}

