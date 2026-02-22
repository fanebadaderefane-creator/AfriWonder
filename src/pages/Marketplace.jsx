import React, { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Building2, ArrowRight, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProviderCard, { getProviderCardImageUrl } from "@/components/common/ProviderCard";
import { FICTITIOUS_FEATURED_PROVIDERS } from "@/data/marketplaceFictitiousProviders";

export default function MarketplacePage() {
  const navigate = useNavigate();

  const { data: categories = [] } = useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      try {
        if (api.serviceCategories?.list) return await api.serviceCategories.list();
      } catch (_) {}
      return [];
    },
  });

  const { data: providersData } = useQuery({
    queryKey: ["marketplace-featured-providers"],
    queryFn: async () => {
      const data = await api.providers.list({ limit: 12 });
      const raw = data?.data ?? data?.providers ?? data;
      const list = Array.isArray(raw) ? raw : [];
      return list.filter((p) => p.is_active !== false).slice(0, 12);
    },
  });

  const fromApi = providersData ?? [];
  const featuredProviders =
    fromApi.length > 0 ? fromApi : FICTITIOUS_FEATURED_PROVIDERS;
  const heroProviders = useMemo(() => featuredProviders.slice(0, 6), [featuredProviders]);
  const categoryMap = {};
  categories.forEach((c) => {
    categoryMap[c.id] = c.name;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const run = () => {
      heroProviders.forEach((provider) => {
        const src = getProviderCardImageUrl(provider);
        if (!src) return;
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = src;
      });
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timeoutId = window.setTimeout(run, 120);
    return () => window.clearTimeout(timeoutId);
  }, [heroProviders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Flèche de retour pour faciliter la navigation */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-foreground">Retour</span>
        </div>
        {/* Section : Prestataires en Vedette — comme sur les captures */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Prestataires en Vedette
              </h2>
              <p className="text-muted-foreground mt-1">
                Les professionnels les mieux notés
              </p>
            </div>
            <Link
              to={createPageUrl("Providers")}
              className="inline-flex items-center text-amber-700 hover:text-amber-800 font-medium"
            >
              Voir tout <ChevronRight className="w-4 h-4 ml-0.5 inline" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProviders.map((p, index) => (
              <ProviderCard
                key={p.id}
                provider={p}
                priority={index < 2}
                categoryName={
                  categoryMap[p.category_id] ||
                  p.category_name ||
                  p.service_category ||
                  ""
                }
              />
            ))}
          </div>
        </section>

        {/* CTA : Vous êtes un professionnel ? Rejoignez AfriWonder ! */}
        <section className="relative rounded-3xl bg-[#1f2937] to-gray-900 p-8 md:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Vous êtes un professionnel ?<br />
                <span className="text-orange-500">
                  Rejoignez AfriWonder !
                </span>
              </h2>
              <p className="mt-4 text-white/80 text-base md:text-lg">
                Augmentez votre visibilité et trouvez de nouveaux clients.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("BecomeProvider"))}
                className="mt-6 h-12 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium"
              >
                <Building2 className="w-5 h-5 mr-2" />
                Devenir Prestataire
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "12", l: "Modules" },
                { v: "500+", l: "Prestataires" },
                { v: "10K+", l: "Utilisateurs" },
                { v: "4.8/5", l: "Note moyenne" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-2xl p-4 text-center border border-gray-700/50"
                >
                  <div className="text-2xl font-bold text-orange-500">{s.v}</div>
                  <div className="text-white text-sm mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
