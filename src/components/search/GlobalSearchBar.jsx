import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Search, X, TrendingUp, Package, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from "@/utils";

export default function GlobalSearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const { data: results = [] } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      
      const [products, sellers] = await Promise.all([
        api.products.list({ page: 1, limit: 50 }).then(all => 
          all.filter(p => 
            p.name?.toLowerCase().includes(query.toLowerCase()) ||
            p._description?.toLowerCase().includes(query.toLowerCase()) ||
            p.brand?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5)
        ),
        api.entities.SellerProfile.list().then(all =>
          all.filter(s => 
            s.shop_name?.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 3)
        )
      ]);

      return {
        products,
        sellers
      };
    },
    enabled: query.length >= 2
  });

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    // Save to recent searches
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
    
    setShowResults(false);
    setQuery('');
    
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      window.location.href = `${createPageUrl('Marketplace')}?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <Input
          placeholder="Rechercher produits, vendeurs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
          className="pl-10 pr-10 py-5 rounded-xl border-gray-200 bg-gray-50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showResults && (query.length >= 2 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Recherches récentes</p>
                  <button onClick={clearRecent} className="text-xs text-orange-500">
                    Effacer
                  </button>
                </div>
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(search)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Products */}
            {results.products?.length > 0 && (
              <div className="p-3 border-b">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Produits</p>
                {results.products.map((product) => (
                  <a
                    key={product.id}
                    href={`${createPageUrl('Product')}?id=${product.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <p className="text-sm font-bold text-orange-500">
                        {product.price?.toLocaleString()} FCFA
                      </p>
                    </div>
                    <Package className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            )}

            {/* Sellers */}
            {results.sellers?.length > 0 && (
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vendeurs</p>
                {results.sellers.map((seller) => (
                  <a
                    key={seller.id}
                    href={`${createPageUrl('SellerProfile')}?id=${seller.seller_id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <img
                      src={seller.shop_logo || 'https://ui-avatars.com/api/?name=' + seller.shop_name}
                      alt={seller.shop_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{seller.shop_name}</p>
                      <p className="text-xs text-gray-500">{seller.location}</p>
                    </div>
                    <Store className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            )}

            {query.length >= 2 && results.products?.length === 0 && results.sellers?.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun résultat trouvé</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


