import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Heart, MessageSquare, Share2, Gift } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function NotificationCenter() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
      } catch (_error) {
        console.error("Not authenticated");
      }
    };

    fetchUser();
  }, []);

  // Fetch notifications
  const { data: notifications, _refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const notifs = await api.entities.Notification.filter({
        user_id: user.id
      });
      return notifs?.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ) || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return api.entities.Notification.update(notificationId, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications?.filter(n => !n.is_read) || [];
      for (const notif of unread) {
        await api.entities.Notification.update(notif.id, {
          is_read: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Tous les messages sont lus");
    }
  });

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  const unread = notifications?.filter(n => !n.is_read) || [];
  const read = notifications?.filter(n => n.is_read) || [];

  // Group by type
  const _groupByType = (notifs) => {
    const groups = {};
    notifs?.forEach(n => {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    });
    return groups;
  };

  const getIcon = (type) => {
    const icons = {
      like: Heart,
      comment: MessageSquare,
      follow: Share2,
      message: Bell,
      live: Bell,
      order_update: Gift,
      course_update: Bell,
      community_invite: Share2
    };
    return icons[type] || Bell;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            Notifications
          </h1>
          {unread.length > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
            >
              Marquer tout comme lu
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="unread" className="space-y-6">
          <TabsList>
            <TabsTrigger value="unread">
              Non lus ({unread.length})
            </TabsTrigger>
            <TabsTrigger value="read">
              Lus ({read.length})
            </TabsTrigger>
          </TabsList>

          {/* Unread */}
          <TabsContent value="unread">
            {unread.length > 0 ? (
              <div className="space-y-3">
                {unread.map((notif) => {
                  const IconComponent = getIcon(notif.type);
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card
                        className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => markReadMutation.mutate(notif.id)}
                      >
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {notif.title}
                            </h3>
                            <p className="text-sm text-gray-700 mt-1">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <Badge className="bg-blue-600">Nouveau</Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune notification non lue</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Read */}
          <TabsContent value="read">
            {read.length > 0 ? (
              <div className="space-y-3">
                {read.map((notif) => {
                  const IconComponent = getIcon(notif.type);
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <IconComponent className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {notif.title}
                            </h3>
                            <p className="text-sm text-gray-700 mt-1">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notif.created_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Aucune notification
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

