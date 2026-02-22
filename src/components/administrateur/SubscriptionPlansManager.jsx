import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Zap, Star, Crown } from "lucide-react";
import { toast } from "sonner";

const MODULES = ["Services", "Événements", "Transport", "Restauration", "Santé", "Immobilier", "Emplois", "Formations", "Actualités", "Crowdfunding", "Assurance", "Microcrédit"];
const TIER_CONFIG = {
  basic: { icon: Zap, color: "bg-gray-100 text-gray-700", label: "Basic" },
  pro: { icon: Star, color: "bg-green-100 text-green-700", label: "Pro" },
  premium: { icon: Crown, color: "bg-amber-100 text-amber-700", label: "Premium" },
};

export default function SubscriptionPlansManager() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: "", tier: "basic", name: "", price_monthly: "", features: [], commission_rate: "" });
  const [newFeature, setNewFeature] = useState("");

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => api.admin.getSubscriptionPlans(),
  });

  const savePlan = async () => {
    const data = {
      ...form,
      price_monthly: parseFloat(form.price_monthly) || 0,
      commission_rate: parseFloat(form.commission_rate) || 0,
    };
    if (editPlan) {
      await api.admin.updateSubscriptionPlan(editPlan.id, data);
      toast.success("Plan mis à jour !");
    } else {
      await api.admin.createSubscriptionPlan(data);
      toast.success("Plan créé !");
    }
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    setShowForm(false);
    setEditPlan(null);
    setForm({ module: "", tier: "basic", name: "", price_monthly: "", features: [], commission_rate: "" });
  };

  const deletePlan = async (id) => {
    await api.admin.deleteSubscriptionPlan(id);
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    toast.success("Plan supprimé");
  };

  const openEdit = (plan) => {
    setEditPlan(plan);
    setForm({ ...plan, price_monthly: String(plan.price_monthly), commission_rate: String(plan.commission_rate || "") });
    setShowForm(true);
  };

  const groupedByModule = {};
  plans.forEach(p => {
    if (!groupedByModule[p.module]) groupedByModule[p.module] = [];
    groupedByModule[p.module].push(p);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Plans d'abonnement par module</h3>
        <Button onClick={() => { setEditPlan(null); setForm({ module: "", tier: "basic", name: "", price_monthly: "", features: [], commission_rate: "" }); setShowForm(true); }}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      {Object.keys(groupedByModule).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
          <p>Aucun plan défini. Créez des plans pour chaque module.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByModule).map(([module, modulePlans]) => (
            <div key={module}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{module}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modulePlans.map(plan => {
                  const conf = TIER_CONFIG[plan.tier] || TIER_CONFIG.basic;
                  const Icon = conf.icon;
                  return (
                    <Card key={plan.id} className="relative">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${conf.color}`}>
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-semibold">{conf.label}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                          </div>
                        </div>
                        <p className="font-bold text-xl">{plan.price_monthly?.toLocaleString()} FCFA<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                        {plan.commission_rate > 0 && <p className="text-xs text-muted-foreground">Commission: {plan.commission_rate}%</p>}
                        {plan.features?.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {plan.features.map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editPlan ? "Modifier le plan" : "Nouveau plan d'abonnement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Module</Label>
                <Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Module" /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niveau</Label>
                <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nom du plan</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ex: Pro Services" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix mensuel (FCFA)</Label>
                <Input type="number" value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Commission (%)</Label>
                <Input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} className="mt-1.5 rounded-xl" placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Fonctionnalités</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Ajouter une fonctionnalité" className="rounded-xl"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newFeature.trim()) { setForm({ ...form, features: [...(form.features || []), newFeature.trim()] }); setNewFeature(""); } } }} />
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => { if (newFeature.trim()) { setForm({ ...form, features: [...(form.features || []), newFeature.trim()] }); setNewFeature(""); } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.features || []).map((f, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full">
                    {f}
                    <button onClick={() => setForm({ ...form, features: form.features.filter((_, j) => j !== i) })} className="ml-1.5 text-muted-foreground hover:text-foreground">×</button>
                  </Badge>
                ))}
              </div>
            </div>
            <Button onClick={savePlan} disabled={!form.module || !form.price_monthly} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
              {editPlan ? "Mettre à jour" : "Créer le plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
