import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Star, MapPin, Video, Loader2, BadgeCheck, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModuleHero from "@/components/common/ModuleHero";

const TYPE_LABELS = { doctor: "Médecin", clinic: "Clinique", pharmacy: "Pharmacie", dentist: "Dentiste", nurse: "Infirmier", other: "Autre" };
const CITIES = ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes", "Koulikoro", "Gao", "Tombouctou"];

export default function Health() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [type, setType] = useState("all");

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ["health-providers"],
    queryFn: () => api.health.doctors.list({ limit: 200 }),
  });

  const providers = raw?.doctors ?? (Array.isArray(raw) ? raw : raw?.data ?? []);

  const filtered = providers.filter((p) => {
    const matchSearch = !search || p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.specialty?.toLowerCase().includes(search.toLowerCase());
    const matchCity = city === "all" || p.city === city;
    const matchType = type === "all" || p.type === type;
    return matchSearch && matchCity && matchType;
  });

  return (
    <div>
      <ModuleHero
        title="Santé"
        subtitle="Consultez les meilleurs professionnels de santé au Mali"
        icon={Stethoscope}
        gradient="from-teal-500 to-green-600"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un médecin, spécialité..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun prestataire de santé trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-white text-xl font-bold">
                      {p.display_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold truncate">{p.display_name}</h3>
                      {p.is_verified && <BadgeCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.specialty}</p>
                    <Badge variant="secondary" className="mt-1">{TYPE_LABELS[p.type]}</Badge>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{p.address || p.city}</div>
                  {p.consultation_fee > 0 && <div className="font-medium text-foreground">{p.consultation_fee.toLocaleString()} FCFA / consultation</div>}
                  {p.teleconsultation && (
                    <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                      <Video className="w-3 h-3" /> Téléconsultation disponible
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${p.availability === "available" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-muted-foreground">{p.availability === "available" ? "Disponible" : "Indisponible"}</span>
                  </div>
                  {p.average_rating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{p.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <Button className="w-full mt-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white" size="sm">
                  <CalendarCheck className="w-4 h-4 mr-2" /> Prendre RDV
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
