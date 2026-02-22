import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, XCircle, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModuleHero from "@/components/common/ModuleHero";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800", icon: Clock },
  reviewing: { label: "En cours d'examen", className: "bg-blue-100 text-blue-800", icon: Clock },
  approved: { label: "Approuvé", className: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejeté", className: "bg-red-100 text-red-800", icon: XCircle },
  active: { label: "Actif", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  completed: { label: "Remboursé", className: "bg-gray-100 text-gray-800", icon: CheckCircle },
};

const CITIES = ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes", "Koulikoro", "Gao", "Tombouctou"];

export default function MicrocreditMaliConnect() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", purpose: "", duration_months: "", monthly_income: "", city: "", phone: "" });
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: listData = [], isLoading } = useQuery({
    queryKey: ["microcredit-my", user?.email],
    queryFn: () => api.microcredit.list({ status: undefined }),
    enabled: !!user,
  });

  const myRequests = Array.isArray(listData) ? listData : (listData?.requests ?? listData?.data ?? []).filter((r) => r.applicant_email === user?.email || r.userId === user?.id);

  const submitMutation = useMutation({
    mutationFn: () => api.microcredit.createRequest({
      amount: parseFloat(form.amount),
      purpose: form.purpose,
      repaymentPeriod: parseInt(form.duration_months) || 12,
      monthly_income: parseFloat(form.monthly_income),
      applicant_email: user.email,
      applicant_name: user.full_name || user.display_name,
      city: form.city,
      phone: form.phone,
    }),
    onSuccess: () => {
      toast.success("Demande soumise avec succès !");
      setShowForm(false);
      setForm({ amount: "", purpose: "", duration_months: "", monthly_income: "", city: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["microcredit-my"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur"),
  });

  return (
    <div>
      <ModuleHero
        title="Microcrédit"
        subtitle="Financez vos projets avec nos solutions de microcrédit"
        icon={CreditCard}
        gradient="from-violet-600 to-purple-700"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { title: "Montant", value: "10 000 - 2 000 000 FCFA", icon: "💰" },
            { title: "Durée", value: "1 à 36 mois", icon: "📅" },
            { title: "Délai de réponse", value: "48 à 72 heures", icon: "⚡" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border p-5 text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm text-muted-foreground">{item.title}</p>
              <p className="font-bold text-lg">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Mes Demandes</h2>
          <Button
            onClick={() => { if (!user) { window.location.href = "/Landing"; return; } setShowForm(!showForm); }}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Nouvelle demande
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Nouvelle demande de microcrédit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant souhaité (FCFA) *</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ex: 500000" />
                </div>
                <div>
                  <Label>Durée (mois) *</Label>
                  <Input type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ex: 12" />
                </div>
                <div>
                  <Label>Revenu mensuel (FCFA) *</Label>
                  <Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ex: 150000" />
                </div>
                <div>
                  <Label>Ville *</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 rounded-xl" placeholder="+223 XX XX XX XX" />
              </div>
              <div>
                <Label>Objet du crédit *</Label>
                <Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={3} className="mt-1.5 rounded-xl" placeholder="Décrivez l'utilisation du crédit..." />
              </div>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!form.amount || !form.purpose || !form.city || submitMutation.isPending}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white h-12"
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Soumettre ma demande
              </Button>
            </CardContent>
          </Card>
        )}

        {myRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">Aucune demande</p>
            <p className="text-muted-foreground text-sm">Cliquez sur &quot;Nouvelle demande&quot; pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map((req) => {
              const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConf.icon;
              return (
                <div key={req.id} className="bg-white rounded-2xl border p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{(req.amount ?? req.amount_requested)?.toLocaleString()} FCFA</h3>
                        <Badge className={statusConf.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConf.label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mt-1">{req.purpose}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{req.duration_months ?? req.repaymentPeriod} mois</p>
                      <p>{req.city}</p>
                    </div>
                  </div>
                  {req.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-xl text-sm">
                      <span className="font-medium">Note : </span>{req.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
