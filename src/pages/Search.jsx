// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/common/useTranslation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Loader2, Video, User, Package, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, getAbsoluteImageUrl, getVideoPrimarySourceUrl, MARKETPLACE_PLACEHOLDER_IMG, isDeletedUser } from "@/lib/utils";
import VideoFrameThumbnail from '../components/video/VideoFrameThumbnail';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const SUGGEST_DEBOUNCE_MS = 300;
const MIN_CHARS_FOR_SUGGESTIONS = 2;
const SEARCH_PAGE_BG = 'bg-[#060913]';
const SEARCH_SURFACE = 'border border-white/8 bg-[#0b111d]/92 shadow-[0_22px_70px_rgba(2,6,23,0.30)] backdrop-blur-2xl';

/** Affiche la miniature (image valide), sinon image de secours — évite cadre noir sur Chrome/mobile */
function VideoThumbnail({ video }) {
  const primaryVideoUrl = getVideoPrimarySourceUrl(video);
  const hasValidThumb = isValidThumbnailUrl(video.thumbnail_url, primaryVideoUrl);
  const [showThumb, setShowThumb] = useState(hasValidThumb);
  const [thumbError, setThumbError] = useState(false);

  const onThumbError = () => setThumbError(true);

  if (!hasValidThumb && !primaryVideoUrl) {
    return (
      <div className="w-24 h-16 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
        <Video className="w-8 h-8 text-gray-500" />
      </div>
    );
  }
  if (!hasValidThumb && primaryVideoUrl) {
    return (
      <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
        <VideoFrameThumbnail videoUrl={primaryVideoUrl} thumbnailUrl={video.thumbnail_url} alt={video.title} />
      </div>
    );
  }
  return (
    <div className="w-24 h-16 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden relative">
      {showThumb && !thumbError ? (
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full object-cover absolute inset-0"
          onError={onThumbError}
        />
      ) : (
        <img
          src={VIDEO_PLACEHOLDER_IMG}
          alt={video.title}
          className="w-full h-full object-cover absolute inset-0"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const from = searchParams.get('from') || '';
  const mode = searchParams.get('mode') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [filters, setFilters] = useState({
    type: 'all', // all, videos, users, products
    sort: 'recent',
    category: category,
    duration: 'all' // all, short (< 1 min), medium (1-10 min), long (> 10 min)
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedSuggestTerm, setDebouncedSuggestTerm] = useState('');
  const searchWrapperRef = useRef(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounce du terme pour les suggestions (propositions à la frappe)
  useEffect(() => {
    const term = localQuery.trim().replace(/^@+/, '');
    if (term.length < MIN_CHARS_FOR_SUGGESTIONS) {
      setDebouncedSuggestTerm('');
      return;
    }
    const t = setTimeout(() => setDebouncedSuggestTerm(term), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [localQuery]);

  const handleSearch = (q) => {
    const term = (typeof q === 'string' ? q : localQuery)?.trim() || '';
    setSearchParams(term ? { q: term, category: filters.category } : {});
  };

  const isMessagesContext = from === 'inbox' || mode === 'messages';
  const effectiveSearchType = isMessagesContext ? 'users' : filters.type;

  // Recherche globale CDC : un seul appel API pour vidéos, utilisateurs, produits
  const { data: globalSearchData, isLoading: searchLoading, error: searchError } = useQuery({
    queryKey: ['searchGlobal', query, effectiveSearchType, filters.category, filters.duration],
    queryFn: async () => {
      const result = await api.search.global({
        q: query.trim(),
        type: effectiveSearchType,
        limit: 20,
        category: filters.category && filters.category !== 'all' ? filters.category : undefined,
        duration: filters.duration !== 'all' ? filters.duration : undefined,
      });
      return result;
    },
    enabled: !!query.trim(),
    retry: 1,
    onError: (err) => {
      console.error('Erreur recherche globale:', err);
    },
  });

  const videos = globalSearchData?.videos ?? [];
  const users = globalSearchData?.users ?? [];
  const products = globalSearchData?.products ?? [];

  // Suggestions à la frappe (API unifiée /search/suggest)
  const { data: suggestData, isLoading: suggestionLoading } = useQuery({
    queryKey: ['searchSuggest', debouncedSuggestTerm],
    queryFn: async () => api.search.suggest({ q: debouncedSuggestTerm, limit: 8 }),
    enabled: debouncedSuggestTerm.length >= MIN_CHARS_FOR_SUGGESTIONS,
    staleTime: 60 * 1000,
  });

  const suggestionUsers = suggestData?.users ?? [];
  const suggestionVideos = isMessagesContext ? [] : (suggestData?.videos ?? []);

  const showSuggestions = searchFocused && localQuery.trim().length >= MIN_CHARS_FOR_SUGGESTIONS;
  const suggestionsLoading = suggestionLoading;
  const hasSuggestions = (suggestionUsers?.filter((u) => !isDeletedUser(u)).length > 0) || (suggestionVideos?.length > 0) || suggestionsLoading;

  // Clic en dehors du bloc recherche → fermer les suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoading = searchLoading;
  const hasError = searchError;
  const totalResults = (videos?.length || 0) + (users?.length || 0) + (products?.length || 0);

  // En mode messages, forcer le filtre users et toujours afficher les résultats users
  const effectiveFilterType = isMessagesContext ? 'users' : filters.type;
  const shouldShowUsers = isMessagesContext || filters.type === 'all' || filters.type === 'users';
  const shouldShowVideos = !isMessagesContext && (filters.type === 'all' || filters.type === 'videos');
  const shouldShowProducts = !isMessagesContext && (filters.type === 'all' || filters.type === 'products');

  return (
    <div className={`min-h-screen text-white pb-24 ${SEARCH_PAGE_BG}`}>
      {/* Search Header */}
      <div className="sticky top-0 z-10 border-b border-white/8 bg-[#060913]/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-4xl space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] text-white/82 hover:bg-white/[0.08]" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative min-w-0" ref={searchWrapperRef}>
              <form
                className={`flex min-w-0 items-center gap-2 rounded-[28px] px-4 py-3 ${SEARCH_SURFACE}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchFocused(false);
                  handleSearch(localQuery);
                }}
              >
                <Search className="w-5 h-5 text-white/52 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={
                    isMessagesContext
                      ? t("search_placeholder_users")
                      : filters.type === "videos"
                        ? t("search_placeholder_videos")
                        : filters.type === "users"
                          ? t("search_placeholder_users")
                          : filters.type === "products"
                            ? t("search_placeholder_products")
                            : t("search_placeholder")
                  }
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-white/38 caret-white"
                  autoFocus
                />
                {localQuery ? (
                  <button type="button" onClick={() => { setLocalQuery(''); setSearchParams({}); setSearchFocused(false); }} className="rounded-full p-1 hover:bg-white/[0.06]">
                    <X className="w-5 h-5 text-white/70" />
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="flex-shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 focus-visible:outline-none hover:bg-white/90"
                >
                  {t("search_button")}
                </button>
              </form>

              {/* Suggestions à la frappe : utilisateurs et vidéos (même principe que pour les noms) */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0b111d]/98 shadow-[0_24px_80px_rgba(2,6,23,0.36)] backdrop-blur-2xl">
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-white/70">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span className="text-sm">Chargement des propositions...</span>
                    </div>
                  ) : hasSuggestions ? (
                    <div className="py-2">
                      {/* Vidéos en premier si onglet Vidéos, sinon après Utilisateurs */}
                      {filters.type === 'videos' && suggestionVideos && suggestionVideos.length > 0 && (
                        <div className="px-2 pb-2">
                          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide px-2 py-1">Vidéos</p>
                          {suggestionVideos.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearchFocused(false);
                                navigate(createPageUrl('VideoView') + `?id=${v.id}`);
                              }}
                              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.05]"
                            >
                              <div className="w-14 h-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {v.thumbnail_url ? (
                                  <img
                                    src={v.thumbnail_url}
                                    alt={v.title || ''}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <Video className="w-5 h-5 text-white/50" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{v.title || 'Sans titre'}</p>
                                <p className="text-xs text-white/60 truncate">{v.creator_name || 'Créateur'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {suggestionUsers && suggestionUsers.filter((u) => !isDeletedUser(u)).length > 0 && (
                        <div className={filters.type === 'videos' && suggestionVideos?.length ? 'px-2 pt-2 border-t border-white/10' : 'px-2 pb-2'}>
                          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide px-2 py-1">Utilisateurs</p>
                          {suggestionUsers.filter((u) => !isDeletedUser(u)).map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearchFocused(false);
                                if (isMessagesContext) {
                                  navigate(createPageUrl('Chat') + `?_userId=${u.id}`);
                                } else {
                                  navigate(createPageUrl('Profile') + `?_userId=${u.id}`);
                                }
                              }}
                              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.05]"
                            >
                              <Avatar className="w-10 h-10 flex-shrink-0 border border-white/12 shadow-[0_10px_22px_rgba(2,6,23,0.14)]">
                                <AvatarImage src={u.profile_image} />
                                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-semibold text-sm">
                                  {(u.full_name || u.username || u.email || 'U')?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{u.full_name || u.username || 'Utilisateur'}</p>
                                <p className="text-xs text-white/60 truncate">@{u.username || u.email?.split('@')[0] || 'user'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Vidéos après Utilisateurs quand onglet Tous ou Utilisateurs */}
                      {filters.type !== 'videos' && suggestionVideos && suggestionVideos.length > 0 && (
                        <div className="px-2 pt-2 border-t border-white/10">
                          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide px-2 py-1">Vidéos</p>
                          {suggestionVideos.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearchFocused(false);
                                navigate(createPageUrl('VideoView') + `?id=${v.id}`);
                              }}
                              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.05]"
                            >
                              <div className="w-14 h-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {v.thumbnail_url ? (
                                  <img
                                    src={v.thumbnail_url}
                                    alt={v.title || ''}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <Video className="w-5 h-5 text-white/50" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{v.title || 'Sans titre'}</p>
                                <p className="text-xs text-white/60 truncate">{v.creator_name || 'Créateur'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 px-4 text-center text-sm text-white/65">
                      Aucune proposition pour « {localQuery.trim()} ». Appuyez sur Entrée pour lancer la recherche.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filter tabs — déclenchent le rafraîchissement des résultats */}
          {isMessagesContext ? (
            <div className="py-2 text-center text-sm text-white/62">
              Recherchez un utilisateur pour démarrer une conversation
            </div>
          ) : (
            <Tabs value={filters.type} onValueChange={(v) => setFilters((prev) => ({ ...prev, type: v }))}>
              <TabsList className={`grid w-full grid-cols-4 rounded-[24px] p-1 ${SEARCH_SURFACE}`}>
                <TabsTrigger value="all" className="rounded-2xl text-white/70 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none">Tous</TabsTrigger>
                <TabsTrigger value="videos" className="flex gap-1 rounded-2xl text-white/70 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <Video className="w-4 h-4" /> Vidéos
                </TabsTrigger>
                <TabsTrigger value="users" className="flex gap-1 rounded-2xl text-white/70 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <User className="w-4 h-4" /> Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="products" className="flex gap-1 rounded-2xl text-white/70 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none">
                  <Package className="w-4 h-4" /> Produits
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {!query ? (
          <div className={`mx-auto max-w-sm rounded-[30px] p-8 text-center ${SEARCH_SURFACE}`}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Search className="w-8 h-8 text-white/72" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Que recherchez-vous ?</h2>
            <p className="text-sm text-white/65 mb-6">Vidéos, créateurs, produits — tapez un mot-clé ou choisissez une catégorie ci-dessous.</p>
            {!isMessagesContext && (
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { type: 'videos', label: 'Vidéos', icon: Video },
                  { type: 'users', label: 'Utilisateurs', icon: User },
                  { type: 'products', label: 'Produits', icon: Package },
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, type }));
                      document.querySelector('input[type="text"]')?.focus();
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm ${
                      filters.type === type
                        ? 'border border-white/25 bg-white/[0.10] text-white'
                        : 'border border-white/12 bg-white/[0.03] text-white/72 hover:border-white/24 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            {isMessagesContext && (
              <p className="text-sm text-white/60">Tapez le nom ou l'email d'un utilisateur pour démarrer une conversation</p>
            )}
          </div>
        ) : hasError ? (
          <div className={`rounded-[30px] p-10 text-center ${SEARCH_SURFACE}`}>
            <p className="font-semibold mb-2">Erreur de connexion</p>
            <p className="text-sm text-white/70">
              {hasError?.response?.status === 404 || hasError?.message?.includes('Network')
                ? 'Vérifiez que le backend est lancé sur http://localhost:3000'
                : hasError?.apiMessage || hasError?.message || 'Impossible de charger les résultats'}
            </p>
            <p className="text-xs text-white/50 mt-2">Ouvrez la console (F12) pour plus de détails</p>
          </div>
        ) : isLoading ? (
          <div className={`flex flex-col items-center justify-center rounded-[30px] py-12 text-white/70 ${SEARCH_SURFACE}`}>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-white" />
            <p className="text-sm">Recherche en cours...</p>
          </div>
        ) : totalResults === 0 ? (
          <div className={`mx-auto max-w-sm rounded-[30px] p-8 text-center ${SEARCH_SURFACE}`}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <Search className="w-7 h-7 text-white/60" />
            </div>
            <p className="font-semibold text-white mb-1">{t("search_no_results")} « {query} »</p>
            <p className="text-sm text-white/65 mb-4">
              {isMessagesContext ? t("search_try_other_users") : t("search_try_other")}
            </p>
            {!isMessagesContext && (
              <p className="text-xs text-white/50">{t("search_try_other")}</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-white/65 mb-2">
              {totalResults} {t("search_results_count")} « {query} »
            </p>
            {/* Videos — affiché pour Tous ou Vidéos */}
            {shouldShowVideos && videos && videos.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#ff2f6d]" />
                  Vidéos <span className="text-sm font-normal text-white/60">({videos.length})</span>
                </h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {videos.map((video) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(createPageUrl('VideoView') + `?id=${video.id}`)}
                        className={`flex cursor-pointer gap-3 rounded-[24px] p-3 ${SEARCH_SURFACE}`}
                      >
                        <VideoThumbnail video={video} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{video.title}</h3>
                          <p className="text-xs text-white/65">{video.creator_name}</p>
                          <p className="text-xs text-white/50 mt-1">{video.views ?? video.views_count ?? 0} vues</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Users — affiché pour Tous ou Users (ou toujours en mode messages) */}
            {shouldShowUsers && users && users.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#ff2f6d]" />
                  Utilisateurs <span className="text-sm font-normal text-white/60">({users.length})</span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {users.map((u) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => {
                          if (isMessagesContext) {
                            // Depuis Inbox: se comporte comme Instagram/X — ouvrir directement une conversation
                            navigate(createPageUrl('Chat') + `?_userId=${u.id}`);
                          } else {
                            navigate(createPageUrl('Profile') + `?_userId=${u.id}`);
                          }
                        }}
                        className={`cursor-pointer rounded-[24px] p-3 text-center ${SEARCH_SURFACE}`}
                      >
                        <Avatar className="mx-auto mb-2 h-12 w-12 border border-white/12 shadow-[0_10px_24px_rgba(2,6,23,0.16)]">
                          <AvatarImage src={u.profile_image} />
                          <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-semibold">
                            {(u.full_name || u.username || u.email || 'U')?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-sm text-white truncate">{u.full_name || u.username || 'Utilisateur'}</p>
                        <p className="text-xs text-white/60 truncate">@{u.username || u.email?.split('@')[0] || 'user'}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Products — affiché pour Tous ou Produits */}
            {shouldShowProducts && products && products.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#ff2f6d]" />
                  Produits <span className="text-sm font-normal text-white/60">({products.length})</span>
                </h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => navigate(createPageUrl('Product') + `?id=${product.id}`)}
                        className={`flex cursor-pointer gap-3 rounded-[24px] p-3 ${SEARCH_SURFACE}`}
                      >
                        <div className="w-16 h-16 min-h-[64px] rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                          <img
                            src={getAbsoluteImageUrl(product.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                            alt={product.name || product.title}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white truncate">{product.name || product.title}</h3>
                          <p className="text-sm font-bold text-[#ff5f8f]">{product.price?.toLocaleString()} FCFA</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
