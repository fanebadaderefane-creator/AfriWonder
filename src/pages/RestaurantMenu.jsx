import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Clock, Star, MapPin, Plus, Loader2, ShoppingCart, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';
import { toast } from 'sonner';

// Données de démo lorsque le restaurant n'existe pas encore en base (même liste que Restauration)
const MOCK_RESTAURANTS_BY_ID = {
  '1': {
    id: '1',
    name: 'Le Djembe',
    cuisine_type: ['malienne'],
    rating: 4.8,
    total_reviews: 234,
    delivery_time_min: 30,
    address: 'Hamdallaye, Bamako',
    city: 'Bamako',
    delivery_fee: 500,
    minimum_order: 2000,
    is_open: true,
    banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  },
  '2': {
    id: '2',
    name: 'Chez Aminata',
    cuisine_type: ['africaine'],
    rating: 4.6,
    total_reviews: 189,
    delivery_time_min: 25,
    address: 'ACI 2000, Bamako',
    city: 'Bamako',
    delivery_fee: 500,
    minimum_order: 1500,
    is_open: true,
    banner_url: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop',
  },
  '3': {
    id: '3',
    name: 'Pizza Mali',
    cuisine_type: ['internationale', 'fast_food'],
    rating: 4.5,
    total_reviews: 312,
    delivery_time_min: 35,
    address: 'Badalabougou, Bamako',
    city: 'Bamako',
    delivery_fee: 750,
    minimum_order: 2500,
    is_open: false,
    banner_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
  },
};

const MOCK_MENU_ITEMS = [
  { id: '1', name: 'Tô au gombo', description: 'Plat traditionnel malien', price: 1500, image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop' },
  { id: '2', name: 'Poulet yassa', description: 'Poulet mariné aux oignons', price: 3500, image_url: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=200&h=200&fit=crop' },
  { id: '3', name: 'Jus de gingembre', description: 'Jus de gingembre frais', price: 500, image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop' },
  { id: '4', name: 'Riz au gras', description: 'Riz savoureux au gras de mouton', price: 2000, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop' },
  { id: '5', name: 'Jus de bissap', description: "Jus de fleurs d'hibiscus", price: 500, image_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop' },
];

export default function RestaurantMenu() {
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get('id');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderRef, setLastOrderRef] = useState('');

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
        setMenuItems(items?.menu_items ?? (Array.isArray(items) ? items : []));
      })
      .catch(() => {
        if (cancelled) return;
        const mockRestaurant = MOCK_RESTAURANTS_BY_ID[restaurantId];
        if (mockRestaurant) {
          setRestaurant(mockRestaurant);
          setMenuItems(MOCK_MENU_ITEMS);
        } else {
          toast.error('Restaurant non trouvé');
        }
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
  const totalWithDelivery = totalCart + deliveryFee;

  const handlePlaceOrder = () => {
    setLastOrderRef(`CMD-${Date.now().toString(36).toUpperCase()}`);
    setOrderPlaced(true);
    setCart([]);
    setShowOrderModal(false);
    toast.success('Commande enregistrée');
  };

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p>Restaurant non sélectionné.</p>
          <Link to={createPageUrl('FoodDelivery')}><Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">Voir les restaurants</Button></Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p>Restaurant introuvable.</p>
          <Link to={createPageUrl('FoodDelivery')}><Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const cuisine = Array.isArray(restaurant.cuisine_type) ? restaurant.cuisine_type.join(' • ') : (restaurant.cuisine_type || 'Restaurant');

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* En-tête AfriWonder : fond clair + accent orange */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl('FoodDelivery')} className="text-gray-700 hover:text-orange-600 p-1 -m-1 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
          <p className="text-sm text-gray-500">{cuisine}</p>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap text-gray-600">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-orange-500" /> {restaurant.rating ?? '—'}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {restaurant.delivery_time_min ?? 30} min</span>
            {restaurant.address && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {restaurant.address}</span>}
          </div>
          <Badge className={`mt-2 ${restaurant.is_open ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {restaurant.is_open ? 'Ouvert' : 'Fermé'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
        {menuItems.length === 0 ? (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center text-gray-500">
              Aucun plat pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Card key={item.id} className="bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.description && <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>}
                    <p className="text-orange-600 font-bold mt-1">{Number(item.price || 0).toLocaleString()} FCFA</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
                    onClick={() => addToCart(item)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CommissionNotice vertical="food" compact className="text-gray-500" />
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <p className="text-gray-900 font-semibold">{cart.length} article(s)</p>
              <p className="text-orange-600 text-lg font-bold">{totalCart.toLocaleString()} FCFA + {deliveryFee.toLocaleString()} livraison</p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setShowOrderModal(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-2" /> Commander
            </Button>
          </div>
        </div>
      )}

      {/* Modal récapitulatif commande */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title=""
        size="md"
      >
        {restaurant && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Récapitulatif</h3>
              <span className="text-sm font-medium text-gray-600">{restaurant.name}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 max-h-52 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 text-sm border-b border-gray-100 last:border-0">
                  <span className="text-gray-800">
                    {item.name} <span className="text-gray-500">× {item.quantity || 1}</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    {((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{totalCart.toLocaleString('fr-FR')} F CFA</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span>{deliveryFee.toLocaleString('fr-FR')} F CFA</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-3 border-t-2 border-gray-200">
                <span>Total</span>
                <span>{totalWithDelivery.toLocaleString('fr-FR')} F CFA</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-gray-300" onClick={() => setShowOrderModal(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                onClick={handlePlaceOrder}
              >
                Valider la commande
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal succès commande */}
      <Modal
        isOpen={orderPlaced}
        onClose={() => { setOrderPlaced(false); }}
        title=""
        size="sm"
      >
        <div className="text-center py-6 space-y-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Commande enregistrée</h3>
            <p className="text-gray-600 text-sm">
              Référence : <span className="font-mono font-semibold text-gray-800">{lastOrderRef || `CMD-${Date.now().toString(36).toUpperCase()}`}</span>
            </p>
          </div>
          <p className="text-gray-600 text-sm">
            Le restaurant a bien reçu votre commande. Vous serez notifié dès la préparation.
          </p>
          <Link to={createPageUrl('FoodDelivery')}>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold" onClick={() => setOrderPlaced(false)}>
              Retour à la restauration
            </Button>
          </Link>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
