import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Target, Calendar, MapPin, Loader2, Plus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ModuleHero from "@/components/common/ModuleHero";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const CAT_LABELS = { agriculture: "Agriculture", technology: "Technologie", health: "Santé", education: "Éducation", art: "Art", social: "Social", other: "Autre" };
const CAT_COLORS = { agriculture: "bg-green-100 text-green-800", technology: "bg-blue-100 text-blue-800", health: "bg-teal-100 text-teal-800", education: "bg-purple-100 text-purple-800", art: "bg-pink-100 text-pink-800", social: "bg-orange-100 text-orange-800", other: "bg-gray-100 text-gray-800" };

async function fetchProjects() {
  const data = await api.crowdfunding.list({ status: "active", limit: 100 });
  const list = Array.isArray(data) ? data : (data?.campaigns ?? data?.data ?? []);
  return list.filter((p) => p.is_active !== false && p.is_verified !== false);
}

export default function CrowdfundingMaliConnect() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [supportProject, setSupportProject] = useState(null);
  const [amount, setAmount] = useState("");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["crowdfunding-maliconnect"],
    queryFn: fetchProjects,
  });

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const contributeMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      await api.crowdfunding.contribute(supportProject.id, { amount: amt, phone: user?.phone || "" });
    },
    onSuccess: () => {
      toast.success("Merci pour votre soutien !");
      setSupportProject(null);
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["crowdfunding-maliconnect"] });
    },
  });

  return (
    <div>
      <ModuleHero
        title="Crowdfunding"
        subtitle="Soutenez les projets qui changent le Mali"
        icon={Users}
        gradient="from-rose-500 to-pink-600"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un projet..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setCategory("all")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${category === "all" ? "bg-foreground text-white" : "bg-muted hover:bg-muted/80"}`}>Tout</button>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setCategory(k)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${category === k ? "bg-foreground text-white" : "bg-muted hover:bg-muted/80"}`}>{v}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun projet trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const raised = p.raised_amount ?? p.current_amount ?? 0;
              const goal = p.goal_amount ?? p.goalAmount ?? 1;
              const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all">
                  <div className="relative h-44 bg-gradient-to-br from-rose-50 to-pink-100 overflow-hidden">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-14 h-14 text-rose-200" />
                      </div>
                    )}
                    {p.category && <Badge className={`absolute top-3 left-3 ${CAT_COLORS[p.category]} border-0`}>{CAT_LABELS[p.category]}</Badge>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold mb-1 line-clamp-2">{p.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      {p.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
                      {p.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(p.deadline), "d MMM", { locale: fr })}</span>}
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold text-rose-600">{raised?.toLocaleString()} FCFA</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>Objectif: {goal?.toLocaleString()} FCFA</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.backers_count || 0} soutiens</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => { if (!user) { navigate("/Landing"); return; } setSupportProject(p); }}
                      className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
                      size="sm"
                    >
                      Soutenir ce projet
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!supportProject} onOpenChange={() => setSupportProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soutenir : {supportProject?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Objectif : {(supportProject?.goal_amount ?? supportProject?.goalAmount)?.toLocaleString()} FCFA</p>
            <div className="grid grid-cols-3 gap-2">
              {[5000, 10000, 25000, 50000, 100000].map((a) => (
                <button key={a} onClick={() => setAmount(String(a))} className={`p-2 rounded-xl border text-sm font-medium transition-all ${amount === String(a) ? "border-rose-500 bg-rose-50 text-rose-700" : "hover:bg-muted"}`}>
                  {a.toLocaleString()} FCFA
                </button>
              ))}
            </div>
            <div>
              <Label>Montant personnalisé (FCFA)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 15000" className="mt-1.5 rounded-xl" />
            </div>
            <Button
              onClick={() => contributeMutation.mutate()}
              disabled={!amount || parseFloat(amount) <= 0 || contributeMutation.isPending}
              className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
            >
              {contributeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer le soutien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
