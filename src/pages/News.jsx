import React, { useState, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Search, TrendingUp, Eye, Heart, MessageCircle, AlertCircle, Globe, BookOpen, Settings
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const categories = [
  { id: 'all', label: 'Tous', icon: '📰' },
  { id: 'politique', label: 'Politique', icon: '🏛️' },
  { id: 'economie', label: 'Économie', icon: '📈' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'culture', label: 'Culture', icon: '🎭' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'environnement', label: 'Environnement', icon: '🌍' },
  { id: 'societe', label: 'Société', icon: '👥' }
];

const languages = [
  { id: '', label: 'Toutes langues' },
  { id: 'FR', label: 'Français' },
  { id: 'EN', label: 'English' },
  { id: 'AR', label: 'العربية' },
  { id: 'PT', label: 'Português' },
];

const categoryOptions = categories.filter((c) => c.id !== 'all');

export default function News() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [language, setLanguage] = useState('');
  const [useFeed, setUseFeed] = useState(false);
  const [prefCategories, setPrefCategories] = useState([]);
  const [prefCountry, setPrefCountry] = useState('');
  const [prefLanguage, setPrefLanguage] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: prefs } = useQuery({
    queryKey: ['news-preferences'],
    queryFn: () => api.news.getPreferences(),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (prefs) {
      setPrefCategories((prefs.preferred_categories || []) || []);
      setPrefCountry(prefs.preferred_country || '');
      setPrefLanguage(prefs.preferred_language || '');
    }
  }, [prefs]);

  const savePrefsMutation = useMutation({
    mutationFn: () => api.news.savePreferences({
      preferred_categories: prefCategories,
      preferred_country: prefCountry || undefined,
      preferred_language: prefLanguage || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['news-list'] });
      toast.success('Préférences enregistrées');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const togglePrefCategory = (id) => {
    setPrefCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const listQuery = useInfiniteQuery({
    queryKey: ['news-list', selectedCategory, searchQuery, language, useFeed, !!user],
    queryFn: async ({ pageParam = 1 }) => {
      if (useFeed && user) {
        return api.news.getFeed(pageParam, 20);
      }
      return api.news.list({
        page: pageParam,
        limit: 20,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        language: language || undefined,
        isPublished: true,
        orderBy: 'published_at',
        orderDir: 'desc',
      });
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage?.pagination ?? {};
      if (page >= totalPages) return undefined;
      return page + 1;
    },
    initialPageParam: 1,
    enabled: useFeed ? !!user : true,
  });

  const articles = listQuery.data?.pages?.flatMap((p) => p.articles ?? []) ?? [];
  const pagination = listQuery.data?.pages?.[listQuery.data.pages.length - 1]?.pagination ?? { page: 1, totalPages: 1, total: 0 };
  const hasNextPage = listQuery.hasNextPage;
  const fetchNextPage = listQuery.fetchNextPage;
  const isFetchingNextPage = listQuery.isFetchingNextPage;
  const isLoading = listQuery.isLoading;

  const loadMoreRef = useRef(null);
  const loadMoreObserver = useCallback(
    (node) => {
      if (isLoading || isFetchingNextPage) return;
      if (loadMoreRef.current) loadMoreRef.current.disconnect();
      loadMoreRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
        },
        { rootMargin: '200px', threshold: 0.1 }
      );
      if (node) loadMoreRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const { data: breaking = [] } = useQuery({
    queryKey: ['news-breaking'],
    queryFn: () => api.news.getBreaking(),
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['news-trending'],
    queryFn: () => api.news.getTrending(10),
  });

  const [prefsOpen, setPrefsOpen] = useState(false);

  const getTimeAgo = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const minutes = Math.floor((Date.now() - d) / 60000);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const articleUrl = (article) =>
    `${createPageUrl('ArticleDetails')}?id=${article.slug || article.id}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => window.history.back()} aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold flex-1">Actualités</h1>
          <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100" aria-label="Préférences">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Préférences du fil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-600">Catégories préférées (pour le fil &quot;Pour vous&quot;)</p>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => togglePrefCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm",
                        prefCategories.includes(cat.id) ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <Input
                    placeholder="Ex: ML, SN, CI"
                    value={prefCountry}
                    onChange={(e) => setPrefCountry(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                  <select
                    value={prefLanguage}
                    onChange={(e) => setPrefLanguage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Toutes</option>
                    {languages.filter((l) => l.id).map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { savePrefsMutation.mutate(); setPrefsOpen(false); }}
                  disabled={savePrefsMutation.isPending}
                >
                  {savePrefsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* Tabs: Liste | Feed */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setUseFeed(false)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              !useFeed ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            )}
          >
            Tous
          </button>
          <button
            onClick={() => setUseFeed(true)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1",
              useFeed ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" /> Pour vous
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {languages.map((lang) => (
            <button
              key={lang.id || 'all'}
              onClick={() => setLanguage(lang.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs whitespace-nowrap",
                language === lang.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breaking News */}
      {breaking.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-bold text-red-600">URGENT</span>
          </div>
          <div className="space-y-2">
            {breaking.map((article) => (
              <Link key={article.id} to={articleUrl(article)}>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <h3 className="font-bold text-sm">{article.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{getTimeAgo(article.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && !searchQuery && (
        <div className="px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-sm">Tendances</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {trending.slice(0, 5).map((article) => (
              <Link key={article.id} to={articleUrl(article)} className="flex-shrink-0 w-36">
                <div className="rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                  {article.featured_image ? (
                    <img src={article.featured_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">📰</div>
                  )}
                </div>
                <p className="text-xs font-medium mt-1 line-clamp-2">{article.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune actualité</p>
            {useFeed && !user && <p className="text-sm text-gray-400 mt-1">Connectez-vous pour voir votre feed personnalisé</p>}
            {useFeed && user && <p className="text-sm text-gray-400 mt-1">Remplissez vos préférences pour un feed personnalisé</p>}
          </div>
        ) : (
          <>
            {articles.map((article, index) => (
              <Link key={article.id} to={articleUrl(article)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {article.featured_image && (
                    <div className="relative aspect-video">
                      <img
                        src={article.featured_image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {article.is_verified && (
                          <Badge className="bg-blue-500 text-white border-0 text-xs">✓ Vérifié</Badge>
                        )}
                        {article.is_sponsored && (
                          <Badge className="bg-amber-500 text-white border-0 text-xs">Sponsorisé</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {categories.find((c) => c.id === article.category)?.icon} {categories.find((c) => c.id === article.category)?.label || article.category}
                      </Badge>
                      <span className="text-xs text-gray-500">{getTimeAgo(article.published_at || article.created_at)}</span>
                      {article.reading_time && (
                        <span className="text-xs text-gray-400">{article.reading_time} min</span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                    {(article.subtitle || article.excerpt) && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.subtitle || article.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={article.author?.profile_image || article.author_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                          alt={article.author_name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs text-gray-600">{article.author?.full_name || article.author_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(article.views || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{article.likes_count || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{article.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
            {hasNextPage && (
              <div ref={loadMoreObserver} className="py-6 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                    Charger plus
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
