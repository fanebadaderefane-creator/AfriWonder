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

  const { data: notificationsData, _refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const result = await api.notifications.list();
      // Handle different response formats
      if (Array.isArray(result)) {
        return result;
      } else if (result && Array.isArray(result.notifications)) {
        return result.notifications;
      } else if (result && result.data && Array.isArray(result.data.notifications)) {
        return result.data.notifications;
      }
      return [];
    },
    enabled: !!userId,
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Ensure notifications is always an array
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await api.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        api.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Toutes les notifications marquées comme lues');
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.reference_type === 'order') {
      window.location.href = `/OrderTracking?id=${notification.reference_id}`;
    } else if (notification.reference_type === 'video') {
      window.location.href = `/VideoView?id=${notification.reference_id}`;
    } else if (notification.reference_type === 'product') {
      window.location.href = `/Product?id=${notification.reference_id}`;
    } else if (notification.reference_type === '_user') {
      window.location.href = `/Profile?userId=${notification.reference_id}`;
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge className="bg-orange-500">{unreadCount}</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune notification</p>
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
                            {notif._message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notif.created_date), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
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


