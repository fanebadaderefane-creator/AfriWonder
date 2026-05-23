import React from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, CheckCircle, Info, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRIORITY_CONFIG = {
  high: { icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200", badge: "bg-red-100 text-red-800" },
  medium: { icon: Info, color: "text-amber-600 bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800" },
  low: { icon: CheckCircle, color: "text-blue-600 bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800" },
};

const TYPE_LABELS = {
  new_provider: "Nouveau prestataire",
  expired_subscription: "Abonnement expiré",
  flagged_review: "Avis signalé",
  new_microcredit: "Nouvelle demande crédit",
  new_crowdfunding: "Nouveau projet crowdfunding",
  new_job: "Nouvelle offre emploi",
  overdue_payment: "Paiement en retard",
  general: "Général",
};

export default function NotificationCenter() {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.admin.getNotifications({ sort: "-created_date", limit: 50 }),
    refetchInterval: 30000,
  });

  const unread = notifications.filter(n => !n.is_read);

  const markRead = async (id) => {
    await api.admin.updateNotification(id, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const markAllRead = async () => {
    await Promise.all(unread.map(n => api.admin.updateNotification(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const deleteNotif = async (id) => {
    await api.admin.deleteNotification(id);
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold">Notifications</h3>
          {unread.length > 0 && (
            <Badge className="bg-red-500 text-white">{unread.length}</Badge>
          )}
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead} className="rounded-xl text-xs">
            <Check className="w-3.5 h-3.5 mr-1" /> Tout lire
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Aucune notification
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {notifications.map(n => {
            const conf = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.medium;
            const Icon = conf.icon;
            return (
              <div
                key={n.id}
                className={`relative flex gap-3 p-4 rounded-xl border transition-all ${
                  n.is_read ? "bg-white opacity-60" : conf.color
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] border-0 ${conf.badge}`}>{TYPE_LABELS[n.type] || n.type}</Badge>
                        {n.module && <span className="text-[10px] text-muted-foreground">{n.module}</span>}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.created_date).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!n.is_read && (
                        <button onClick={() => markRead(n.id)} className="p-1 hover:bg-white/50 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteNotif(n.id)} className="p-1 hover:bg-white/50 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
