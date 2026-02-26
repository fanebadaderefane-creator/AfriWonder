import React, { useState, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search, TrendingUp, Eye, Heart, MessageCircle, Bookmark, Share2,
  AlertCircle, Globe, BookOpen, Settings, ArrowLeft, PenSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/components/common/useTranslation';

// Catégories alignées avec le mockup (couleurs AfriWonder)
const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'politique', label: 'Politique' },
  { id: 'economie', label: 'Économie' },
  { id: 'technologie', label: 'Technologie' },
  { id: 'sante', label: 'Santé' },
  { id: 'sport', label: 'Sport' },
  { id: 'culture', label: 'Culture' },
  { id: 'international', label: 'International' },
];

const categoryOptions = CATEGORIES.filter((c) => c.id !== 'all');

// Id = code API, label = clé i18n ou texte. changeLanguage utilise fr, en, ar, pt.
const LANG_OPTIONS = [
  { id: '', code: null, labelKey: 'news_all_languages' },
  { id: 'FR', code: 'fr', labelKey: null, label: 'Français' },
  { id: 'EN', code: 'en', labelKey: null, label: 'English' },
  { id: 'AR', code: 'ar', labelKey: null, label: 'العربية' },
  { id: 'PT', code: 'pt', labelKey: null, label: 'Português' },
];

// Fallback data when API returns empty
const MOCK_FEATURED = {
  id: 'mock-featured-satellite',
  slug: 'mock-mali-satellite',
  title: 'Le Mali lance son premier satellite de communication',
  excerpt: 'Une étape historique pour la souveraineté numérique du pays.',
  category: 'technologie',
  featured_image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=450&fit=crop',
  author_name: 'Fatoumata Diallo',
  author: { full_name: 'Fatoumata Diallo', profile_image: null },
  published_at: '2025-02-15T10:00:00Z',
  views: 12450,
  likes_count: 0,
  comments_count: 0,
  _mock: true,
};

const MOCK_TRENDING = [
  {
    id: 'mock-economie-2025',
    slug: 'mock-economie-croissance',
    title: 'Croissance économique : le Mali vise 6% en 2025',
    excerpt: 'Le gouvernement présente son plan de développement économique ambitieux pour les prochaines années.',
    category: 'economie',
    featured_image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
    published_at: '2025-02-14T09:00:00Z',
    views: 8920,
    _mock: true,
  },
  {
    id: 'mock-sante-sikasso',
    slug: 'mock-sante-sikasso',
    title: 'Nouveau centre de santé inauguré à Sikasso',
    excerpt: 'Un centre de santé moderne ouvre ses portes pour servir 50 000 habitants de la région.',
    category: 'sante',
    featured_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
    published_at: '2025-02-13T14:00:00Z',
    views: 5670,
    _mock: true,
  },
  {
    id: 'mock-culture-festival',
    slug: 'mock-culture-festival',
    title: 'Festival sur le Niger 2025 : les dates dévoilées',
    excerpt: 'La 22e édition du festival se tiendra en février avec une programmation éclectique.',
    category: 'culture',
    featured_image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop',
    published_at: '2025-02-12T11:00:00Z',
    views: 4320,
    _mock: true,
  },
  {
    id: 'mock-sport-basket',
    slug: 'mock-sport-basket',
    title: 'Championnat national de basket : la finale à Bamako',
    excerpt: 'Les équipes de Bamako et Ségou s\'affrontent ce week-end pour le titre.',
    category: 'sport',
    featured_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop',
    published_at: '2025-02-11T08:00:00Z',
    views: 3100,
    _mock: true,
  },
  {
    id: 'mock-politique-gouvernement',
    slug: 'mock-politique-gouvernement',
    title: 'Conseil des ministres : focus sur l\'éducation et la jeunesse',
    excerpt: 'Plusieurs décrets adoptés pour renforcer l\'accès à l\'école et à la formation.',
    category: 'politique',
    featured_image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop',
    published_at: '2025-02-10T14:00:00Z',
    views: 5200,
    _mock: true,
  },
];

