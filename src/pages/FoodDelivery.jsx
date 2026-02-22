import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  Clock,
  Star,
  MapPin,
  Plus,
  ChefHat,
  UtensilsCrossed,
  ArrowLeft,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'malienne', label: 'Malienne' },
  { id: 'africaine', label: 'Africaine' },
  { id: 'internationale', label: 'Internationale' },
  { id: 'fast_food', label: 'Fast Food' },
  { id: 'vegetarien', label: 'Végétarien' },
];

// Données mock pour démo (restaurants approuvés)
const MOCK_RESTAURANTS = [
  {
    id: '1',
    name: 'Le Djembe',
    cuisine_type: ['malienne'],
    cuisineLabel: 'Malienne',
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
  {
    id: '2',
    name: 'Chez Aminata',
    cuisine_type: ['africaine'],
    cuisineLabel: 'Africaine',
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
  {
    id: '3',
    name: 'Pizza Mali',
    cuisine_type: ['internationale', 'fast_food'],
    cuisineLabel: 'Internationale',
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
];

const MOCK_MENU_ITEMS = [
  { id: '1', name: 'Tô au gombo', description: 'Plat traditionnel malien', price: 1500, is_popular: true },
  { id: '2', name: 'Poulet yassa', description: 'Poulet mariné aux oignons', price: 3500, is_popular: true },
  { id: '3', name: 'Jus de gingembre', description: 'Jus de gingembre frais', price: 500, is_popular: true },
  { id: '4', name: 'Riz au gras', description: 'Riz savoureux au gras de mouton', price: 2000, is_popular: true },
  { id: '5', name: 'Jus de bissap', description: 'Jus de fleurs d\'hibiscus', price: 500, is_popular: true },
];

function formatPrice(n) {
  return `${Number(n).toLocaleString('fr-FR')} F CFA`;
}

export default function FoodDelivery() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [menuItemsByRestaurant, setMenuItemsByRestaurant] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPrestataireModal, setShowPrestataireModal] = useState(false);
  const [prestataireForm, setPrestataireForm] = useState({
    name: '',
    address: '',
    city: 'Bamako',
    phone: '',
    description: '',
    delivery_time_min: 30,
    minimum_order: 2000,
    delivery_fee: 500,
    cuisine_type: 'malienne',
  });
  const [prestataireLoading, setPrestataireLoading] = useState(false);
  const [prestataireError, setPrestataireError] = useState(null);
  const [prestataireSuccess, setPrestataireSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.food.restaurants
      .list({ limit: 20, search: searchQuery || undefined })
      .then((res) => {
        if (cancelled) return;
        const list = res?.restaurants ?? [];
        if (list.length) {
          setRestaurants(
            list.map((r) => ({
              id: r.id,
              name: r.name,
              cuisine_type: Array.isArray(r.cuisine_type) ? r.cuisine_type : [r.cuisine_type].filter(Boolean),
              cuisineLabel: Array.isArray(r.cuisine_type) ? r.cuisine_type[0] || 'Restaurant' : (r.cuisine_type || 'Restaurant'),
              rating: r.rating ?? 4.5,
              total_reviews: r.total_reviews ?? 0,
              delivery_time_min: r.delivery_time_min ?? 30,
              address: r.address || r.city || '',
              city: r.city || 'Bamako',
              delivery_fee: r.delivery_fee ?? 500,
              minimum_order: r.minimum_order ?? 2000,
              is_open: r.is_open !== false,
              banner_url: r.banner_url || r.logo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            }))
          );
        } else {
          setRestaurants(MOCK_RESTAURANTS);
        }
      })
      .catch(() => {
        if (!cancelled) setRestaurants(MOCK_RESTAURANTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchQuery]);

  const filteredRestaurants =
    selectedCategory === 'all'
      ? restaurants
      : restaurants.filter((r) => {
          const types = r.cuisine_type || [];
          return types.some((c) => String(c).toLowerCase() === selectedCategory);
        });

  const firstRestaurant = filteredRestaurants[0];
  const firstRestaurantId = firstRestaurant?.id;

  useEffect(() => {
    if (!firstRestaurantId) return;
    let cancelled = false;
    api.food.menuItems
      .listByRestaurant(firstRestaurantId)
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : items?.menu_items || items?.data || [];
        if (list.length) {
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: list }));
        } else {
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: MOCK_MENU_ITEMS }));
        }
      })
      .catch(() => {
        if (!cancelled)
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: MOCK_MENU_ITEMS }));
      });
    return () => { cancelled = true; };
  }, [firstRestaurantId]);

  const popularMenuItems = (firstRestaurantId && menuItemsByRestaurant[firstRestaurantId]) || MOCK_MENU_ITEMS;

  const handlePrestataireSubmit = async (e) => {
    e.preventDefault();
    if (!prestataireForm.name?.trim() || !prestataireForm.address?.trim() || !prestataireForm.phone?.trim()) {
      setPrestataireError('Veuillez remplir le nom, l\'adresse et le téléphone.');
      return;
    }
    setPrestataireError(null);
    setPrestataireLoading(true);
    try {
      await api.food.restaurants.create({
        name: prestataireForm.name.trim(),
        address: prestataireForm.address.trim(),
        city: prestataireForm.city?.trim() || undefined,
        phone: prestataireForm.phone.trim(),
        description: prestataireForm.description?.trim() || undefined,
        delivery_time_min: Number(prestataireForm.delivery_time_min) || 30,
        minimum_order: Number(prestataireForm.minimum_order) || 0,
        delivery_fee: Number(prestataireForm.delivery_fee) || 0,
        cuisine_type: [prestataireForm.cuisine_type].filter(Boolean),
      });
      setPrestataireSuccess(true);
      setPrestataireForm({
        name: '',
        address: '',
        city: 'Bamako',
        phone: '',
        description: '',
        delivery_time_min: 30,
        minimum_order: 2000,
        delivery_fee: 500,
        cuisine_type: 'malienne',
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      setPrestataireError(msg || 'Une erreur est survenue. Connectez-vous pour inscrire votre restaurant.');
    } finally {
      setPrestataireLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))} className="flex-shrink-0 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-blue-900">Restauration</h1>
            <p className="text-blue-700 mt-0.5">Commandez vos plats préférés</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un restaurant..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Restaurant cards - horizontal scroll */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Restaurants</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex-shrink-0 w-[280px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="relative h-36">
                    <img
                      src={restaurant.banner_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-xs flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{restaurant.rating}</span>
                      <span>({restaurant.total_reviews})</span>
                    </div>
                    {!restaurant.is_open && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-sm font-medium">
                          Fermé
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900">{restaurant.name}</h3>
                    <p className="text-sm text-gray-500">{restaurant.cuisineLabel}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_min + 10} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{restaurant.address || restaurant.city}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-gray-500 mt-1">
                      <span>Livraison: {formatPrice(restaurant.delivery_fee)}</span>
                      <span>Min: {formatPrice(restaurant.minimum_order)}</span>
                    </div>
                    <Link to={`${createPageUrl('RestaurantMenu')}?id=${restaurant.id}`}>
                      <Button className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-indigo-600 text-white font-semibold text-sm">
                        Commander
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Menu populaire - first restaurant */}
        {firstRestaurant && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-blue-900 mb-3">
              Menu populaire — {firstRestaurant.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {popularMenuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200"
                >
                  <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 truncate">{item.description}</p>
                    )}
                    <p className="text-blue-600 font-bold mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <Link to={`${createPageUrl('RestaurantMenu')}?id=${firstRestaurant.id}`}>
                    <Button
                      size="icon"
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 flex-shrink-0"
                      aria-label="Ajouter au panier"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prestataire - Devenir partenaire */}
        <div className="mt-8">
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 text-center">
            <ChefHat className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Vous êtes restaurateur ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rejoignez AfriWonder et développez votre activité. Votre établissement sera validé par un administrateur avant d’apparaître sur la plateforme.
            </p>
            <Button
              onClick={() => {
                setPrestataireError(null);
                setPrestataireSuccess(false);
                setShowPrestataireModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
            >
              Devenir partenaire
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Prestataire */}
      <Modal
        isOpen={showPrestataireModal}
        onClose={() => {
          setShowPrestataireModal(false);
          setPrestataireSuccess(false);
          setPrestataireError(null);
        }}
        title="Inscrire mon restaurant"
        size="md"
      >
        {prestataireSuccess ? (
          <div className="py-4 text-center">
            <p className="text-blue-600 font-medium">
              Demande enregistrée. Vous serez notifié après validation par l’administrateur.
            </p>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowPrestataireModal(false)}
            >
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-4">
              Renseignez les informations de votre établissement. Un administrateur validera votre inscription avant que le restaurant n’apparaisse sur la plateforme.
            </p>
            {prestataireError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {prestataireError}
              </div>
            )}
            <form onSubmit={handlePrestataireSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du restaurant</label>
                <input
                  type="text"
                  value={prestataireForm.name}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, name: e.target.value })}
                  placeholder="Le Djembe"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={prestataireForm.address}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, address: e.target.value })}
                  placeholder="Hamdallaye, Bamako"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={prestataireForm.city}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, city: e.target.value })}
                  placeholder="Bamako"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={prestataireForm.phone}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, phone: e.target.value })}
                  placeholder="+223 XX XX XX XX"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                <textarea
                  value={prestataireForm.description}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, description: e.target.value })}
                  placeholder="Spécialités, ambiance..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Livraison (F CFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={prestataireForm.delivery_fee}
                    onChange={(e) => setPrestataireForm({ ...prestataireForm, delivery_fee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. commande</label>
                  <input
                    type="number"
                    min={0}
                    value={prestataireForm.minimum_order}
                    onChange={(e) => setPrestataireForm({ ...prestataireForm, minimum_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Délai (min)</label>
                  <input
                    type="number"
                    min={10}
                    value={prestataireForm.delivery_time_min}
                    onChange={(e) => setPrestataireForm({ ...prestataireForm, delivery_time_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de cuisine</label>
                <select
                  value={prestataireForm.cuisine_type}
                  onChange={(e) => setPrestataireForm({ ...prestataireForm, cuisine_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                disabled={prestataireLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
              >
                {prestataireLoading ? 'Envoi en cours...' : 'Soumettre ma demande'}
              </Button>
            </form>
          </>
        )}
      </Modal>

      <BottomNav />
    </div>
  );
}
