import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ModuleHero({ title, subtitle, icon: Icon, gradient, onSearch, searchPlaceholder }) {
  const [query, setQuery] = React.useState("");

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${gradient} py-14 px-4`}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative max-w-4xl mx-auto text-center text-white">
        {Icon && (
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-white" />
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        <p className="text-white/80 text-lg mb-8">{subtitle}</p>
        {onSearch && (
          <form
            onSubmit={(e) => { e.preventDefault(); onSearch(query); }}
            className="flex gap-3 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || "Rechercher..."}
                className="pl-12 h-12 rounded-2xl bg-white/95 border-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white">
              Chercher
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