// Articles supplémentaires pour remplir la liste (mode mock)
const MOCK_LIST_ARTICLES = [
  {
    id: 'mock-intl-ue',
    slug: 'mock-intl-ue',
    title: 'Mali-UE : reprise du dialogue sur la coopération',
    excerpt: 'Une délégation européenne est attendue à Bamako dans les prochaines semaines.',
    category: 'international',
    featured_image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop',
    published_at: '2025-02-09T10:00:00Z',
    views: 4100,
    author_name: 'Ibrahim Keita',
    author: { full_name: 'Ibrahim Keita', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-tech-mobile',
    slug: 'mock-tech-mobile',
    title: 'Orange Mali renforce le réseau 4G dans les zones rurales',
    excerpt: 'Plus de 200 localités seront couvertes d\'ici la fin du trimestre.',
    category: 'technologie',
    featured_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    published_at: '2025-02-08T09:00:00Z',
    views: 6800,
    author_name: 'Aïcha Traoré',
    author: { full_name: 'Aïcha Traoré', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-sante-paludisme',
    slug: 'mock-sante-paludisme',
    title: 'Campagne de distribution de moustiquaires à Kayes',
    excerpt: 'Objectif : protéger 100 000 ménages avant la saison des pluies.',
    category: 'sante',
    featured_image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&h=300&fit=crop',
    published_at: '2025-02-07T16:00:00Z',
    views: 2900,
    author_name: 'Dr. Oumar Coulibaly',
    author: { full_name: 'Dr. Oumar Coulibaly', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-culture-musique',
    slug: 'mock-culture-musique',
    title: 'Salif Keïta en concert caritatif pour les déplacés',
    excerpt: 'La star malienne donnera un récital le 1er mars au Stade du 26-Mars.',
    category: 'culture',
    featured_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop',
    published_at: '2025-02-06T12:00:00Z',
    views: 9500,
    author_name: 'Kadiatou Sangaré',
    author: { full_name: 'Kadiatou Sangaré', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-economie-coton',
    slug: 'mock-economie-coton',
    title: 'Récolte cotonnière 2024-2025 : des résultats encourageants',
    excerpt: 'La filière dépasse les 700 000 tonnes malgré les aléas climatiques.',
    category: 'economie',
    featured_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    published_at: '2025-02-05T07:00:00Z',
    views: 3600,
    author_name: 'Mamadou Diarra',
    author: { full_name: 'Mamadou Diarra', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-sport-foot',
    slug: 'mock-sport-foot',
    title: 'Éliminatoires CAN 2026 : le Mali reçoit le Ghana',
    excerpt: 'Match décisif au Stade du 26-Mars samedi à 18h.',
    category: 'sport',
    featured_image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop',
    published_at: '2025-02-04T11:00:00Z',
    views: 12200,
    author_name: 'Seydou B. Koné',
    author: { full_name: 'Seydou B. Koné', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-politique-decentralisation',
    slug: 'mock-politique-decentralisation',
    title: 'Transfert de compétences aux collectivités : où en est-on ?',
    excerpt: 'Bilan de la décentralisation après deux ans d\'application de la nouvelle loi.',
    category: 'politique',
    featured_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    published_at: '2025-02-03T15:00:00Z',
    views: 4400,
    author_name: 'Fatou Diallo',
    author: { full_name: 'Fatou Diallo', profile_image: null },
    _mock: true,
  },
  {
    id: 'mock-intl-diaspora',
    slug: 'mock-intl-diaspora',
    title: 'Diaspora malienne : les transferts en hausse de 12 %',
    excerpt: 'Les envois d\'argent des Maliens de l\'étranger ont atteint un record en 2024.',
    category: 'international',
    featured_image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop',
    published_at: '2025-02-02T09:00:00Z',
    views: 5700,
    author_name: 'Assitan Haidara',
    author: { full_name: 'Assitan Haidara', profile_image: null },
    _mock: true,
  },
];

const MOCK_ARTICLES = [MOCK_FEATURED, ...MOCK_TRENDING];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCategoryLabel(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId;
}

export default function News() {
  const navigate = useNavigate();
  const { language: appLanguage, changeLanguage, t } = useTranslation();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [language, setLanguage] = useState(''); // filtre API (FR, EN, AR, PT, '')
  const [useFeed, setUseFeed] = useState(false);
  const [prefCategories, setPrefCategories] = useState([]);
  const [prefCountry, setPrefCountry] = useState('');
  const [prefLanguage, setPrefLanguage] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);
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
      setPrefCategories(prefs.preferred_categories || []);
      setPrefCountry(prefs.preferred_country || '');
      setPrefLanguage(prefs.preferred_language || '');
    }
  }, [prefs]);

  const savePrefsMutation = useMutation({
    mutationFn: () =>
      api.news.savePreferences({
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

  const apiArticles = listQuery.data?.pages?.flatMap((p) => p.articles ?? []) ?? [];
  const pagination = listQuery.data?.pages?.[listQuery.data.pages.length - 1]?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
  };
  const hasNextPage = listQuery.hasNextPage;
  const fetchNextPage = listQuery.fetchNextPage;
  const isFetchingNextPage = listQuery.isFetchingNextPage;
  const isLoading = listQuery.isLoading;

  const useMock = apiArticles.length === 0 && !isLoading;
  const featuredArticle = useMock ? MOCK_FEATURED : apiArticles[0];
  const trendingFromApi = useMock ? [] : (listQuery.data?.pages?.[0]?.articles ?? []).slice(1, 4);
  const trendingList = useMock ? MOCK_TRENDING : trendingFromApi;
  const listAfterFeatured = useMock ? MOCK_LIST_ARTICLES : apiArticles.length > 1 ? apiArticles.slice(1) : [];

  const { data: breaking = [] } = useQuery({
    queryKey: ['news-breaking'],
    queryFn: () => api.news.getBreaking(),
  });

  const { data: apiTrending = [] } = useQuery({
    queryKey: ['news-trending'],
    queryFn: () => api.news.getTrending(10),
  });

  const trendingToShow = useMock ? MOCK_TRENDING : apiTrending.slice(0, 5);

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

  const articleUrl = (article) =>
    `${createPageUrl('ArticleDetails')}?id=${article.slug || article.id}`;

  const handleArticleClick = (article) => {
    if (article._mock) {
      navigate(createPageUrl('ArticleDetails'), { state: { article } });
    } else {
      navigate(articleUrl(article));
    }
  };

  const handleShare = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    const url = article._mock
      ? window.location.origin + createPageUrl('News')
      : window.location.origin + articleUrl(article);
    navigator.clipboard.writeText(url).then(() => toast.success('Lien copié'));
  };

  const handleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success(t('news_bookmark_toast'));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header compact — comme capture 2, bandeau réduit */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl" aria-label="Retour">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('news_title')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">{t('news_subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user && (
                <Link
                  to={createPageUrl('PublishNews')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  <PenSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Publier</span>
                </Link>
              )}
              <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
                <DialogTrigger asChild>
                  <button
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                    aria-label="Préférences"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </DialogTrigger>
              <DialogContent className="max-w-sm">
<DialogHeader>
                <DialogTitle>{t('news_preferences')}</DialogTitle>
              </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-slate-600">Catégories préférées (fil &quot;Pour vous&quot;)</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => togglePrefCategory(cat.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium',
                          prefCategories.includes(cat.id)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
                    <Input
                      placeholder="Ex: ML, SN, CI"
                      value={prefCountry}
                      onChange={(e) => setPrefCountry(e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Langue</label>
                    <select
                      value={prefLanguage}
                      onChange={(e) => setPrefLanguage(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Toutes</option>
                      {LANG_OPTIONS.filter((l) => l.id != null && l.id !== '').map((l) => (
                        <option key={l.id} value={l.id}>{l.label ?? (l.labelKey ? t(l.labelKey) : l.id)}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                    onClick={() => {
                      savePrefsMutation.mutate();
                      setPrefsOpen(false);
                    }}
                    disabled={savePrefsMutation.isPending}
                  >
                    {savePrefsMutation.isPending ? t('news_saving') : t('news_save')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={t('news_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 bg-slate-50/50"
            />
          </div>

          {/* Tabs: Tous | Pour vous — couleurs AfriWonder (bleu) */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setUseFeed(false)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                !useFeed
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {t('news_all')}
            </button>
            <button
              onClick={() => setUseFeed(true)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors',
                useFeed
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <BookOpen className="w-4 h-4" /> {t('news_for_you')}
            </button>
          </div>

          {/* Categories — AfriWonder */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-200 hover:text-blue-700'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Langue — relié à la traduction globale (changeLanguage) */}
          <div className="flex items-center gap-2 overflow-x-auto pt-0.5 scrollbar-hide">
            <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {LANG_OPTIONS.map((lang) => {
              const isSelected = lang.code ? appLanguage === lang.code : (language === '' && appLanguage === 'fr');
              const label = lang.labelKey ? t(lang.labelKey) : (lang.label || lang.id);
              return (
                <button
                  key={lang.id || 'all'}
                  onClick={() => {
                    if (lang.code) {
                      changeLanguage(lang.code);
                      setLanguage(lang.id);
                    } else {
                      setLanguage('');
                    }
                  }}
                  className={cn(
                    'flex-shrink-0 px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors',
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breaking News — AfriWonder accent */}
      {breaking.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-blue-700">{t('news_urgent')}</span>
          </div>
          <div className="space-y-2">
            {breaking.map((article) => (
              <Link key={article.id} to={articleUrl(article)}>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-100">
                  <h3 className="font-bold text-sm text-slate-900">{article.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(article.published_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 mt-3">{t('loading')}</p>
          </div>
        ) : (
          <>
            {/* Message exemples si mock */}
            {useMock && (
              <p className="text-sm text-slate-500 mb-4 text-center">
                {t('news_example_message')}
              </p>
            )}

            {/* Article à la une (grande carte) */}
            {featuredArticle && !searchQuery && (
              <div className="mb-8">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleArticleClick(featuredArticle)}
                  onKeyDown={(e) => e.key === 'Enter' && handleArticleClick(featuredArticle)}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md hover:shadow-lg transition-shadow block text-left"
                >
                  <div className="relative aspect-[16/9] bg-slate-200">
                    {(featuredArticle.featured_image || featuredArticle.cover_image) && (
                      <img
                        src={featuredArticle.featured_image || featuredArticle.cover_image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
                        {getCategoryLabel(featuredArticle.category)}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h2 className="text-xl font-bold line-clamp-2 mb-2">
                        {featuredArticle.title}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-white/90">
                        <span>{featuredArticle.author?.full_name || featuredArticle.author_name}</span>
                        <span>{formatDate(featuredArticle.published_at)}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {(featuredArticle.views || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section Tendances — AfriWonder */}
            {trendingToShow.length > 0 && !searchQuery && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-slate-900">{t('news_trends')}</h3>
                </div>
                <div className="space-y-4">
                  {trendingToShow.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleArticleClick(article)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleArticleClick(article)}
                      className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                    >
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200">
                        {(article.featured_image || article.cover_image) ? (
                          <img
                            src={article.featured_image || article.cover_image}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">📰</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                          {getCategoryLabel(article.category)}
                        </span>
                        <h4 className="font-bold text-slate-900 line-clamp-2">{article.title}</h4>
                        {(article.excerpt || article.subtitle) && (
                          <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
                            {article.excerpt || article.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>{formatDate(article.published_at)}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {(article.views || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={handleBookmark}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                          aria-label="Enregistrer"
                        >
                          <Bookmark className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleShare(e, article)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                          aria-label="Partager"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des articles (après la une) — cartes compactes */}
            {listAfterFeatured.length > 0 && (
              <div className="space-y-4">
                {listAfterFeatured.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.2) }}
                    onClick={() => handleArticleClick(article)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleArticleClick(article)}
                    className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                  >
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200">
                      {(article.featured_image || article.cover_image) ? (
                        <img
                          src={article.featured_image || article.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">📰</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 mb-1">
                        {getCategoryLabel(article.category)}
                      </span>
                      <h4 className="font-bold text-slate-900 line-clamp-2">{article.title}</h4>
                      {(article.excerpt || article.subtitle) && (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
                          {article.excerpt || article.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{formatDate(article.published_at)}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {(article.views || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleBookmark}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        aria-label="Enregistrer"
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleShare(e, article)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        aria-label="Partager"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* État vide (sans mock) */}
            {!useMock && apiArticles.length === 0 && (
              <div className="text-center py-16">
                <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{t('news_no_articles')}</p>
                {useFeed && !user && (
                  <p className="text-sm text-slate-400 mt-1">Connectez-vous pour voir votre fil personnalisé</p>
                )}
                {useFeed && user && (
                  <p className="text-sm text-slate-400 mt-1">Remplissez vos préférences pour un fil personnalisé</p>
                )}
              </div>
            )}

            {/* Charger plus */}
            {!useMock && hasNextPage && (
              <div ref={loadMoreObserver} className="py-8 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    {t('news_load_more')}
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
