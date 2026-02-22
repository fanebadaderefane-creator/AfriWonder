import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Car, UtensilsCrossed, Stethoscope, Building2, Briefcase, GraduationCap, Calendar, Users } from "lucide-react";

const MODULE_ICONS = {
  providers: { icon: User, label: "Prestataire", color: "bg-amber-100 text-amber-800" },
  transport: { icon: Car, label: "Transport", color: "bg-blue-100 text-blue-800" },
  restaurants: { icon: UtensilsCrossed, label: "Restaurant", color: "bg-orange-100 text-orange-800" },
  health: { icon: Stethoscope, label: "Santé", color: "bg-teal-100 text-teal-800" },
  properties: { icon: Building2, label: "Immobilier", color: "bg-slate-100 text-slate-800" },
  jobs: { icon: Briefcase, label: "Emploi", color: "bg-indigo-100 text-indigo-800" },
  formations: { icon: GraduationCap, label: "Formation", color: "bg-emerald-100 text-emerald-800" },
  events: { icon: Calendar, label: "Événement", color: "bg-purple-100 text-purple-800" },
  crowdfunding: { icon: Users, label: "Crowdfunding", color: "bg-rose-100 text-rose-800" },
};

export default function CrossModuleSearch({ allData }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = (q) => {
    setQuery(q);
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    const lq = q.toLowerCase();

    const found = [];

    (allData.providers || []).forEach(p => {
      if (p.display_name?.toLowerCase().includes(lq) || p.user_email?.toLowerCase().includes(lq) || p.city?.toLowerCase().includes(lq)) {
        found.push({ module: "providers", name: p.display_name, sub: p.user_email, extra: p.city, id: p.id });
      }
    });
    (allData.transport || []).forEach(p => {
      if (p.driver_name?.toLowerCase().includes(lq) || p.city?.toLowerCase().includes(lq)) {
        found.push({ module: "transport", name: p.driver_name, sub: p.vehicle_type, extra: p.city, id: p.id });
      }
    });
    (allData.restaurants || []).forEach(r => {
      if (r.name?.toLowerCase().includes(lq) || r.city?.toLowerCase().includes(lq)) {
        found.push({ module: "restaurants", name: r.name, sub: r.cuisine_type, extra: r.city, id: r.id });
      }
    });
    (allData.health || []).forEach(h => {
      if (h.display_name?.toLowerCase().includes(lq) || h.specialty?.toLowerCase().includes(lq)) {
        found.push({ module: "health", name: h.display_name, sub: h.specialty, extra: h.city, id: h.id });
      }
    });
    (allData.properties || []).forEach(p => {
      if (p.title?.toLowerCase().includes(lq) || p.city?.toLowerCase().includes(lq)) {
        found.push({ module: "properties", name: p.title, sub: p.type, extra: p.city, id: p.id });
      }
    });
    (allData.jobs || []).forEach(j => {
      if (j.title?.toLowerCase().includes(lq) || j.company_name?.toLowerCase().includes(lq)) {
        found.push({ module: "jobs", name: j.title, sub: j.company_name, extra: j.city, id: j.id });
      }
    });
    (allData.formations || []).forEach(f => {
      if (f.title?.toLowerCase().includes(lq) || f.trainer_name?.toLowerCase().includes(lq)) {
        found.push({ module: "formations", name: f.title, sub: f.trainer_name, extra: f.category, id: f.id });
      }
    });
    (allData.events || []).forEach(e => {
      if (e.title?.toLowerCase().includes(lq) || e.city?.toLowerCase().includes(lq)) {
        found.push({ module: "events", name: e.title, sub: e.category, extra: e.city, id: e.id });
      }
    });
    (allData.crowdfunding || []).forEach(p => {
      if (p.title?.toLowerCase().includes(lq) || p.creator_name?.toLowerCase().includes(lq)) {
        found.push({ module: "crowdfunding", name: p.title, sub: p.creator_name, extra: p.city, id: p.id });
      }
    });

    setResults(found.slice(0, 20));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher dans tous les modules (prestataires, emplois, propriétés, formations…)"
          className="pl-12 h-12 rounded-xl text-base"
        />
      </div>

      {query.length >= 2 && (
        <div className="text-sm text-muted-foreground">{results.length} résultat{results.length !== 1 ? "s" : ""} trouvé{results.length !== 1 ? "s" : ""}</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((r, i) => {
            const mod = MODULE_ICONS[r.module] || { label: r.module, color: "bg-gray-100 text-gray-800", icon: User };
            const Icon = mod.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border hover:shadow-sm transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.sub} {r.extra ? `· ${r.extra}` : ""}</p>
                </div>
                <Badge className={`${mod.color} text-xs border-0`}>{mod.label}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">Aucun résultat pour "{query}"</div>
      )}
    </div>
  );
}
