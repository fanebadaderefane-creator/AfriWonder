import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Filter, SlidersHorizontal, Grid3X3, List, Package,
  Shirt, Sparkles, Laptop, Home, UtensilsCrossed, Palette, Wrench, ArrowLeft, Mic, MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import ProductCard from '../components/marketplace/ProductCard';
import AdvancedFilters from '../components/marketplace/AdvancedFilters';
import CurrencySelector from '../components/marketplace/CurrencySelector';
import BottomNav from '../components/navigation/BottomNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from '@/components/common/useTranslation';

const marketplaceI18n = {
  fr: {
    categories: { all: 'Tout', mode: 'Mode', beaute: 'Beaute', electronique: 'Tech', maison: 'Maison', alimentation: 'Food', artisanat: 'Artisanat', services: 'Services' },
    searchPlaceholder: 'Rechercher des produits...',
    voiceNotSupported: 'Recherche vocale non supportee par votre navigateur',
    voiceError: 'Echec de la recherche vocale. Verifiez le micro et les permissions.',
    voiceFr: 'Recherche vocale en francais',
    voiceBm: 'Recherche vocale en bambara',
    voiceModeFr: 'Francais',
    voiceModeBm: 'Bambara',
    map: 'Carte',
    filters: 'Filtres',
    filterTitle: 'Filtres',
    priceFcfa: 'Prix (FCFA)',
    sortBy: 'Trier par',
    sortRecent: 'Plus recent',
    sortPopular: 'Populaire',
    sortPriceAsc: 'Prix croissant',
    sortPriceDesc: 'Prix decroissant',
    applyFilters: 'Appliquer les filtres',
    productsCount: 'produit',
    productsCountPlural: 'produits',
    recommended: 'Recommandes pour vous',
    trending: 'Produits tendance',
    newest: 'Nouveautes',
    emptyTitle: 'Aucun produit trouve',
    emptySubtitle: 'Essayez de modifier vos filtres',
    mySales: 'Mes ventes',
    sellerPlans: 'Formules vendeurs',
    sell: 'Vendre',
    marketplaceFallback: 'Marketplace',
  },
  bm: {
    categories: { all: 'Bee', mode: 'Mode', beaute: 'Nogoya', electronique: 'Tekinoloji', maison: 'So', alimentation: 'Dumuni', artisanat: 'Bolobara', services: 'Baraw' },
    searchPlaceholder: 'Fenw ce...',
    voiceNotSupported: 'Kan ni celi te se i navigateur la',
    voiceError: 'Kan ni celi ma soro. Aw ka mikro ni permissions laje.',
    voiceFr: 'Kan ni celi Faransikan na',
    voiceBm: 'Kan ni celi Bamanankan na',
    voiceModeFr: 'Faransikan',
    voiceModeBm: 'Bamanankan',
    map: 'Karta',
    filters: 'Filtrew',
    filterTitle: 'Filtrew',
    priceFcfa: 'Songo (FCFA)',
    sortBy: 'Sege sege ka ke',
    sortRecent: 'Kura donnin',
    sortPopular: 'Mogo caman b a fe',
    sortPriceAsc: 'Songo ka jigin',
    sortPriceDesc: 'Songo ka bon',
    applyFilters: 'Filtrew damine',
    productsCount: 'fen',
    productsCountPlural: 'fenw',
    recommended: 'A yira i ye',
    trending: 'Fenw be taa ka bon',
    newest: 'Kura fenw',
    emptyTitle: 'Fen si ma soro',
    emptySubtitle: 'I ka filtrew bo ka sege sege',
    mySales: 'Ne feereliw',
    sellerPlans: 'Feerelaw planw',
    sell: 'Feere',
    marketplaceFallback: 'Soro',
  },
};

