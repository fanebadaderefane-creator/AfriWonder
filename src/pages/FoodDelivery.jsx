import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Search, Clock, Star, MapPin,
  Flame, TrendingUp, Package, ChefHat
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_RESTAURANTS = [
  { id: 1, name: 'Chez Fatou', cuisine: 'Africain • Sénégalais', rating: 4.8, reviews: 230, deliveryTime: '25-35 min', deliveryFee: 500, image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400', badge: 'Populaire', badgeColor: 'bg-orange-500' },
  { id: 2, name: 'Le Palmier d\'Or', cuisine: 'Français • Africain', rating: 4.9, reviews: 450, deliveryTime: '30-40 min', deliveryFee: 1000, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', badge: 'Top noté', badgeColor: 'bg-yellow-500' },
  { id: 3, name: 'Pizza Express', cuisine: 'Italien • Pizza', rating: 4.6, reviews: 180, deliveryTime: '20-30 min', deliveryFee: 500, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', badge: 'Rapide', badgeColor: 'bg-green-500' },
];

export default function FoodDelivery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState(MOCK_RESTAURANTS);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.food.restaurants.list({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.restaurants ?? [];
        if (list.length) setRestaurants(list.map((r) => ({
          id: r.id,
          name: r.name,
          cuisine: Array.isArray(r.cuisine_type) ? r.cuisine_type.join(' • ') : (r.cuisine_type || 'Restaurant'),
          rating: r.rating ?? 5,
          reviews: r.total_reviews ?? 0,
          deliveryTime: `${r.delivery_time_min ?? 30} min`,
          deliveryFee: r.delivery_fee ?? 0,
          image: r.banner_url || r.logo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          badge: r.is_open ? 'Ouvert' : 'Fermé',
          badgeColor: r.is_open ? 'bg-green-500' : 'bg-red-500',
        })));
      })
      .catch(() => { if (!cancelled) setRestaurants(MOCK_RESTAURANTS); })
      .finally(() => { if (!cancelled) setLoadingRestaurants(false); });
    return () => { cancelled = true; };
  }, []);

  const categories = [
    { id: 1, name: 'Africain', icon: '🍛', color: 'from-orange-500 to-red-500' },
    { id: 2, name: 'FastFood', icon: '🍔', color: 'from-yellow-500 to-orange-500' },
    { id: 3, name: 'Pizza', icon: '🍕', color: 'from-red-500 to-pink-500' },
    { id: 4, name: 'Asiatique', icon: '🍜', color: 'from-purple-500 to-blue-500' },
    { id: 5, name: 'Sushi', icon: '🍣', color: 'from-blue-500 to-cyan-500' },
    { id: 6, name: 'Desserts', icon: '🍰', color: 'from-pink-500 to-rose-500' },
  ];

  const trendingDishes = [
    { id: 1, name: 'Thiéboudienne', restaurant: 'Chez Fatou', price: 3500, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200' },
    { id: 2, name: 'Yassa Poulet', restaurant: 'Le Palmier', price: 4000, image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=200' },
    { id: 3, name: 'Pizza Margherita', restaurant: 'Pizza Express', price: 5000, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Food Delivery</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Package className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher restaurants, plats..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Delivery Address */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Livraison à</p>
                <p className="font-semibold text-white">Plateau, Dakar</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-orange-400">
              Changer
            </Button>
          </CardContent>
        </Card>

        {/* Categories */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Catégories</h2>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${category.color} text-white text-center`}
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <p className="text-xs font-semibold">{category.name}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Trending Dishes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Plats tendance</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {trendingDishes.map((dish) => (
              <motion.div
                key={dish.id}
                whileHover={{ scale: 1.05 }}
                className="min-w-[160px] bg-white/10 backdrop-blur-md border-white/20 rounded-xl overflow-hidden"
              >
                <img src={dish.image} alt={dish.name} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <p className="font-semibold text-white text-sm mb-1">{dish.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{dish.restaurant}</p>
                  <p className="text-orange-400 font-bold">{dish.price} FCFA</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Popular Restaurants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Restaurants populaires</h2>
          </div>
          <div className="space-y-3">
            {loadingRestaurants && <p className="text-center text-gray-400 py-4">Chargement des restaurants...</p>}
            {!loadingRestaurants && restaurants.map((restaurant) => (
              <Link key={restaurant.id} to={`${createPageUrl('RestaurantMenu')}?id=${restaurant.id}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-40 object-cover"
                    />
                    <Badge className={`absolute top-2 right-2 ${restaurant.badgeColor}`}>
                      {restaurant.badge}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white mb-1">{restaurant.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{restaurant.cuisine}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white font-semibold">{restaurant.rating}</span>
                          <span className="text-gray-400">({restaurant.reviews})</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Clock className="w-4 h-4" />
                          {restaurant.deliveryTime}
                        </div>
                      </div>
                      <p className="text-xs text-orange-400 font-semibold">
                        {restaurant.deliveryFee} FCFA
                      </p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Become a Restaurant Partner */}
        <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-green-400/30">
          <CardContent className="p-6 text-center">
            <ChefHat className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-2">Vous êtes restaurateur ?</h3>
            <p className="text-sm text-gray-300 mb-4">Rejoignez AfriWonder et développez votre activité</p>
            <Button className="bg-gradient-to-r from-green-500 to-teal-500">
              Devenir partenaire
            </Button>
          </CardContent>
        </Card>

        <CommissionNotice vertical="food" compact className="text-white/70" />
      </div>

      <BottomNav />
    </div>
  );
}
