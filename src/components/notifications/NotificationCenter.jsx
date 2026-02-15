import React from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, Package, Star, MessageCircle, DollarSign,
  Heart, UserPlus, CheckCheck, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const notificationIcons = {
  order: Package,
  order_status: Package,
  rating: Star,
  comment: MessageCircle,
  mention: MessageCircle,
  escrow: DollarSign,
  like: Heart,
  follow: UserPlus,
  tip: DollarSign
};

const notificationColors = {
  order: 'bg-blue-100 text-blue-600',
  order_status: 'bg-purple-100 text-purple-600',
  rating: 'bg-yellow-100 text-yellow-600',
  comment: 'bg-green-100 text-green-600',
  mention: 'bg-orange-100 text-orange-600',
  escrow: 'bg-emerald-100 text-emerald-600',
  like: 'bg-red-100 text-red-600',
  follow: 'bg-indigo-100 text-indigo-600',
  tip: 'bg-pink-100 text-pink-600'
};

export default function NotificationCenter({ isOpen, onClose, userId }) {
  const queryClient = useQueryClient();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      const data = result?.data || result;
      const list = data?.notifications ?? result?.notifications ?? result;
      return Array.isArray(list) ? list : [];
    },
    enabled: !!userId && isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  // Ensure notifications is always an array
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => api.notifications.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications marquées comme lues');
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    const base = window.location.origin + (window.location.pathname.includes('/Profile') ? '' : '/');
    if (notification.action_url) {
      window.location.href = notification.action_url.startsWith('http') ? notification.action_url : base + notification.action_url;
    } else if (notification.reference_type === 'order') {
      window.location.href = `${base}OrderTracking?id=${notification.reference_id}`;
    } else if (notification.reference_type === 'video') {
      window.location.href = `${base}VideoView?_videoId=${notification.reference_id}`;
    } else if (notification.reference_type === 'product') {
      window.location.href = `${base}Product?id=${notification.reference_id}`;
    } else if (notification.reference_type === '_user' || notification.reference_type === 'user') {
      window.location.href = `${base}Profile?_userId=${notification.reference_id}`;
    } else if (notification.from_user_id) {
      window.location.href = `${base}Profile?_userId=${notification.from_user_id}`;
    }
    onClose();
  };

  const formatDate = (n) => {
    const d = n.created_at || n.created_date;
    if (!d) return '';
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <SheetTitle className="text-lg">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge className="bg-orange-500 text-white">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-xs"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Tout lire
                </Button>
              )}
              <Link to={createPageUrl('NotificationSettings')} onClick={onClose}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 min-h-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
              <p className="font-medium text-gray-800 mb-1">Aucune notification</p>
              <p className="text-sm text-gray-500">Vous serez notifié des likes, commentaires et suivis</p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {notifications.map((notif, index) => {
                  const Icon = notificationIcons[notif.type] || Bell;
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notif.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full ${notificationColors[notif.type]} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.is_read ? 'font-semibold' : ''}`}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                            {notif.message || notif._message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(notif)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


