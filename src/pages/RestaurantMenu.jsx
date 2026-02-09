import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Star, MapPin, Plus, Loader2, ShoppingCart } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';
import { toast } from 'sonner';

export default function RestaurantMenu() {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get('id');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.food.restaurants.getById(restaurantId),
      api.food.menuItems.listByRestaurant(restaurantId),
    ])
      .then(([r, items]) => {
        if (cancelled) return;
        setRestaurant(r?.restaurant ?? r);
        setMenuItems(items?.menu_items ?? items ?? []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.response?.data?.message || 'Chargement impossible');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [restaurantId]);

  const addToCart = (item, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) => x.id === item.id ? { ...x, quantity: x.quantity + qty } : x);
      }
      return [...prev, { ...item, quantity: qty }];
    });
    toast.success(`${item.name} ajouté au panier`);
  };

  const totalCart = cart.reduce((sum, x) => sum + (Number(x.price) || 0) * (x.quantity || 1), 0);
  const deliveryFee = restaurant?.delivery_fee ?? 500;

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Restaurant non sélectionné.</p>
          <Link to={createPageUrl('FoodDelivery')}><Button className="mt-4 bg-orange-500">Voir les restaurants</Button></Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Restaurant introuvable.</p>
          <Link to={createPageUrl('FoodDelivery')}><Button className="mt-4 bg-orange-500">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const imageUrl = restaurant.banner_url || restaurant.logo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
  const cuisine = Array.isArray(restaurant.cuisine_type) ? restaurant.cuisine_type.join(' • ') : (restaurant.cuisine_type || 'Restaurant');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 pb-28">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('FoodDelivery')}>
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-white truncate max-w-[200px]">{restaurant.name}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="relative">
        <img src={imageUrl} alt={restaurant.name} className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h2 className="text-xl font-bold">{restaurant.name}</h2>
          <p className="text-sm text-white/80">{cuisine}</p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {restaurant.rating ?? '—'}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {restaurant.delivery_time_min ?? 30} min</span>
            {restaurant.address && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {restaurant.address}</span>}
          </div>
          <Badge className={`mt-2 ${restaurant.is_open ? 'bg-green-500' : 'bg-red-500'}`}>
            {restaurant.is_open ? 'Ouvert' : 'Fermé'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-white">Menu</h3>
        {menuItems.length === 0 ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6 text-center text-gray-400">
              Aucun plat pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Card key={item.id} className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
                <CardContent className="p-4 flex gap-4">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white">{item.name}</h4>
                    {item.description && <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>}
                    <p className="text-orange-400 font-bold mt-1">{Number(item.price || 0).toLocaleString()} FCFA</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                    onClick={() => addToCart(item)}
                    disabled={!restaurant.is_open}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CommissionNotice vertical="food" compact className="text-white/70" />
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/10 z-40">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <p className="text-white font-semibold">{cart.length} article(s)</p>
              <p className="text-orange-400 text-lg font-bold">{totalCart.toLocaleString()} FCFA + {deliveryFee.toLocaleString()} livraison</p>
            </div>
            <Link to={createPageUrl('FoodDelivery')}>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <ShoppingCart className="w-5 h-5 mr-2" /> Commander
              </Button>
            </Link>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
