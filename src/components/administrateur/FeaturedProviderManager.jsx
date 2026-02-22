import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarOff } from "lucide-react";
import { toast } from "sonner";

export default function FeaturedProviderManager({ providers }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(null);

  const toggleFeatured = async (provider) => {
    setLoading(provider.id);
    await api.providers.update(provider.id, { is_featured: !provider.is_featured });
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    toast.success(provider.is_featured ? "Retiré des vedettes" : "Mis en vedette !");
    setLoading(null);
  };

  const featured = providers.filter(p => p.is_featured);
  const notFeatured = providers.filter(p => p.is_verified && !p.is_featured);

  return (
    <div className="space-y-6">
      {/* Currently featured */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Prestataires en vedette ({featured.length})
        </h4>
        {featured.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            Aucun prestataire en vedette
          </div>
        ) : (
          <div className="space-y-2">
            {featured.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                    {p.display_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">{p.city} · {p.subscription_plan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500" /> En vedette
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleFeatured(p)} disabled={loading === p.id} className="rounded-lg">
                    <StarOff className="w-3.5 h-3.5 mr-1" /> Retirer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available to feature */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Prestataires vérifiés ({notFeatured.length})
        </h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notFeatured.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-white border rounded-xl hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-green-600 flex items-center justify-center text-white font-bold text-xs">
                  {p.display_name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">{p.city} · Plan {p.subscription_plan}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => toggleFeatured(p)} disabled={loading === p.id} className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white">
                <Star className="w-3.5 h-3.5 mr-1" /> Mettre en vedette
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
