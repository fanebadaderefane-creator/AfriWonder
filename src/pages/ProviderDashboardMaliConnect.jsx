import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Eye, MessageCircle, Send, Star, Clock, CheckCircle, XCircle,
  Loader2, AlertTriangle, CreditCard, History, RefreshCw, Upload,
  Zap, Crown, Bell, Save, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const PLAN_CONFIG = {
  basic: { label: "Basic", icon: Zap, color: "bg-gray-500", price: "5 000 FCFA/mois" },
  pro: { label: "Pro", icon: Star, color: "bg-green-600", price: "15 000 FCFA/mois" },
  premium: { label: "Premium", icon: Crown, color: "bg-amber-500", price: "30 000 FCFA/mois" },
};

const PAYMENT_METHODS = [
  { id: "orange_money", label: "Orange Money", color: "bg-orange-500" },
  { id: "moov_money", label: "Moov Money", color: "bg-blue-600" },
  { id: "bank_card", label: "Carte bancaire", color: "bg-slate-700" },
];

export default function ProviderDashboardMaliConnect() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [renewPlan, setRenewPlan] = useState(null);
  const [payMethod, setPayMethod] = useState("orange_money");
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => { window.location.href = "/Landing"; });
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-provider-profile", user?.id],
    queryFn: () => api.providers.getByUserId(user?.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile && !profileForm) setProfileForm({ ...profile });
  }, [profile]);

  const { data: bookingsData = [] } = useQuery({
    queryKey: ["my-bookings-provider", profile?.id],
    queryFn: () => api.bookings.list({ providerId: profile?.id }),
    enabled: !!profile?.id,
  });

  const requests = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.bookings ?? []);

  const { data: reviewsData = [] } = useQuery({
    queryKey: ["my-reviews", profile?.id],
    queryFn: () => api.serviceReviews.getProviderReviews(profile?.id),
    enabled: !!profile?.id,
  });

  const reviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.reviews ?? []);

  const payments = [];

  const updateAvailability = async (value) => {
    await api.providers.update(profile.id, { availability: value });
    queryClient.invalidateQueries({ queryKey: ["my-provider-profile"] });
    toast.success("Disponibilité mise à jour");
  };

  const handleRequest = async (requestId, status) => {
    await api.bookings.updateStatus(requestId, status);
    queryClient.invalidateQueries({ queryKey: ["my-bookings-provider"] });
    toast.success(status === "accepted" ? "Demande acceptée" : "Demande déclinée");
  };

  const handleRenew = async () => {
    const planKey = renewPlan || profile.subscription_plan;
    const planConf = PLAN_CONFIG[planKey];
    const priceMap = { basic: 5000, pro: 15000, premium: 30000 };
    toast.success(`Demande de renouvellement ${planConf?.label} (${priceMap[planKey]?.toLocaleString()} FCFA) envoyée !`);
    setRenewPlan(null);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    await api.providers.update(profile.id, profileForm);
    queryClient.invalidateQueries({ queryKey: ["my-provider-profile"] });
    toast.success("Profil mis à jour !");
    setSavingProfile(false);
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const result = await api.upload.image(file);
        const file_url = result?.file_url ?? result?.url;
        if (file_url) setProfileForm((f) => ({ ...f, portfolio_urls: [...(f.portfolio_urls || []), file_url] }));
      } catch (_) {}
    }
    toast.success("Fichier(s) ajouté(s)");
  };

  if (!user || isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;

  if (!profile) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-lg font-medium mb-4">Vous n&apos;avez pas encore de profil prestataire.</p>
      <Button onClick={() => window.location.assign("/BecomeProvider")} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Créer mon profil</Button>
    </div>
  );

  const isSubExpired = profile.subscription_expires && new Date(profile.subscription_expires) < new Date();
  const daysLeft = profile.subscription_expires ? Math.max(0, Math.ceil((new Date(profile.subscription_expires) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const planConf = PLAN_CONFIG[profile.subscription_plan] || PLAN_CONFIG.basic;
  const PlanIcon = planConf.icon;
  const totalSpent = payments.filter((p) => p.status === "completed").reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Dashboard Prestataire</h1>
            <p className="text-muted-foreground">Bienvenue, {profile.display_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Disponibilité :</span>
          <Select value={profile.availability || "available"} onValueChange={updateAvailability}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">🟢 Disponible</SelectItem>
              <SelectItem value="busy">🟡 Occupé</SelectItem>
              <SelectItem value="unavailable">🔴 Indisponible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isSubExpired && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">Abonnement expiré</p>
            <p className="text-sm text-red-600">Votre profil n&apos;est plus visible. Renouvelez maintenant.</p>
          </div>
          <Button size="sm" onClick={() => setRenewPlan(profile.subscription_plan)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">Renouveler</Button>
        </div>
      )}
      {!isSubExpired && daysLeft <= 7 && daysLeft > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm flex-1">Votre abonnement expire dans <strong>{daysLeft} jour{daysLeft > 1 ? "s" : ""}</strong>.</p>
          <Button size="sm" onClick={() => setRenewPlan(profile.subscription_plan)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Renouveler</Button>
        </div>
      )}
      {!profile.is_verified && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-blue-800 text-sm">Votre profil est en cours de vérification par notre équipe.</p>
        </div>
      )}
      {profile.is_featured && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Star className="w-5 h-5 fill-amber-500 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 text-sm font-medium">🎉 Votre profil est actuellement mis en vedette !</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Vues", value: profile.total_views || 0, icon: Eye, color: "text-blue-600 bg-blue-50" },
          { label: "Demandes", value: profile.total_requests || requests.length, icon: Send, color: "text-green-600 bg-green-50" },
          { label: "Avis", value: profile.total_reviews || reviews.length, icon: MessageCircle, color: "text-purple-600 bg-purple-50" },
          { label: "Note", value: profile.average_rating?.toFixed(1) || "0.0", icon: Star, color: "text-amber-600 bg-amber-50" },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-6 h-6" /></div>
            <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="requests">Demandes {pendingRequests.length > 0 && <Badge className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5">{pendingRequests.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="reviews">Avis</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
          <TabsTrigger value="profile">Mon Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-3">
            {requests.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Aucune demande pour le moment</CardContent></Card>
            ) : requests.map((req) => (
              <div key={req.id} className="p-4 bg-white border rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-medium text-sm">{req.client_name || req.client_email || req.userId}</p>
                  <Badge className={req.status === "pending" ? "bg-yellow-100 text-yellow-800" : req.status === "accepted" || req.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {req.status === "pending" ? "En attente" : req.status === "accepted" || req.status === "confirmed" ? "Acceptée" : "Déclinée"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{req.description || req.notes}</p>
                <p className="text-xs text-muted-foreground">{new Date(req.created_date || req.createdAt).toLocaleDateString("fr-FR")}</p>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRequest(req.id, "accepted")} className="rounded-lg bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Accepter</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequest(req.id, "declined")} className="rounded-lg"><XCircle className="w-3.5 h-3.5 mr-1" /> Décliner</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Aucun avis pour le moment</CardContent></Card>
            ) : reviews.map((r) => (
              <div key={r.id} className="p-4 bg-white border rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{r.reviewer_name || r.userId || "Client"}</p>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><span className="font-medium text-sm">{r.rating}</span></div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_date || r.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Plan actuel</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${planConf.color}`}>
                    <PlanIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{planConf.label}</h3>
                      <Badge className={`${planConf.color} text-white`}>{planConf.price}</Badge>
                    </div>
                    <p className={`text-sm mt-1 ${isSubExpired ? "text-red-600 font-medium" : daysLeft <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                      {isSubExpired ? "Abonnement expiré" : `Expire le ${profile.subscription_expires ? new Date(profile.subscription_expires).toLocaleDateString("fr-FR") : "N/A"} (${daysLeft}j restants)`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Renouveler ou changer de plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(PLAN_CONFIG).map(([key, conf]) => {
                    const Icon = conf.icon;
                    const prices = { basic: 5000, pro: 15000, premium: 30000 };
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRenewPlan(key)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${renewPlan === key ? "border-amber-500 bg-amber-50 shadow-md" : "border-border hover:border-amber-300"}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${conf.color} mb-3`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-bold">{conf.label}</p>
                        <p className="text-xl font-bold mt-1">{prices[key].toLocaleString()} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span></p>
                        {key === profile.subscription_plan && <Badge variant="secondary" className="mt-2 text-xs">Plan actuel</Badge>}
                      </button>
                    );
                  })}
                </div>

                {renewPlan && (
                  <div className="p-5 bg-muted/50 rounded-2xl space-y-4">
                    <p className="font-medium">Méthode de paiement</p>
                    <div className="grid grid-cols-3 gap-3">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setPayMethod(m.id)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${payMethod === m.id ? "border-amber-500 bg-amber-50" : "border-border hover:border-amber-200"}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <Button onClick={handleRenew} className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payer {renewPlan === "basic" ? "5 000" : renewPlan === "pro" ? "15 000" : "30 000"} FCFA via {PAYMENT_METHODS.find((m) => m.id === payMethod)?.label}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><History className="w-5 h-5" /> Historique de facturation</span>
                <span className="text-sm font-normal text-muted-foreground">Total payé : {totalSpent.toLocaleString()} FCFA</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune transaction</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between flex-wrap gap-2 p-4 border rounded-xl hover:bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{p.description || `${p.payment_type} - ${p.module}`}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{new Date(p.created_date || p.createdAt).toLocaleDateString("fr-FR")}</span>
                          <span>·</span>
                          <span>{{ orange_money: "Orange Money", moov_money: "Moov Money", bank_card: "Carte", cash: "Espèces" }[p.payment_method] || p.payment_method}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{p.amount?.toLocaleString()} FCFA</span>
                        <Badge className={p.status === "completed" ? "bg-green-100 text-green-800" : p.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {p.status === "completed" ? "Validé" : p.status === "pending" ? "En attente" : "Échoué"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          {profileForm && (
            <Card>
              <CardHeader><CardTitle>Modifier mon profil</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom affiché</Label>
                    <Input value={profileForm.display_name || ""} onChange={(e) => setProfileForm((f) => ({ ...f, display_name: e.target.value }))} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={profileForm.phone || ""} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={profileForm.bio || ""} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} rows={4} className="mt-1.5 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tarif min (FCFA)</Label>
                    <Input type="number" value={profileForm.price_range_min ?? ""} onChange={(e) => setProfileForm((f) => ({ ...f, price_range_min: parseFloat(e.target.value) }))} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label>Tarif max (FCFA)</Label>
                    <Input type="number" value={profileForm.price_range_max ?? ""} onChange={(e) => setProfileForm((f) => ({ ...f, price_range_max: parseFloat(e.target.value) }))} className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label>Portfolio (images)</Label>
                  <label className="mt-1.5 flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Ajouter des fichiers</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioUpload} />
                  </label>
                  {profileForm.portfolio_urls?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {profileForm.portfolio_urls.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" onError={(e) => { e.target.style.display = "none"; }} />
                          <button type="button" onClick={() => setProfileForm((f) => ({ ...f, portfolio_urls: f.portfolio_urls.filter((_, j) => j !== i) }))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer les modifications
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
