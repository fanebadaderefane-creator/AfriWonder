import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import ProviderCard from "@/components/common/ProviderCard";

async function fetchFavorites(userEmail) {
  if (!userEmail) return [];
  try {
    if (api.favorites?.list) return await api.favorites.list({ user_email: userEmail });
  } catch (_) {}
  return [];
}

async function fetchAllProviders() {
  const data = await api.providers.list({});
  return Array.isArray(data) ? data : (data?.providers ?? data?.data ?? []);
}

export default function Favorites() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => { window.location.href = "/Landing"; });
  }, []);

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => fetchFavorites(user?.email),
    enabled: !!user,
  });

  const providerIds = favorites.map((f) => f.provider_profile_id || f.providerId);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["fav-providers", providerIds],
    queryFn: async () => {
      if (providerIds.length === 0) return [];
      const all = await fetchAllProviders();
      return all.filter((p) => providerIds.includes(p.id));
    },
    enabled: !!user && providerIds.length > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["provider-categories"],
    queryFn: async () => {
      try {
        if (api.serviceCategories?.list) return await api.serviceCategories.list();
      } catch (_) {}
      return [];
    },
  });

  const categoryMap = {};
  categories.forEach((c) => { categoryMap[c.id] = c.name; });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Mes Favoris</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Aucun favori</p>
          <p className="text-muted-foreground">Ajoutez des prestataires à vos favoris pour les retrouver facilement</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} categoryName={categoryMap[p.category_id] || ""} />
          ))}
        </div>
      )}
    </div>
  );
}
