import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Bell, Heart, MessageCircle, UserPlus, AtSign,
  Coins, ShoppingBag, Radio, Check, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

const NOTIFICATIONS_PAGE_BG = 'bg-[#060913]';
const NOTIFICATIONS_SURFACE = 'rounded-[28px] border border-white/8 bg-[#0b111d]/92 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-2xl';

const notificationIcons = {
  like: { icon: Heart, color: 'bg-red-500/20 text-red-300' },
  comment: { icon: MessageCircle, color: 'bg-blue-500/20 text-blue-300' },
  follow: { icon: UserPlus, color: 'bg-purple-500/20 text-purple-300' },
  mention: { icon: AtSign, color: 'bg-cyan-500/20 text-cyan-300' },
  tip: { icon: Coins, color: 'bg-yellow-500/20 text-yellow-300' },
  order: { icon: ShoppingBag, color: 'bg-green-500/20 text-green-300' },
  message: { icon: MessageCircle, color: 'bg-indigo-500/20 text-indigo-300' },
  live: { icon: Radio, color: 'bg-pink-500/20 text-pink-300' },
  system: { icon: Bell, color: 'bg-white/15 text-white/80' }
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

  // Fetch notifications (JWT côté API ; réponse { notifications, unreadCount, pagination })
  const { data: notificationsPayload } = useQuery({
    queryKey: ['all-notifications', user?.id],
    queryFn: () => api.notifications.list({ limit: 100 }),
    enabled: !!user?.id,
  });
  const notifications = notificationsPayload?.notifications ?? [];

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const rawDate = notification.created_at ?? notification.created_date;
    const date = new Date(rawDate);
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
    <div className={`min-h-screen text-white ${NOTIFICATIONS_PAGE_BG}`}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-[#060913]/88 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/82 hover:bg-white/[0.08]"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">Centre</p>
              <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/82">
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
                className="rounded-full border border-white/10 bg-white/[0.04] font-medium text-white/78 hover:bg-white/[0.08] hover:text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('NotificationSettings'))}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className={`py-16 text-center ${NOTIFICATIONS_SURFACE}`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Bell className="h-8 w-8 text-white/72" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Aucune notification
            </h3>
            <p className="text-white/56">
              Vos notifications apparaîtront ici
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-3 text-sm font-semibold text-white/48">{group}</h3>
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
                      className={`flex gap-3 rounded-[24px] border border-white/8 p-4 transition-colors shadow-[0_18px_54px_rgba(2,6,23,0.22)] backdrop-blur-xl ${
                        !notification.is_read ? 'bg-[#0f1728]/96' : 'bg-[#0b111d]/88'
                      }`}
                    >
                      <div className="relative">
                        <div className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/12 bg-gradient-to-br from-slate-600 to-slate-800">
                          {notification.from_user_avatar ? (
                            <img
                              src={notification.from_user_avatar}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                              {notification.from_user_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0b111d] ${config.color}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-semibold">{notification.from_user_name}</span>
                          {' '}{notification.message}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          {formatTime(notification.created_at ?? notification.created_date)}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-[#ff2f6d] mt-2 flex-shrink-0" />
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

