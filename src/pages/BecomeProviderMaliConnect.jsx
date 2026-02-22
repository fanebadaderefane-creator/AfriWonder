import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, ArrowRight, ArrowLeft, Plus, X, Loader2,
  CheckCircle, Star, Crown, Zap, Upload
} from "lucide-react";
import { toast } from "sonner";

const CITIES = ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes", "Koulikoro", "Gao", "Tombouctou", "Kidal", "Ménaka", "Taoudénit", "Kati", "Koutiala", "San", "Niono", "Bougouni"];
const VALUE_OTHER = "other";

const PLANS = [
  { id: "basic", name: "Basic", price: "5 000", icon: Zap, color: "from-gray-400 to-gray-500", features: ["Profil visible", "Jusqu'à 5 services", "Messagerie standard"] },
  { id: "pro", name: "Pro", price: "15 000", icon: Star, color: "from-green-500 to-emerald-600", popular: true, features: ["Meilleure visibilité", "Services illimités", "Badge Pro", "Statistiques avancées"] },
  { id: "premium", name: "Premium", price: "30 000", icon: Crown, color: "from-amber-500 to-orange-500", features: ["Visibilité maximale", "Mise en avant", "Badge Premium", "Support prioritaire", "Contacts prioritaires"] },
];

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Plomberie" },
  { id: "2", name: "Électricité" },
  { id: "3", name: "Ménage" },
  { id: "4", name: "Santé" },
  { id: "5", name: "Transport" },
  { id: "6", name: "Restauration" },
  { id: "7", name: "Autre" },
];