export default function Marketplace() {
  const { language } = useTranslation();
  const labels = marketplaceI18n[language] || marketplaceI18n.fr;
  const categories = [
    { id: 'all', label: labels.categories.all, icon: Grid3X3 },
    { id: 'mode', label: labels.categories.mode, icon: Shirt },
    { id: 'beaute', label: labels.categories.beaute, icon: Sparkles },
    { id: 'electronique', label: labels.categories.electronique, icon: Laptop },
    { id: 'maison', label: labels.categories.maison, icon: Home },
    { id: 'alimentation', label: labels.categories.alimentation, icon: UtensilsCrossed },
    { id: 'artisanat', label: labels.categories.artisanat, icon: Palette },
    { id: 'services', label: labels.categories.services, icon: Wrench },
  ];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [voiceLocale, setVoiceLocale] = useState(language === 'bm' ? 'bm-ML' : 'fr-FR');

  useEffect(() => {
    setVoiceLocale(language === 'bm' ? 'bm-ML' : 'fr-FR');
  }, [language]);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(labels.voiceNotSupported);
      return;
    }
    const tryRecognition = (lang, fallbackLang = null) => {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setSearchQuery(transcript);
      };
      recognition.onerror = (e) => {
        setIsListening(false);
        if (fallbackLang && e?.error === 'language-not-supported') {
          tryRecognition(fallbackLang, null);
          return;
        }
        if (e?.error !== 'aborted') {
          alert(labels.voiceError);
        }
      };
      recognition.start();
    };

    if (voiceLocale === 'bm-ML') {
      tryRecognition('bm-ML', 'fr-FR');
      return;
    }
    tryRecognition('fr-FR', null);
  };

  const { data: remoteSuggestions = [] } = useQuery({
    queryKey: ['marketplace-suggestions', searchQuery],
    queryFn: () => api.products.getSuggestions(searchQuery, 8),
    enabled: searchQuery.trim().length > 1,
  });

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setSearchSuggestions(remoteSuggestions || []);
      setShowSuggestions(true);
      return;
    }
    setSearchSuggestions([]);
    setShowSuggestions(false);
  }, [searchQuery, remoteSuggestions]);

  const { data: highlights } = useQuery({
    queryKey: ['marketplace-highlights'],
    queryFn: () => api.products.getHighlights({ trendingLimit: 8, newLimit: 8 }),
  });
  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['marketplace-recommendations'],
    queryFn: () => api.products.getRecommendations(8),
  });
  const trendingProducts = highlights?.trending || [];
  const newestProducts = highlights?.newest || [];

  const sortToParams = () => {
    if (sortBy === 'price_low' || sortBy === 'price_asc') return { sort: 'price', order: 'asc' };
    if (sortBy === 'price_high' || sortBy === 'price_desc') return { sort: 'price', order: 'desc' };
    if (sortBy === 'recent' || sortBy === 'newest') return { sort: 'created_at', order: 'desc' };
    if (sortBy === 'popular') return { sort: 'sales', order: 'desc' };
    if (sortBy === 'rating') return { sort: 'popularity', order: 'desc' };
    return { sort: 'created_at', order: 'desc' };
  };

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['marketplace-products', selectedCategory, sortBy, searchQuery],
    queryFn: async () => {
      try {
        const { sort, order } = sortToParams();
        const params = {
          page: 1,
          limit: 50,
          sort,
          order,
          ...(selectedCategory !== 'all' && { category: selectedCategory }),
          ...(searchQuery?.trim() && { search: searchQuery.trim() }),
        };
        const result = await api.products.list(params);
        return result;
      } catch (e) {
        console.error('Error loading products:', e);
        return { products: [], pagination: {} };
      }
    }
  });
  const products = productsData?.products ?? (Array.isArray(productsData) ? productsData : []);

  // Enhanced filtering with advanced filters
  let filteredProducts = (products || []).filter(product => {
    if (!product || !product.id) return false;
    const matchesSearch = !searchQuery ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

    const matchesCategories = !advancedFilters.categories?.length ||
      advancedFilters.categories.includes(product.category);

    const matchesRating = !advancedFilters.minRating ||
      (product.average_rating || 0) >= advancedFilters.minRating;

    const matchesCondition = !advancedFilters.conditions?.length ||
      advancedFilters.conditions.includes(product.condition);

    const matchesDelivery = !advancedFilters.deliveryOptions?.length ||
      product.delivery_options?.some(opt => advancedFilters.deliveryOptions.includes(opt));

    const matchesBrand = !advancedFilters.brands?.length ||
      advancedFilters.brands.includes(product.brand);

    const matchesVerified = !advancedFilters.verifiedOnly || product.is_verified;

    const productRegion = product.seller?.seller_profile?.city || product.location || product.region || '';
    const matchesRegion = !advancedFilters.regions?.length ||
      advancedFilters.regions.some(r => productRegion?.toLowerCase().includes(r.toLowerCase()));

    return matchesSearch && matchesPrice && matchesCategories && matchesRating &&
      matchesCondition && matchesDelivery && matchesBrand && matchesVerified && matchesRegion;
  });

  // Sort products (recent, price_low, price_high = boutons Filtres)
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_low' || sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_high' || sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'recent' || sortBy === 'newest') return new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0);
    if (sortBy === 'popular') return (b.sold_count || 0) - (a.sold_count || 0);
    if (sortBy === 'rating') return (b.average_rating || 0) - (a.average_rating || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <CurrencySelector />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10 pr-28 py-5 rounded-xl border-gray-200 bg-gray-50"
              />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVoiceLocale('fr-FR')}
                  className={`text-[10px] px-2 py-1 rounded-md border ${voiceLocale === 'fr-FR' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  title={labels.voiceFr}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLocale('bm-ML')}
                  className={`text-[10px] px-2 py-1 rounded-md border ${voiceLocale === 'bm-ML' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  title={labels.voiceBm}
                >
                  BM
                </button>
              </div>
              <button
                type="button"
                onClick={startVoiceSearch}
                disabled={isListening}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${isListening ? 'bg-orange-200 animate-pulse' : 'hover:bg-gray-100'} transition-colors`}
                title={`Recherche vocale (${voiceLocale === 'bm-ML' ? labels.voiceModeBm : labels.voiceModeFr})`}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'text-orange-600' : 'text-gray-500'}`} />
              </button>

              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (suggestion?.id) {
                          window.location.href = `${createPageUrl('Product')}?id=${suggestion.id}`;
                        }
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Search className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{suggestion.text}</p>
                          <p className="text-xs text-gray-500">{suggestion.category}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl('MarketplaceMap')}
              className="rounded-xl h-11 px-4"
            >
              <MapPin className="w-5 h-5 mr-2" />
              {labels.map}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(true)}
              className="rounded-xl h-11 px-4"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              {labels.filters}
            </Button>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
                  <Filter className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>{labels.filterTitle}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Price Range */}
                  <div>
                    <h3 className="font-semibold mb-3">{labels.priceFcfa}</h3>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      min={0}
                      max={500000}
                      step={1000}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{priceRange[0].toLocaleString()}</span>
                      <span>{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <h3 className="font-semibold mb-3">{labels.sortBy}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'recent', label: labels.sortRecent },
                        { id: 'popular', label: labels.sortPopular },
                        { id: 'price_low', label: labels.sortPriceAsc },
                        { id: 'price_high', label: labels.sortPriceDesc },
                      ].map((sort) => (
                        <button
                          key={sort.id}
                          onClick={() => setSortBy(sort.id)}
                          className={`p-3 rounded-xl text-sm font-medium transition-all ${
                            sortBy === sort.id
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {sort.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowFilters(false)}
                    className="w-full py-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {labels.applyFilters}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Categories */}
        <div className="overflow-x-auto px-4 pb-3 scrollbar-hide">
          <div className="flex gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="min-w-max">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredProducts.length} {filteredProducts.length > 1 ? labels.productsCountPlural : labels.productsCount}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gray-200' : ''}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-gray-200' : ''}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!searchQuery && (
        <div className="px-4 space-y-5 mb-4">
          {recommendedProducts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.recommended}</h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {recommendedProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { window.location.href = `${createPageUrl('Product')}?id=${p.id}`; }}
                    className="min-w-[180px] bg-white border border-gray-100 rounded-xl p-2 text-left"
                  >
                    <img
                      src={(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400'}
                      alt={p.name}
                      className="w-full h-24 rounded-lg object-cover mb-2"
                    />
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.category || labels.marketplaceFallback}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
          {trendingProducts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.trending}</h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {trendingProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { window.location.href = `${createPageUrl('Product')}?id=${p.id}`; }}
                    className="min-w-[180px] bg-white border border-gray-100 rounded-xl p-2 text-left"
                  >
                    <img
                      src={(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400'}
                      alt={p.name}
                      className="w-full h-24 rounded-lg object-cover mb-2"
                    />
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.category || labels.marketplaceFallback}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
          {newestProducts.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.newest}</h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {newestProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { window.location.href = `${createPageUrl('Product')}?id=${p.id}`; }}
                    className="min-w-[180px] bg-white border border-gray-100 rounded-xl p-2 text-left"
                  >
                    <img
                      src={(p.images && p.images[0]) || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'}
                      alt={p.name}
                      className="w-full h-24 rounded-lg object-cover mb-2"
                    />
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.category || labels.marketplaceFallback}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Products Grid */}
      <div className={`px-4 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <ProductCard
              product={product}
              onPress={(p) => {
                if (p?.id) {
                  window.location.href = `${createPageUrl('Product')}?id=${p.id}`;
                }
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{labels.emptyTitle}</h3>
          <p className="text-gray-500">{labels.emptySubtitle}</p>
        </div>
      )}

      {/* Sell & Orders CTAs */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3">
        <Link to={createPageUrl('SellerOrders')}>
          <Button variant="outline" className="rounded-full h-12 px-5 bg-white shadow-lg">
            <Package className="w-4 h-4 mr-2" />
            {labels.mySales}
          </Button>
        </Link>
        <Link to={createPageUrl('SellerSubscription')}>
          <Button variant="outline" className="rounded-full h-12 px-5 bg-white shadow-lg">
            {labels.sellerPlans}
          </Button>
        </Link>
        <Link to={createPageUrl('AddProduct')}>
          <Button className="rounded-full h-14 px-6 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
            <span className="mr-2">+</span> {labels.sell}
          </Button>
        </Link>
      </div>

      <AdvancedFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onApply={(filters) => setAdvancedFilters(filters)}
      />

      <BottomNav />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
