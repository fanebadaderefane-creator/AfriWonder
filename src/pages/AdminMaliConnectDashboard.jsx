import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, Loader2, Shield, Star, Flag, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";
import StatsOverview from "@/components/administrateur/StatsOverview";
import CrossModuleSearch from "@/components/administrateur/CrossModuleSearch";
import NotificationCenter from "@/components/administrateur/NotificationCenter";
import SubscriptionPlansManager from "@/components/administrateur/SubscriptionPlansManager";
import PaymentsTable from "@/components/administrateur/PaymentsTable";
import FeaturedProviderManager from "@/components/administrateur/FeaturedProviderManager";

async function fetchAllProviders() {
  const data = await api.providers.list({ sort: "-created_date" });
  return Array.isArray(data) ? data : (data?.providers ?? data?.data ?? []);
}
async function fetchAllUsers() {
  const data = await api.admin.getUsers();
  return Array.isArray(data) ? data : (data?.users ?? []);
}
async function fetchEvents() {
  const data = await api.events.list({ is_published: true, sort: "date" });
  return Array.isArray(data) ? data : (data?.events ?? data?.data ?? []);
}
async function fetchTransport() {
  const data = await api.transport.rides.list({ limit: 500 });
  return data?.rides ?? data?.data ?? [];
}
async function fetchRestaurants() {
  const data = await api.food.restaurants.list({ limit: 500 });
  return data?.restaurants ?? data?.data ?? [];
}
async function fetchHealth() {
  const data = await api.health.doctors.list({ limit: 500 });
  return data?.doctors ?? data?.data ?? [];
}
async function fetchProperties() {
  const data = await api.properties.list({ limit: 500 });
  return data?.properties ?? data?.data ?? [];
}
async function fetchJobs() {
  const data = await api.jobs.list({ limit: 500 });
  const raw = data?.jobs ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}
