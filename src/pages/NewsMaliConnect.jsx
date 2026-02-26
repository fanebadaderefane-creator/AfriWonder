import React, { useState } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Newspaper, Eye, Clock, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ModuleHero from "@/components/common/ModuleHero";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CAT_COLORS = {
  politics: "bg-red-100 text-red-800", economy: "bg-green-100 text-green-800",
  culture: "bg-blue-100 text-blue-800", sport: "bg-blue-100 text-blue-800",
  technology: "bg-purple-100 text-purple-800", health: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800"
};
const CAT_LABELS = {
  politics: "Politique", economy: "Économie", culture: "Culture",
  sport: "Sport", technology: "Technologie", health: "Santé", other: "Autre"
};

export default function NewsMaliConnect() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const queryClient = useQueryClient();

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ["news-maliconnect"],
    queryFn: () => api.news.list({ limit: 100 }),
  });

  const articles = Array.isArray(raw) ? raw : (raw?.articles ?? raw?.data ?? []);

  const filtered = articles.filter((a) => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || a.category === category;
    return matchSearch && matchCat;
  });

  const openArticle = async (article) => {
    setSelectedArticle(article);
    try {
      if (api.news.incrementViews) await api.news.incrementViews(article.id);
      else if (api.news.update) await api.news.update(article.id, { total_views: (article.total_views || 0) + 1 });
    } catch (_) {}
    queryClient.invalidateQueries({ queryKey: ["news-maliconnect"] });
  };

  const [featured, ...rest] = filtered;

  return (
    <div>
      <ModuleHero
        title="Actualités"
        subtitle="Les dernières nouvelles du Mali et du monde"
        icon={Newspaper}
        gradient="from-gray-800 to-gray-900"
        onSearch={setSearch}
        searchPlaceholder="Rechercher un article..."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${category === "all" ? "bg-foreground text-white" : "bg-muted hover:bg-muted/80"}`}
          >
            Tout
          </button>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${category === k ? "bg-foreground text-white" : "bg-muted hover:bg-muted/80"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featured && (
              <div
                onClick={() => openArticle(featured)}
                className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative h-72 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {featured.cover_url ? (
                    <img src={featured.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-gray-200" />
                    </div>
                  )}
                  {featured.is_premium && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />}
                  {featured.is_premium && (
                    <Badge className="absolute top-3 right-3 bg-blue-500 text-white border-0">
                      <Lock className="w-3 h-3 mr-1" /> Premium
                    </Badge>
                  )}
                  {featured.category && (
                    <Badge className={`absolute top-3 left-3 ${CAT_COLORS[featured.category]} border-0`}>{CAT_LABELS[featured.category]}</Badge>
                  )}
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2">{featured.title}</h2>
                  <p className="text-muted-foreground line-clamp-2">{featured.summary}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{featured.total_views || 0}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(featured.created_date || featured.createdAt), "d MMM yyyy", { locale: fr })}</span>
                    <span>{featured.author_name}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {rest.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => openArticle(a)}
                  className="flex gap-3 bg-white rounded-xl border p-3 hover:shadow-md transition-all cursor-pointer group"
                >
                  {a.cover_url && (
                    <img src={a.cover_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform" />
                  )}
                  <div className="min-w-0">
                    {a.category && <Badge className={`${CAT_COLORS[a.category]} text-xs mb-1 border-0`}>{CAT_LABELS[a.category]}</Badge>}
                    <h3 className="font-semibold text-sm line-clamp-2">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_date || a.createdAt), "d MMM", { locale: fr })}</p>
                  </div>
                </div>
              ))}
            </div>

            {rest.length > 5 && rest.slice(5).map((a) => (
              <div
                key={a.id}
                onClick={() => openArticle(a)}
                className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                {a.cover_url && (
                  <div className="h-40 overflow-hidden">
                    <img src={a.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4">
                  {a.category && <Badge className={`${CAT_COLORS[a.category]} text-xs mb-2 border-0`}>{CAT_LABELS[a.category]}</Badge>}
                  <h3 className="font-semibold line-clamp-2">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_date || a.createdAt), "d MMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedArticle.category && (
                    <Badge className={`${CAT_COLORS[selectedArticle.category]} border-0`}>{CAT_LABELS[selectedArticle.category]}</Badge>
                  )}
                  {selectedArticle.is_premium && (
                    <Badge className="bg-blue-500 text-white border-0"><Lock className="w-3 h-3 mr-1" />Premium</Badge>
                  )}
                </div>
                <DialogTitle className="text-xl leading-tight">{selectedArticle.title}</DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>{selectedArticle.author_name}</span>
                  <span>·</span>
                  <span>{format(new Date(selectedArticle.created_date || selectedArticle.createdAt), "d MMMM yyyy", { locale: fr })}</span>
                </div>
              </DialogHeader>
              {selectedArticle.cover_url && (
                <img src={selectedArticle.cover_url} alt="" className="w-full h-56 object-cover rounded-xl my-2" />
              )}
              {selectedArticle.is_premium ? (
                <div className="text-center py-8">
                  <Lock className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                  <p className="font-semibold">Article Premium</p>
                  <p className="text-muted-foreground text-sm mt-1">Abonnez-vous pour lire cet article</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl">S&apos;abonner</Button>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
