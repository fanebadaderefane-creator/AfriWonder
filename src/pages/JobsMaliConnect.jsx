import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, MapPin, Clock, Users, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ModuleHero from "@/components/common/ModuleHero";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CONTRACT_LABELS = { cdi: "CDI", cdd: "CDD", freelance: "Freelance", internship: "Stage", parttime: "Temps partiel" };
const CONTRACT_COLORS = { cdi: "bg-green-100 text-green-800", cdd: "bg-blue-100 text-blue-800", freelance: "bg-purple-100 text-purple-800", internship: "bg-blue-100 text-blue-800", parttime: "bg-gray-100 text-gray-800" };
const CITIES = ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes", "Koulikoro", "Gao", "Tombouctou"];

async function fetchJobs() {
  const data = await api.jobs.list({ limit: 200 });
  const jobs = data?.jobs ?? (Array.isArray(data) ? data : data?.data ?? []);
  return Array.isArray(jobs) ? jobs : [];
}

export default function JobsMaliConnect() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [contract, setContract] = useState("all");
  const [applyJob, setApplyJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs-maliconnect"],
    queryFn: fetchJobs,
  });

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchCity = city === "all" || j.city === city || j.location === city;
    const matchContract = contract === "all" || j.contract_type === contract || j.jobType === contract;
    return matchSearch && matchCity && matchContract;
  });

  const applyMutation = useMutation({
    mutationFn: () => api.jobs.apply(applyJob.id, coverLetter, user?.cvUrl || user?.resume_url),
    onSuccess: () => {
      toast.success("Candidature envoyée !");
      setApplyJob(null);
      setCoverLetter("");
      queryClient.invalidateQueries({ queryKey: ["jobs-maliconnect"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Erreur lors de l'envoi"),
  });

  return (
    <div>
      <ModuleHero
        title="Emplois"
        subtitle="Trouvez le job de vos rêves au Mali"
        icon={Briefcase}
        gradient="from-indigo-600 to-violet-600"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un poste, entreprise..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={contract} onValueChange={setContract}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les contrats</SelectItem>
              {Object.entries(CONTRACT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucune offre d'emploi trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((j) => (
              <div key={j.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{j.title}</h3>
                    <p className="text-blue-700 font-medium">{j.company_name || j.companyName}</p>
                  </div>
                  <Badge className={`${CONTRACT_COLORS[j.contract_type || j.jobType]} flex-shrink-0`}>{CONTRACT_LABELS[j.contract_type || j.jobType]}</Badge>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{j.city || j.location}</span>
                  {j.deadline && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Jusqu'au {new Date(j.deadline).toLocaleDateString("fr-FR")}</span>}
                  {j.total_applications > 0 && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{j.total_applications} candidats</span>}
                </div>

                {(j.salary_min || j.salary_max || j.salaryMin || j.salaryMax) && (
                  <p className="mt-2 font-semibold text-green-700">
                    {(j.salary_min ?? j.salaryMin)?.toLocaleString()} - {(j.salary_max ?? j.salaryMax)?.toLocaleString()} FCFA/mois
                  </p>
                )}

                {j.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{j.description}</p>}

                {j.requirements?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {j.requirements.slice(0, 4).map((r, i) => (
                      <Badge key={i} variant="secondary" className="text-xs rounded-full">{r}</Badge>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => { if (!user) { navigate("/Landing"); return; } setApplyJob(j); }}
                  className="w-full mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" /> Postuler
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!applyJob} onOpenChange={() => setApplyJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postuler : {applyJob?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">{applyJob?.company_name || applyJob?.companyName} · {applyJob?.city || applyJob?.location}</p>
            <div>
              <Label>Lettre de motivation</Label>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={5}
                placeholder="Présentez-vous et expliquez votre motivation..."
                className="mt-1.5 rounded-xl"
              />
            </div>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={!coverLetter.trim() || applyMutation.isPending}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer ma candidature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
