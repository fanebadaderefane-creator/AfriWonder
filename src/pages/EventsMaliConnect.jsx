import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, MapPin, Ticket, Clock, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModuleHero from "@/components/common/ModuleHero";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORY_COLORS = {
  concert: "bg-purple-100 text-purple-800",
  conference: "bg-blue-100 text-blue-800",
  sport: "bg-green-100 text-green-800",
  festival: "bg-orange-100 text-orange-800",
  wedding: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800"
};

const CATEGORY_LABELS = {
  concert: "Concert", conference: "Conférence", sport: "Sport",
  festival: "Festival", wedding: "Mariage", other: "Autre"
};

export default function EventsMaliConnect() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ["events-maliconnect"],
    queryFn: () => api.events.list({ is_published: true }),
  });

  const events = Array.isArray(raw) ? raw : (raw?.events ?? raw?.data ?? []);

  const filtered = events.filter((e) => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.city?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || e.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <ModuleHero
        title="Événements"
        subtitle="Découvrez les meilleurs événements au Mali"
        icon={Calendar}
        gradient="from-purple-600 to-pink-600"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un événement, ville..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
            <Link to={createPageUrl("CreateEvent")}><Plus className="w-4 h-4 mr-2" />Créer un événement</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun événement trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all group">
                <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                  {event.image_url ? (
                    <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="w-16 h-16 text-purple-200" />
                    </div>
                  )}
                  {event.is_free && (
                    <Badge className="absolute top-3 left-3 bg-green-500 text-white border-0">Gratuit</Badge>
                  )}
                  {event.category && (
                    <Badge className={`absolute top-3 right-3 ${CATEGORY_COLORS[event.category]}`}>
                      {CATEGORY_LABELS[event.category]}
                    </Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{event.title}</h3>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      {event.date ? format(new Date(event.date), "d MMM yyyy à HH:mm", { locale: fr }) : "Date à confirmer"}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {event.location || event.city}
                    </div>
                    {!event.is_free && event.ticket_price > 0 && (
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Ticket className="w-4 h-4" />
                        {event.ticket_price.toLocaleString()} FCFA
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                    Voir détails
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
