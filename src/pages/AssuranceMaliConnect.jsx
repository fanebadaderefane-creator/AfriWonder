import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Landmark, MapPin, Phone, BadgeCheck, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ModuleHero from "@/components/common/ModuleHero";

export default function AssuranceMaliConnect() {
  const [search, setSearch] = useState("");

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["insurance-providers"],
    queryFn: () => api.insurance.providers.list(),
  });

  const filtered = (Array.isArray(providers) ? providers : []).filter((p) =>
    !search || p.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <ModuleHero
        title="Assurance"
        subtitle="Comparez et souscrivez aux meilleures assurances du Mali"
        icon={Landmark}
        gradient="from-sky-600 to-blue-700"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un assureur..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun assureur trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4 mb-4">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt="" className="w-14 h-14 rounded-xl object-contain border p-1" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
                      {p.company_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold truncate">{p.company_name}</h3>
                      {p.is_verified && <BadgeCheck className="w-4 h-4 text-sky-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {p.city}
                    </div>
                  </div>
                </div>

                {p.bio && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.bio}</p>}

                {p.insurance_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.insurance_types.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />{t}
                      </Badge>
                    ))}
                  </div>
                )}

                {p.products?.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {p.products.slice(0, 2).map((prod, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-sky-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{prod.name}</p>
                          <p className="text-xs text-muted-foreground">{prod.description}</p>
                        </div>
                        {prod.price_from && (
                          <span className="text-sm font-semibold text-sky-700 whitespace-nowrap ml-2">dès {prod.price_from?.toLocaleString()} FCFA</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Phone className="w-4 h-4" /> Contacter
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