async function fetchFormations() {
  try {
    if (api.formations?.list) return await api.formations.list();
  } catch (_) {}
  return [];
}
async function fetchNews() {
  const data = await api.news.list({ limit: 500 });
  return Array.isArray(data) ? data : (data?.articles ?? data?.data ?? []);
}
async function fetchCrowdfunding() {
  const data = await api.crowdfunding.list({ limit: 500 });
  return Array.isArray(data) ? data : (data?.campaigns ?? data?.data ?? []);
}
async function fetchMicrocredit() {
  const data = await api.microcredit.list({ limit: 500 });
  return Array.isArray(data) ? data : (data?.requests ?? data?.data ?? []);
}
async function fetchInsurance() {
  const data = await api.insurance.providers.list();
  return Array.isArray(data) ? data : (data?.providers ?? []);
}
async function fetchFlaggedReviews() {
  try {
    if (api.admin.getFlaggedReviews) return await api.admin.getFlaggedReviews();
  } catch (_) {}
  return [];
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      navigate("/Landing", { replace: true });
      return;
    }
    if (user?.role !== "admin") navigate("/", { replace: true });
  }, [user, isAuthenticated, isLoadingAuth, navigate]);

  const { data: allProviders = [] } = useQuery({ queryKey: ["admin-providers"], queryFn: fetchAllProviders, enabled: !!user });
  const { data: allUsers = [] } = useQuery({ queryKey: ["admin-users"], queryFn: fetchAllUsers, enabled: !!user });
  const { data: flaggedReviews = [] } = useQuery({ queryKey: ["admin-flagged"], queryFn: fetchFlaggedReviews, enabled: !!user });
  const { data: events = [] } = useQuery({ queryKey: ["admin-events"], queryFn: fetchEvents, enabled: !!user });
  const { data: transport = [] } = useQuery({ queryKey: ["admin-transport"], queryFn: fetchTransport, enabled: !!user });
  const { data: restaurants = [] } = useQuery({ queryKey: ["admin-restaurants"], queryFn: fetchRestaurants, enabled: !!user });
  const { data: health = [] } = useQuery({ queryKey: ["admin-health"], queryFn: fetchHealth, enabled: !!user });
  const { data: properties = [] } = useQuery({ queryKey: ["admin-properties"], queryFn: fetchProperties, enabled: !!user });
  const { data: jobs = [] } = useQuery({ queryKey: ["admin-jobs"], queryFn: fetchJobs, enabled: !!user });
  const { data: formations = [] } = useQuery({ queryKey: ["admin-formations"], queryFn: fetchFormations, enabled: !!user });
  const { data: news = [] } = useQuery({ queryKey: ["admin-news"], queryFn: fetchNews, enabled: !!user });
  const { data: crowdfunding = [] } = useQuery({ queryKey: ["admin-crowdfunding"], queryFn: fetchCrowdfunding, enabled: !!user });
  const { data: microcredit = [] } = useQuery({ queryKey: ["admin-microcredit"], queryFn: fetchMicrocredit, enabled: !!user });
  const { data: insurance = [] } = useQuery({ queryKey: ["admin-insurance"], queryFn: fetchInsurance, enabled: !!user });
  const { data: payments = [] } = useQuery({ queryKey: ["admin-payments"], queryFn: () => api.admin.getPayments({ limit: 100 }), enabled: !!user });
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.admin.getNotifications({ limit: 100 }),
    enabled: !!user,
  });

  const unreadNotifications = Array.isArray(notifications) ? notifications.filter((n) => !n.is_read) : [];
  const pendingProviders = allProviders.filter((p) => !p.is_verified);

  const verifyProvider = async (id) => {
    await api.providers.update(id, { is_verified: true });
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    toast.success("Prestataire vérifié !");
  };

  const rejectProvider = async (id) => {
    await api.providers.update(id, { is_active: false });
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    toast.success("Prestataire rejeté");
  };

  const deleteReview = async (id) => {
    await api.reviews.delete(id);
    queryClient.invalidateQueries({ queryKey: ["admin-flagged"] });
    toast.success("Avis supprimé");
  };

  const filteredProviders = allProviders.filter(
    (p) =>
      !searchTerm ||
      p.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allData = { providers: allProviders, transport, restaurants, health, properties, jobs, formations, events, crowdfunding };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-green-700" />
          <h1 className="text-2xl font-bold">Administration AfriWonder</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifications.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-700">
              <Bell className="w-4 h-4" />
              {unreadNotifications.length} alerte{unreadNotifications.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="search">Recherche globale</TabsTrigger>
          <TabsTrigger value="pending">
            En attente {pendingProviders.length > 0 && <Badge className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5">{pendingProviders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="providers">Prestataires</TabsTrigger>
          <TabsTrigger value="featured">Vedettes</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="plans">Plans & Abonnements</TabsTrigger>
          <TabsTrigger value="flagged">
            Signalés {flaggedReviews.length > 0 && <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5">{flaggedReviews.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Alertes {unreadNotifications.length > 0 && <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5">{unreadNotifications.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StatsOverview data={{ allUsers, allProviders, events, transport, restaurants, healthProviders: health, properties, jobs, formations, news, crowdfunding, microcredit, insurance, pendingProviders: pendingProviders.length, payments }} />
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle>Recherche multi-modules</CardTitle></CardHeader>
            <CardContent>
              <CrossModuleSearch allData={allData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingProviders.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Aucun prestataire en attente</CardContent></Card>
            ) : pendingProviders.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">{p.display_name?.[0]}</div>
                      )}
                      <div>
                        <h3 className="font-semibold">{p.display_name}</h3>
                        <p className="text-sm text-muted-foreground">{p.user_email}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary">{p.city}</Badge>
                          <Badge variant="secondary">{p.subscription_plan}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(p.created_date || p.createdAt).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => verifyProvider(p.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-1" /> Vérifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectProvider(p.id)} className="rounded-lg text-red-600 hover:text-red-700">
                        <XCircle className="w-4 h-4 mr-1" /> Rejeter
                      </Button>
                    </div>
                  </div>
                  {p.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>}
                  {p.services_offered?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.services_offered.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="providers">
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher..." className="pl-10 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            {filteredProviders.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-green-600 flex items-center justify-center text-white font-medium text-sm">{p.display_name?.[0]}</div>
                    <div>
                      <p className="font-medium text-sm">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">{p.city} · {p.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={p.is_verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {p.is_verified ? "Vérifié" : "En attente"}
                    </Badge>
                    {p.is_featured && <Badge className="bg-amber-100 text-amber-800"><Star className="w-3 h-3 mr-1 fill-amber-500" />Vedette</Badge>}
                    <Badge variant="outline">{p.subscription_plan}</Badge>
                    <span className="text-sm flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {p.average_rating?.toFixed(1) || "0.0"}
                    </span>
                    {!p.is_verified && (
                      <Button size="sm" onClick={() => verifyProvider(p.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-7 text-xs">
                        Vérifier
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured">
          <Card>
            <CardHeader><CardTitle>Gestion des prestataires en vedette</CardTitle></CardHeader>
            <CardContent>
              <FeaturedProviderManager providers={allProviders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Paiements & Transactions ({payments.length})</CardTitle></CardHeader>
            <CardContent>
              <PaymentsTable payments={payments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansManager />
        </TabsContent>

        <TabsContent value="flagged">
          <div className="space-y-3">
            {flaggedReviews.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Aucun avis signalé</CardContent></Card>
            ) : flaggedReviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-red-500" />
                      <p className="font-medium text-sm">{r.reviewer_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{r.rating}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => deleteReview(r.id)} className="rounded-lg flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="p-6">
              <NotificationCenter />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
