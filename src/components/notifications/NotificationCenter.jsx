import React from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, Package, Star, MessageCircle, DollarSign,
  Heart, UserPlus, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { usePageVisibility } from '@/hooks/usePageVisibility';

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
  order: 'bg-blue-500/20 text-blue-300',
  order_status: 'bg-purple-500/20 text-purple-300',
  rating: 'bg-yellow-500/20 text-yellow-300',
  comment: 'bg-green-500/20 text-green-300',
  mention: 'bg-cyan-500/20 text-cyan-300',
  escrow: 'bg-emerald-500/20 text-emerald-300',
  like: 'bg-red-500/20 text-red-300',
  follow: 'bg-indigo-500/20 text-indigo-300',
  tip: 'bg-pink-500/20 text-pink-300'
};

export default function NotificationCenter({ isOpen, onClose, userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isPageVisible = usePageVisibility();

  const sheetPollMs = 60000;

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      const data = result?.data || result;
      const list = data?.notifications ?? result?.notifications ?? result;
      return Array.isArray(list) ? list : [];
    },
    enabled: !!userId && isOpen,
    staleTime: sheetPollMs,
    refetchInterval: isOpen && isPageVisible ? sheetPollMs : false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    if (notification.action_url) {
      const actionUrl = String(notification.action_url);
      const isExternal = /^(https?:\/\/|mailto:|tel:)/i.test(actionUrl);
      if (isExternal) {
        window.location.assign(actionUrl);
      } else {
        navigate(actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`);
      }
    } else if (notification.reference_type === 'order') {
      navigate(`/OrderTracking?id=${notification.reference_id}`);
    } else if (notification.reference_type === 'video') {
      navigate(`/VideoView?_videoId=${notification.reference_id}`);
    } else if (notification.reference_type === 'product') {
      navigate(`/Product?id=${notification.reference_id}`);
    } else if (notification.reference_type === '_user' || notification.reference_type === 'user') {
      navigate(`/Profile?_userId=${notification.reference_id}`);
    } else if (notification.from_user_id) {
      navigate(`/Profile?_userId=${notification.from_user_id}`);
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
      <SheetContent side="right" className="flex w-full flex-col border-l border-white/10 bg-[#060913] p-0 text-white sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-white/8 px-4 pb-3 pr-12 pt-[max(0.75rem,calc(0.5rem+env(safe-area-inset-top,0px)))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-white/72" />
              <SheetTitle className="text-lg text-white">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge className="border border-white/12 bg-white/[0.06] text-white">{unreadCount}</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/78 hover:bg-white/[0.08] hover:text-white"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 min-h-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Bell className="w-8 h-8 text-white/72" />
              </div>
              <p className="font-medium text-white mb-1">Aucune notification</p>
              <p className="text-sm text-white/60">Vous serez notifié des likes, commentaires et suivis</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
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
                      className={`cursor-pointer p-4 transition-colors ${
                        !notif.is_read ? 'bg-white/[0.06]' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 ${notificationColors[notif.type]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-white ${!notif.is_read ? 'font-semibold' : ''}`}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-white/75 line-clamp-2 mt-0.5">
                            {notif.message || notif._message}
                          </p>
                          <p className="text-xs text-white/50 mt-1">
                            {formatDate(notif)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-[#ff2f6d] rounded-full flex-shrink-0 mt-2" />
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
