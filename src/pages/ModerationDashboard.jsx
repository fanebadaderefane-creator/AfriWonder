import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ModerationDashboard() {
  const [user, setUser] = useState(null);
  const [_selectedReport, setSelectedReport] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);

        if (currentUser.role !== "moderator" && currentUser.role !== "admin") {
          window.location.href = "/";
          return;
        }
      } catch (_error) {
        window.location.href = "/";
      }
    };

    fetchUser();
  }, []);

  // Fetch moderation stats
  const { data: stats } = useQuery({
    queryKey: ["moderationStats"],
    queryFn: async () => {
      const response = await fetch("/api/moderation/stats");
      return response.json();
    },
    refetchInterval: 30000
  });

  // Fetch pending reports
  const { data: reports } = useQuery({
    queryKey: ["pendingReports"],
    queryFn: async () => {
      const allReports = await api.entities.Moderation.filter({
        status: "pending"
      });
      return allReports || [];
    },
    refetchInterval: 30000
  });

  // Fetch active bans
  const { data: bans } = useQuery({
    queryKey: ["activeBans"],
    queryFn: async () => {
      const activeBans = await api.entities.UserBan.filter({
        is_active: true
      });
      return activeBans || [];
    }
  });

  // Review report mutation
  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/moderation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingReports"] });
      queryClient.invalidateQueries({ queryKey: ["moderationStats"] });
      setSelectedReport(null);
      toast.success("Rapport traité");
    }
  });

  // Ban user mutation
  const _banMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/moderation/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeBans"] });
      toast.success("Utilisateur banni");
    }
  });

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-600" />
            Tableau de bord de modération
          </h1>
          <p className="text-gray-600 mt-2">Gérez les rapports et les violations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Rapports en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  <div className="text-3xl font-bold">{stats?.stats?.pendingReports || 0}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Utilisateurs bannis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div className="text-3xl font-bold">{stats?.stats?.activeBans || 0}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Traités aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div className="text-3xl font-bold">{stats?.stats?.resolvedToday || 0}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Rapports ({reports?.length || 0})</TabsTrigger>
            <TabsTrigger value="bans">Bans ({bans?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-4">
              {reports && reports.length > 0 ? (
                reports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedReport(report)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {report.content_type} signalé
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              Raison: {report.reason}
                            </p>
                          </div>
                          <Badge
                            className={
                              report.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : report.severity === "high"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {report.severity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-4">
                          {report.description}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewMutation.mutate({
                                reportId: report.id,
                                action: "warn_user",
                                moderatorId: user.id,
                                notes: "Avertissement automatique"
                              });
                            }}
                          >
                            Avertir
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewMutation.mutate({
                                reportId: report.id,
                                action: "ban_user",
                                moderatorId: user.id,
                                notes: "Banni pour violation"
                              });
                            }}
                          >
                            Bannir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewMutation.mutate({
                                reportId: report.id,
                                action: "reject",
                                moderatorId: user.id,
                                notes: "Pas de violation détectée"
                              });
                            }}
                          >
                            Rejeter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    Aucun rapport en attente
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Bans Tab */}
          <TabsContent value="bans">
            <div className="space-y-4">
              {bans && bans.length > 0 ? (
                bans.map((ban) => (
                  <motion.div key={ban.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{ban.user_name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              Raison: {ban.reason}
                            </p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">
                            {ban.ban_type === "permanent_ban" ? "Permanent" : "Temporaire"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-4">{ban.description}</p>
                        {ban.ban_type === "temporary_suspension" && ban.expiry_date && (
                          <p className="text-xs text-gray-600 mb-4">
                            Expire: {new Date(ban.expiry_date).toLocaleDateString()}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Unban logic
                          }}
                        >
                          Débannir
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    Aucun ban actif
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

