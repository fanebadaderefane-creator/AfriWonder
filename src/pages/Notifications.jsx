import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, Bell, Heart, MessageCircle, UserPlus, AtSign,
  Coins, ShoppingBag, Radio, Check, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

const notificationIcons = {
  like: { icon: Heart, color: 'bg-red-100 text-red-500' },
  comment: { icon: MessageCircle, color: 'bg-blue-100 text-blue-500' },
  follow: { icon: UserPlus, color: 'bg-purple-100 text-purple-500' },
  mention: { icon: AtSign, color: 'bg-blue-100 text-blue-500' },
  tip: { icon: Coins, color: 'bg-yellow-100 text-yellow-600' },
  order: { icon: ShoppingBag, color: 'bg-green-100 text-green-500' },
  message: { icon: MessageCircle, color: 'bg-indigo-100 text-indigo-500' },
  live: { icon: Radio, color: 'bg-pink-100 text-pink-500' },
  system: { icon: Bell, color: 'bg-gray-100 text-gray-500' }
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate(createPageUrl('Home'));
      }
    };
    getUser();
  }, [navigate]);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: () => api.notifications.list({ user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => api.entities.Notification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-notifications']);
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key;
    if (date.toDateString() === today.toDateString()) {
      key = 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Hier';
    } else {
      key = 'Plus ancien';
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                className="text-blue-500 font-medium"
              >
                <Check className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('NotificationSettings'))}
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4 space-y-6">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Aucune notification
            </h3>
            <p className="text-gray-500">
              Vos notifications apparaîtront ici
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{group}</h3>
              <div className="space-y-2">
                {items.map((notification, index) => {
                  const config = notificationIcons[notification.type] || notificationIcons.system;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex gap-3 p-4 rounded-xl transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border border-blue-100' : 'bg-white'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={notification.from_user_avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                            {notification.from_user_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${config.color} flex items-center justify-center`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{notification.from_user_name}</span>
                          {' '}{notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_date)}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

