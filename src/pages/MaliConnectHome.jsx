import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar, Car, UtensilsCrossed, Stethoscope, Building2, Briefcase,
  GraduationCap, Newspaper, Users, Landmark, CreditCard, LayoutGrid,
  Search, ArrowRight, Star, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProviderCard from "@/components/common/ProviderCard";

const MODULES = [
  { name: "Événements", page: "Events", icon: Calendar, gradient: "from-purple-500 to-pink-500", desc: "Concerts, festivals & plus" },
  { name: "Transport", page: "TransportPage", icon: Car, gradient: "from-blue-500 to-cyan-500", desc: "Chauffeurs & véhicules" },
  { name: "Restauration", page: "Restaurants", icon: UtensilsCrossed, gradient: "from-orange-500 to-red-500", desc: "Restaurants & traiteurs" },
  { name: "Santé", page: "Health", icon: Stethoscope, gradient: "from-teal-500 to-green-500", desc: "Médecins & cliniques" },
  { name: "Immobilier", page: "RealEstate", icon: Building2, gradient: "from-slate-600 to-blue-700", desc: "Locations & ventes" },
  { name: "Emplois", page: "Jobs", icon: Briefcase, gradient: "from-indigo-500 to-violet-600", desc: "Offres & candidatures" },
  { name: "Formations", page: "Formations", icon: GraduationCap, gradient: "from-emerald-500 to-teal-600", desc: "Cours & certifications" },
  { name: "Actualités", page: "News", icon: Newspaper, gradient: "from-gray-700 to-gray-900", desc: "News & informations" },
  { name: "Crowdfunding", page: "Crowdfunding", icon: Users, gradient: "from-rose-500 to-pink-600", desc: "Financez des projets" },
  { name: "Assurance", page: "Insurance", icon: Landmark, gradient: "from-sky-500 to-blue-600", desc: "Comparateurs & souscriptions" },
  { name: "Microcrédit", page: "Microcredit", icon: CreditCard, gradient: "from-violet-600 to-purple-700", desc: "Crédits & financement" },
  { name: "Services", page: "Search", icon: LayoutGrid, gradient: "from-amber-500 to-green-600", desc: "Tous les prestataires" },
];

export default function MaliConnectHome() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-maliconnect"],
    queryFn: async () => {
      try {
        if (api.serviceCategories?.list) return await api.serviceCategories.list();
      } catch (_) {}
      return [];
    },
  });

  const { data: featuredProviders = [] } = useQuery({
    queryKey: ["featured-providers-maliconnect"],
    queryFn: async () => {
      const data = await api.providers.list({ limit: 6 });
      const list = Array.isArray(data) ? data : (data?.providers ?? data?.data ?? []);
      return list.filter((p) => p.is_verified && p.is_active !== false).slice(0, 6);
    },
  });

  const categoryMap = {};
  categories.forEach((c) => { categoryMap[c.id] = c.name; });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(createPageUrl("Search") + `?q=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-green-50 py-20 px-4">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100/80 text-amber-800 rounded-full text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              La super-app tout-en-un du Mali
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Tout ce dont vous avez
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-green-700"> besoin </span>
              en un seul endroit
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Services, emplois, santé, immobilier, formations, actualités et plus — connectés pour le Mali.
            </p>
            <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Que cherchez-vous ?"
                  className="pl-12 h-14 rounded-2xl text-base bg-white shadow-lg shadow-amber-100/50 border-0 focus-visible:ring-2 focus-visible:ring-amber-400"
                />
              </div>
              <Button type="submit" className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg">
                Chercher
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Nos Modules</h2>
            <p className="text-muted-foreground mt-2">Une plateforme complète pour tous vos besoins</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => (
              <motion.div key={mod.page} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <Link
                  to={createPageUrl(mod.page)}
                  className="group flex flex-col gap-3 p-5 rounded-2xl bg-white border border-border/50 hover:shadow-xl hover:shadow-amber-100/20 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <mod.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{mod.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all mt-auto" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {featuredProviders.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-gradient-to-b from-transparent to-amber-50/40">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">Prestataires en Vedette</h2>
                <p className="text-muted-foreground mt-2">Les professionnels les mieux notés</p>
              </div>
              <Link to={createPageUrl("Providers")}>
                <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hidden sm:flex">
                  Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProviders.map((p) => (
                <ProviderCard key={p.id} provider={p} categoryName={categoryMap[p.category_id] || ""} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-foreground to-gray-800 p-10 md:p-14 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Vous êtes un professionnel ?<br />
                  <span className="text-amber-400">Rejoignez AfriWonder !</span>
                </h2>
                <p className="mt-4 text-white/70 text-lg">Augmentez votre visibilité et trouvez de nouveaux clients.</p>
                <Link to={createPageUrl("BecomeProvider")}>
                  <Button className="mt-8 h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-base">
                    <Briefcase className="w-5 h-5 mr-2" /> Devenir Prestataire <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "12", l: "Modules" }, { v: "500+", l: "Prestataires" },
                  { v: "10K+", l: "Utilisateurs" }, { v: "4.8/5", l: "Note moyenne" }
                ].map((s, i) => (
                  <div key={i} className="bg-white/10 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{s.v}</div>
                    <div className="text-white/70 text-sm mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
