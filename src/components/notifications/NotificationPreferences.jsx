import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Gift, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    push_enabled: true,
    email_enabled: true,
    marketing_emails: false,
    transaction_notifications: true,
    order_updates: true,
    message_notifications: true,
    like_notifications: true,
    comment_notifications: true,
    gift_notifications: true,
    tip_notifications: true,
    live_notifications: true,
    community_updates: false
  });
  const queryClient = useQueryClient();

  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs) => {
      const user = await api.auth.me();
      const existing = await api.entities.NotificationPreference.filter({
        user_id: user.id
      });

      if (existing?.length > 0) {
        await api.entities.NotificationPreference.update(existing[0].id, prefs);
      } else {
        await api.entities.NotificationPreference.create({
          user_id: user.id,
          ...prefs
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Préférences sauvegardées');
    }
  });

  const handleToggle = (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    updatePreferencesMutation.mutate(updated);
  };

  const handleSaveAll = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const notificationGroups = [
    {
      title: 'Notifications générales',
      icon: Bell,
      settings: [
        { key: 'push_enabled', label: 'Notifications push' },
        { key: 'email_enabled', label: 'Emails de notification' }
      ]
    },
    {
      title: 'Transactions & Commandes',
      icon: Zap,
      settings: [
        { key: 'transaction_notifications', label: 'Mises à jour des transactions' },
        { key: 'order_updates', label: 'Mises à jour des commandes' }
      ]
    },
    {
      title: 'Messages & Engagement',
      icon: MessageSquare,
      settings: [
        { key: 'message_notifications', label: 'Nouveaux messages' },
        { key: 'like_notifications', label: 'Quelqu\'un aime mon contenu' },
        { key: 'comment_notifications', label: 'Nouveaux commentaires' }
      ]
    },
    {
      title: 'Cadeaux & Pourboires',
      icon: Gift,
      settings: [
        { key: 'gift_notifications', label: 'Cadeaux reçus' },
        { key: 'tip_notifications', label: 'Pourboires reçus' },
        { key: 'live_notifications', label: 'Spectateurs en direct' }
      ]
    },
    {
      title: 'Communauté',
      icon: MessageSquare,
      settings: [
        { key: 'community_updates', label: 'Mises à jour de la communauté' },
        { key: 'marketing_emails', label: 'Emails marketing' }
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-8">Préférences de notification</h1>

      <div className="space-y-6">
        {notificationGroups.map((group) => {
          const Icon = group.icon;
          return (
            <motion.div
              key={group.title}
              whileHover={{ y: -2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-orange-600" />
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.settings.map((setting) => (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <label className="font-semibold text-sm cursor-pointer">
                        {setting.label}
                      </label>
                      <Switch
                        checked={preferences[setting.key]}
                        onCheckedChange={() => handleToggle(setting.key)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex gap-2 justify-end">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
        >
          Retour
        </Button>
        <Button
          onClick={handleSaveAll}
          disabled={updatePreferencesMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Sauvegarder les modifications
        </Button>
      </div>
    </motion.div>
  );
}


