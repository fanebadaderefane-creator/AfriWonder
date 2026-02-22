import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Star, Users, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModuleHero from "@/components/common/ModuleHero";

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };
const FORMAT_LABELS = { online: "En ligne", presential: "Présentiel", hybrid: "Hybride" };
const FORMAT_COLORS = { online: "bg-blue-100 text-blue-800", presential: "bg-green-100 text-green-800", hybrid: "bg-purple-100 text-purple-800" };

async function fetchFormations() {
  try {
    if (api.formations?.list) return await api.formations.list();
  } catch (_) {}
  return [];
}

export default function Formations() {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [level, setLevel] = useState("all");

  const { data: formations = [], isLoading } = useQuery({
    queryKey: ["formations"],
    queryFn: fetchFormations,
  });

  const filtered = formations.filter((f) => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.category?.toLowerCase().includes(search.toLowerCase());
    const matchFormat = format === "all" || f.format === format;
    const matchLevel = level === "all" || f.level === level;
    return matchSearch && matchFormat && matchLevel;
  });

  return (
    <div>
      <ModuleHero
        title="Formations"
        subtitle="Développez vos compétences avec les meilleurs formateurs"
        icon={GraduationCap}
        gradient="from-emerald-600 to-teal-700"
        onSearch={setSearch}
        searchPlaceholder="Rechercher une formation, catégorie..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formats</SelectItem>
              {Object.entries(FORMAT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucune formation trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all group">
                <div className="relative h-44 bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">
                  {f.cover_url ? (
                    <img src={f.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-14 h-14 text-emerald-200" />
                    </div>
                  )}
                  <Badge className={`absolute top-3 right-3 ${FORMAT_COLORS[f.format]} border-0`}>{FORMAT_LABELS[f.format]}</Badge>
                  {f.is_free && <Badge className="absolute top-3 left-3 bg-green-500 text-white border-0">Gratuit</Badge>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1 line-clamp-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{f.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{LEVEL_LABELS[f.level]}</Badge>
                    {f.category && <Badge variant="outline">{f.category}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {f.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{f.duration}</span>}
                    {f.total_enrollments > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{f.total_enrollments}</span>}
                    {f.average_rating > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{f.average_rating.toFixed(1)}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-emerald-700">
                      {f.is_free ? "Gratuit" : `${f.price?.toLocaleString()} FCFA`}
                    </span>
                    <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">S'inscrire</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
