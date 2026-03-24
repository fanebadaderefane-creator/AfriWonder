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
  const featuredProviders = fromApi.length > 0 ? fromApi : FICTITIOUS_FEATURED_PROVIDERS;
  const heroProviders = useMemo(() => featuredProviders.slice(0, 6), [featuredProviders]);

  const marketplaceStats = useMemo(() => {
    const ratings = featuredProviders
      .map((p) => Number(p.average_rating))
      .filter((n) => Number.isFinite(n) && n > 0);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, n) => sum + n, 0) / ratings.length).toFixed(1)
      : null;
    const cityCount = new Set(
      featuredProviders.map((p) => (p.city || "").trim()).filter(Boolean)
    ).size;

    return [
      { v: String(categories.length || 0), l: "Categories" },
      { v: `${featuredProviders.length}+`, l: "Profils visibles" },
      { v: `${cityCount || 1}+`, l: "Villes couvertes" },
      { v: avgRating ? `${avgRating}/5` : "-", l: "Note moyenne" },
    ];
  }, [categories.length, featuredProviders]);

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
        img.loading = "lazy";
        img.fetchPriority = "low";
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
    <div className="min-h-screen bg-[#060913] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/82 hover:bg-white/[0.08]" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-white/72">Retour</span>
        </div>

        <section className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Prestataires en Vedette</h2>
              <p className="mt-1 text-white/56">Les professionnels les mieux notes</p>
            </div>
            <Link
              to={createPageUrl("Providers")}
              className="inline-flex items-center font-medium text-white/72 hover:text-white"
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

        <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[#0b111d]/92 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.34)] backdrop-blur-2xl md:p-12">
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-slate-500/8 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                Vous etes un professionnel ?<br />
                <span className="text-white/72">Rejoignez AfriWonder</span>
              </h2>
              <p className="mt-4 text-base text-white/68 md:text-lg">
                Augmentez votre visibilite et trouvez de nouveaux clients.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("BecomeProvider"))}
                className="mt-6 h-12 rounded-2xl bg-white px-6 font-medium text-slate-950 hover:bg-white/92"
              >
                <Building2 className="w-5 h-5 mr-2" />
                Devenir Prestataire
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {marketplaceStats.map((s, i) => (
                <div key={i} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
                  <div className="text-2xl font-bold text-white">{s.v}</div>
                  <div className="mt-1 text-sm text-white/68">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