export default function BecomeProviderMaliConnect() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    bio: "",
    category_id: "",
    category_other_text: "",
    city: "",
    city_other: "",
    neighborhood: "",
    services_offered: [],
    certifications: [],
    price_range_min: "",
    price_range_max: "",
    subscription_plan: "basic",
  });
  const [newService, setNewService] = useState("");
  const [newCert, setNewCert] = useState("");
  const [portfolioFiles, setPortfolioFiles] = useState([]);

  useEffect(() => {
    api.auth.me()
      .then((u) => {
        setUser(u);
        setForm((f) => ({ ...f, display_name: u.full_name || u.display_name || u.username || "" }));
      })
      .catch(() => { window.location.href = "/Landing"; });
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["provider-categories"],
    queryFn: async () => {
      try {
        if (api.serviceCategories?.list) return await api.serviceCategories.list();
      } catch (_) {}
      return DEFAULT_CATEGORIES;
    },
  });

  const addService = () => {
    if (newService.trim()) {
      setForm({ ...form, services_offered: [...form.services_offered, newService.trim()] });
      setNewService("");
    }
  };

  const addCert = () => {
    if (newCert.trim()) {
      setForm({ ...form, certifications: [...form.certifications, newCert.trim()] });
      setNewCert("");
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const result = await api.upload.image(file);
        const file_url = result?.file_url ?? result?.url;
        if (file_url) setPortfolioFiles((prev) => [...prev, file_url]);
      } catch (_) {
        toast.error("Échec upload: " + (file.name || "fichier"));
      }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    const categoryId = form.category_id === VALUE_OTHER ? VALUE_OTHER : form.category_id;
    const categoryOtherText = (form.category_other_text || "").trim();
    const cityValue = form.city === VALUE_OTHER ? (form.city_other || "").trim() : form.city;
    const hasOtherPendingValidation = form.category_id === VALUE_OTHER || form.city === VALUE_OTHER;

    let bio = form.bio || "";
    if (form.category_id === VALUE_OTHER && categoryOtherText) {
      bio = (bio ? bio + "\n\n" : "") + `[Catégorie personnalisée - en attente validation AfriWonder] ${categoryOtherText}`;
    }
    if (form.city === VALUE_OTHER && form.city_other?.trim()) {
      bio = (bio ? bio + "\n\n" : "") + `[Ville précisée - en attente validation AfriWonder] ${form.city_other.trim()}`;
    }

    try {
      await api.providers.create({
        ...form,
        category_id: categoryId,
        category_other_text: form.category_id === VALUE_OTHER ? categoryOtherText : undefined,
        city: cityValue || form.city,
        bio,
        user_email: user.email,
        photo_url: user.photo_url || user.avatar_url || "",
        portfolio_urls: portfolioFiles,
        price_range_min: parseFloat(form.price_range_min) || 0,
        price_range_max: parseFloat(form.price_range_max) || 0,
        subscription_expires: expirationDate.toISOString().split("T")[0],
        is_verified: false,
        is_active: true,
        average_rating: 0,
        total_reviews: 0,
        total_views: 0,
        total_requests: 0,
        service_categories: form.category_id === VALUE_OTHER ? [VALUE_OTHER] : (form.category_id ? [form.category_id] : []),
      });
      await api.auth.updateMe({ role: "provider" });
      if (hasOtherPendingValidation) {
        toast.success("Profil créé ! Votre catégorie ou ville personnalisée sera validée par l'équipe AfriWonder.");
      } else {
        toast.success("Profil créé ! En attente de vérification par l'admin.");
      }
      navigate(createPageUrl("ProviderDashboard"));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Devenir Prestataire</h1>
        <p className="text-muted-foreground mt-2">Créez votre profil professionnel en quelques étapes</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= s ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-amber-500" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Informations de base</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom affiché *</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Téléphone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+223 XX XX XX XX" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Catégorie de service *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, category_other_text: v === VALUE_OTHER ? form.category_other_text : "" })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => (c.id || c.name) !== "other" && (c.id || "").toLowerCase() !== "autre").map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value={VALUE_OTHER}>Autres (soumis à validation AfriWonder)</SelectItem>
                </SelectContent>
              </Select>
              {form.category_id === VALUE_OTHER && (
                <div className="mt-2">
                  <Label className="text-muted-foreground">Précisez votre catégorie *</Label>
                  <Input
                    value={form.category_other_text}
                    onChange={(e) => setForm({ ...form, category_other_text: e.target.value })}
                    placeholder="Ex: Coiffure, Événementiel..."
                    className="mt-1.5 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Votre demande sera validée par l&apos;équipe AfriWonder.</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ville *</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v, city_other: v === VALUE_OTHER ? form.city_other : "" })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value={VALUE_OTHER}>Autres (préciser)</SelectItem>
                  </SelectContent>
                </Select>
                {form.city === VALUE_OTHER && (
                  <div className="mt-2">
                    <Label className="text-muted-foreground">Précisez votre ville *</Label>
                    <Input
                      value={form.city_other}
                      onChange={(e) => setForm({ ...form, city_other: e.target.value })}
                      placeholder="Nom de la ville"
                      className="mt-1.5 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Sera validé par l&apos;équipe AfriWonder.</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Quartier</Label>
                <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Bio / Présentation</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="mt-1.5 rounded-xl" placeholder="Décrivez votre activité..." />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={
                !form.display_name
                || !form.category_id
                || (form.category_id === VALUE_OTHER && !form.category_other_text.trim())
                || !form.city
                || (form.city === VALUE_OTHER && !form.city_other.trim())
              }
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              Continuer <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Services & Portfolio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Services proposés</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Ex: Cours de maths" className="rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())} />
                <Button type="button" variant="outline" onClick={addService} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.services_offered.map((s, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full px-3 py-1">
                    {s}
                    <button onClick={() => setForm({ ...form, services_offered: form.services_offered.filter((_, j) => j !== i) })} className="ml-2"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Certifications</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={newCert} onChange={(e) => setNewCert(e.target.value)} placeholder="Ex: Diplôme en comptabilité" className="rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())} />
                <Button type="button" variant="outline" onClick={addCert} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.certifications.map((c, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full px-3 py-1">
                    {c}
                    <button onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, j) => j !== i) })} className="ml-2"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tarif minimum (FCFA)</Label>
                <Input type="number" value={form.price_range_min} onChange={(e) => setForm({ ...form, price_range_min: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Tarif maximum (FCFA)</Label>
                <Input type="number" value={form.price_range_max} onChange={(e) => setForm({ ...form, price_range_max: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Portfolio (photos)</Label>
              <label className="mt-1.5 flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour ajouter des photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioUpload} />
              </label>
              {portfolioFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {portfolioFiles.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                      <button onClick={() => setPortfolioFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-center">Choisissez votre abonnement</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${form.subscription_plan === plan.id ? "ring-2 ring-amber-500 shadow-lg" : ""} ${plan.popular ? "relative" : ""}`}
                onClick={() => setForm({ ...form, subscription_plan: plan.id })}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600 text-white">Populaire</Badge>
                  </div>
                )}
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                    <plan.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-2xl font-bold mt-2">{plan.price} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span></p>
                  <ul className="mt-4 space-y-2 text-left">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Créer mon profil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
