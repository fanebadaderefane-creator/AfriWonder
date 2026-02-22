import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, ArrowRight, Star, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function HeroSection({ onSearch }) {
  const [query, setQuery] = React.useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-green-50">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100/80 text-amber-800 rounded-full text-sm font-medium mb-6">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            La marketplace #1 au Mali
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight">
            Trouvez le prestataire
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-green-700"> idéal </span>
            pour vos besoins
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
            Connectez-vous avec les meilleurs professionnels du Mali. Cours, coaching, artisanat, services à domicile et bien plus.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-10 flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quel service recherchez-vous ?"
                className="pl-12 h-14 rounded-2xl text-base bg-white shadow-lg shadow-amber-100/50 border-0 focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </div>
            <Button
              type="submit"
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-200/50"
            >
              <Search className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Rechercher</span>
            </Button>
          </form>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">500+</div>
                <div className="text-xs text-muted-foreground">Prestataires</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">4.8/5</div>
                <div className="text-xs text-muted-foreground">Note moyenne</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">100%</div>
                <div className="text-xs text-muted-foreground">Vérifiés</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
