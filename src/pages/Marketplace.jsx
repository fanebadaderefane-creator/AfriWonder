import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Filter, SlidersHorizontal, Grid3X3, List, Package,
  Shirt, Sparkles, Laptop, Home, UtensilsCrossed, Palette, Wrench, ArrowLeft
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

const categories = [
  { id: 'all', label: 'Tout', icon: Grid3X3 },
  { id: 'mode', label: 'Mode', icon: Shirt },
  { id: 'beaute', label: 'Beauté', icon: Sparkles },
  { id: 'electronique', label: 'Tech', icon: Laptop },
  { id: 'maison', label: 'Maison', icon: Home },
  { id: 'alimentation', label: 'Food', icon: UtensilsCrossed },
  { id: 'artisanat', label: 'Artisanat', icon: Palette },
  { id: 'services', label: 'Services', icon: Wrench },
];

export default function Marketplace() {
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

  // Fetch all products for suggestions (API Express)
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      try {
        const result = await api.products.list({ page: 1, limit: 200 });
        return Array.isArray(result) ? result : (result?.products || []);
      } catch (e) {
        console.error('Error loading all products:', e);
        return [];
      }
    }
  });

  // Generate search suggestions
  useEffect(() => {
    if (searchQuery.length > 1) {
      const suggestions = allProducts
        .filter(p =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          text: p.name,
          type: 'product',
          category: p.category
        }));

      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, allProducts]);

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

    return matchesSearch && matchesPrice && matchesCategories && matchesRating &&
      matchesCondition && matchesDelivery && matchesBrand && matchesVerified;
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
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10 pr-4 py-5 rounded-xl border-gray-200 bg-gray-50"
              />

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
              onClick={() => setShowAdvancedFilters(true)}
              className="rounded-xl h-11 px-4"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filtres
            </Button>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
                  <Filter className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Price Range */}
                  <div>
                    <h3 className="font-semibold mb-3">Prix (FCFA)</h3>
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
                    <h3 className="font-semibold mb-3">Trier par</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'recent', label: 'Plus récent' },
                        { id: 'popular', label: 'Populaire' },
                        { id: 'price_low', label: 'Prix croissant' },
                        { id: 'price_high', label: 'Prix décroissant' },
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
                    Appliquer les filtres
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
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
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
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-500">Essayez de modifier vos filtres</p>
        </div>
      )}

      {/* Sell & Orders CTAs */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3">
        <Link to={createPageUrl('SellerOrders')}>
          <Button variant="outline" className="rounded-full h-12 px-5 bg-white shadow-lg">
            <Package className="w-4 h-4 mr-2" />
            Mes ventes
          </Button>
        </Link>
        <Link to={createPageUrl('AddProduct')}>
          <Button className="rounded-full h-14 px-6 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
            <span className="mr-2">+</span> Vendre
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
