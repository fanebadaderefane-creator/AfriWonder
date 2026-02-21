import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Search, ShoppingCart, Heart, Star, Filter, Grid3X3, 
  List, MapPin, Shield, Truck, Package, FileDigit,
  Plus, Minus, Trash2, CreditCard, Lock, Eye, EyeOff
} from "lucide-react";
import { mockStores, mockProducts, mockLiveStreams, mockGifts, mockCoinPackages, mockVIPLevels } from "@/lib/mock-data";
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import ServicesPage from "./Services";

const CATEGORIES = [
  { id: "all", name: "Tout", icon: Grid3X3 },
  { id: "smartphones", name: "Smartphones", icon: Package },
  { id: "laptops", name: "Laptops", icon: Package },
  { id: "accessories", name: "Accessoires", icon: Package },
  { id: "tissus", name: "Tissus", icon: Package },
  { id: "bijoux", name: "Bijoux", icon: Package },
  { id: "vetements", name: "Vetements", icon: Package },
  { id: "ebooks", name: "Ebooks", icon: FileDigit },
  { id: "formations", name: "Formations", icon: FileDigit },
];

const PAYMENT_METHODS = [
  { id: "orange_money", name: "Orange Money", color: "bg-orange-500", icon: "🟠" },
  { id: "mtn_money", name: "MTN Mobile", color: "bg-yellow-500", icon: "🟡" },
  { id: "wave", name: "Wave", color: "bg-blue-500", icon: "🔵" },
  { id: "moov_money", name: "Moov Money", color: "bg-green-500", icon: "🟢" },
];

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam === "marketplace" ? "marketplace" : "services"
  );

  // `tab=live` est retiré: on nettoie l'URL et on revient sur le marketplace standard.
  useEffect(() => {
    if (tabParam === "live") {
      setSearchParams({}, { replace: true });
      setActiveTab("services");
    } else if (tabParam === "marketplace") {
      setActiveTab("marketplace");
    } else {
      setActiveTab("services");
    }
  }, [tabParam, setSearchParams]);
  const [activeSection, setActiveSection] = useState("products");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState("orange_money");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [userCoins, setUserCoins] = useState(2500);
  const [userVIPLevel, setUserVIPLevel] = useState(2);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedLive, setSelectedLive] = useState(null);

  // Filter products
  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = selectedCategory === "all" || 
      product.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      product.subcategory.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && product.status === "active";
  });

  // Get store for product
  const getStore = (storeId) => mockStores.find(s => s.id === storeId);

  // Add to cart
  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        id: `cart_${Date.now()}`,
        productId: product.id,
        product,
        quantity
      }]);
    }
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Update quantity
  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Cart totals
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const platformFee = Math.round(cartTotal * 0.05); // 5% escrow fee
  const escrowAmount = cartTotal;

  // Place order
  const placeOrder = () => {
    setOrderPlaced(true);
    setShowCheckout(false);
    setCart([]);
    setTimeout(() => {
      setOrderPlaced(false);
      setShowCart(false);
    }, 3000);
  };

  // Send gift
  const sendGift = (gift) => {
    if (userCoins >= gift.valueCoins) {
      setUserCoins(userCoins - gift.valueCoins);
      // Update VIP level based on coins spent
      const newLevel = mockVIPLevels.findIndex(vip => vip.minCoins > userCoins - gift.valueCoins);
      if (newLevel > 0) setUserVIPLevel(newLevel - 1);
    }
  };

  // Get VIP badge color
  const getVIPColor = (level) => mockVIPLevels[level]?.badgeColor || "#9CA3AF";

  if (activeTab === "services") {
    return <ServicesPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">🛒 Marketplace</h1>
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("services")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    activeTab === "services" ? "bg-white text-orange-600" : "text-white/80 hover:text-white"
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => setActiveTab("marketplace")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    activeTab === "marketplace" ? "bg-white text-orange-600" : "text-white/80 hover:text-white"
                  }`}
                >
                  Boutique
                </button>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher produits, boutiques..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 border border-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:bg-white/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCoins(true)}
                className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg"
              >
                <span className="text-yellow-300">🪙</span>
                <span className="text-sm font-medium">{userCoins.toLocaleString('fr-FR')}</span>
              </button>
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-white/10 rounded-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "marketplace" ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-600 hover:bg-orange-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Section Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection("products")}
                className={`text-sm font-medium pb-2 border-b-2 transition ${
                  activeSection === "products"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Produits ({filteredProducts.length})
              </button>
              <button
                onClick={() => setActiveSection("stores")}
                className={`text-sm font-medium pb-2 border-b-2 transition ${
                  activeSection === "stores"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Boutiques ({mockStores.length})
              </button>
            </div>
            <div className="flex gap-1 bg-white rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-orange-100 text-orange-600" : "text-gray-400"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-orange-100 text-orange-600" : "text-gray-400"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {activeSection === "products" && (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              : "flex flex-col gap-4"
            }>
              {filteredProducts.map(product => {
                const store = getStore(product.storeId);
                const discount = product.originalPrice 
                  ? Math.round((1 - product.price / product.originalPrice) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer ${
                      viewMode === "list" ? "flex" : ""
                    }`}
                  >
                    <div className={`relative min-h-[140px] bg-gray-100 ${viewMode === "grid" ? "aspect-square w-full" : "w-48 h-48 shrink-0"}`}>
                      <img
                        src={getAbsoluteImageUrl(product.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                      />
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          -{discount}%
                        </span>
                      )}
                      {product.type === "digital" && (
                        <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                          📱 Digital
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h3>
                      <p className="text-xs text-gray-500 mb-2">{store?.name}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-600">{product.rating}</span>
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-orange-600">{product.price.toLocaleString('fr-FR')} XOF</span>
                          {product.originalPrice && (
                            <span className="text-xs text-gray-400 line-through ml-2">
                              {product.originalPrice.toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stores Grid */}
          {activeSection === "stores" && (
            <div className="grid md:grid-cols-2 gap-4">
              {mockStores.map(store => (
                <div key={store.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="h-32 bg-gradient-to-r from-orange-500 to-orange-600 relative">
                    <img
                      src={store.coverImage}
                      alt={store.name}
                      className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-16 h-16 rounded-xl border-4 border-white shadow-lg"
                      />
                    </div>
                    {store.verified && (
                      <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verifié
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{store.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{store.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{store.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {store.productsCount} produits
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {store.location}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full">
                      Voir la boutique
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* LIVE STREAM SECTION */
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Live Shopping</h2>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">{mockLiveStreams.filter(l => l.status === "live").length} lives en cours</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockLiveStreams.map(live => (
              <div
                key={live.id}
                onClick={() => { setSelectedLive(live); setShowGiftModal(true); }}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="relative aspect-video">
                  <img
                    src={live.thumbnail}
                    alt={live.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                    {live.isBattle && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                        ⚔️ BATTLE
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={live.creatorAvatar}
                        alt={live.creatorName}
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                      <span className="text-white font-medium text-sm">{live.creatorName}</span>
                    </div>
                    <p className="text-white text-sm line-clamp-1">{live.title}</p>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      👁️ {live.viewersCount.toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      ❤️ {live.likesCount.toLocaleString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1">
                      🎁 {live.giftsValue.toLocaleString('fr-FR')} XOF
                    </span>
                    <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                      {live.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => { setSelectedProduct(null); setQuantity(1); }}
        title={selectedProduct?.title}
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-1/2 min-h-[160px] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={getAbsoluteImageUrl(selectedProduct.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                  alt={selectedProduct.title}
                  className="w-full aspect-square object-cover rounded-lg"
                  onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                />
              </div>
              <div className="w-1/2 space-y-3">
                <div className="flex items-center gap-2">
                  <img
                    src={getStore(selectedProduct.storeId)?.logo}
                    alt=""
                    className="w-8 h-8 rounded"
                  />
                  <span className="text-sm text-gray-600">{getStore(selectedProduct.storeId)?.name}</span>
                  {getStore(selectedProduct.storeId)?.verified && (
                    <Shield className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm">{selectedProduct.rating}</span>
                  <span className="text-xs text-gray-500">({selectedProduct.reviewCount} avis)</span>
                </div>

                <div className="text-2xl font-bold text-orange-600">
                  {selectedProduct.price.toLocaleString('fr-FR')} XOF
                  {selectedProduct.originalPrice && (
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {selectedProduct.originalPrice.toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600">{selectedProduct.description}</p>

                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${selectedProduct.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selectedProduct.stock > 0 ? `En stock (${selectedProduct.stock})` : "Rupture de stock"}
                  </span>
                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-700">
                    {selectedProduct.type === "digital" ? "📱 Téléchargement" : "🚚 Livraison"}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button onClick={() => addToCart(selectedProduct)} className="flex-1">
                    Ajouter au panier
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cart Modal */}
      <Modal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        title="Panier"
        size="lg"
      >
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Votre panier est vide</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={getAbsoluteImageUrl(item.product.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                      alt={item.product.title}
                      className="w-16 h-16 object-cover rounded bg-gray-100"
                      onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{item.product.title}</h4>
                      <p className="text-orange-600 font-bold">{item.product.price.toLocaleString('fr-FR')} XOF</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 bg-white rounded hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 bg-white rounded hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="ml-auto text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{cartTotal.toLocaleString('fr-FR')} XOF</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Frais de plateforme (5%)</span>
                  <span>{platformFee.toLocaleString('fr-FR')} XOF</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total (Escrow)</span>
                  <span className="text-orange-600">{escrowAmount.toLocaleString('fr-FR')} XOF</span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Paiement securise par escrow
                </p>
              </div>

              <Button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="w-full">
                Passer la commande
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Paiement"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex justify-between font-bold mb-2">
              <span>Total a payer</span>
              <span className="text-orange-600">{escrowAmount.toLocaleString('fr-FR')} XOF</span>
            </div>
            <p className="text-xs text-gray-600">
              <Lock className="w-3 h-3 inline mr-1" />
              L'argent sera bloque en escrow jusqu'a confirmation de reception
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPayment(pm.id)}
                  className={`p-3 rounded-lg border-2 flex items-center gap-2 transition ${
                    selectedPayment === pm.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl">{pm.icon}</span>
                  <span className="text-sm font-medium">{pm.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Adresse de livraison</label>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Ville, quartier, rue..."
              className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800">
            <strong>💡 Comment ca marche:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Vous payez via Mobile Money</li>
              <li>L'argent est bloque en escrow</li>
              <li>Le vendeur expédie votre commande</li>
              <li>Vous confirmez reception</li>
              <li>Le vendeur recoit son paiement</li>
            </ol>
          </div>

          <Button onClick={placeOrder} className="w-full">
            Confirmer la commande
          </Button>
        </div>
      </Modal>

      {/* Order Success */}
      {orderPlaced && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Commande passee!</h3>
            <p className="text-gray-600 text-sm mb-4">
              Votre paiement est en attente de confirmation. Vous recevrez une notification quand le vendeur expediera.
            </p>
          </div>
        </div>
      )}

      {/* Coins Modal */}
      <Modal
        isOpen={showCoins}
        onClose={() => setShowCoins(false)}
        title="Mes Coins"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white text-center">
            <p className="text-sm opacity-80">Solde disponible</p>
            <p className="text-4xl font-bold my-2">{userCoins.toLocaleString('fr-FR')}</p>
            <p className="text-sm">🪙 Coins</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Niveau VIP</p>
              <p className="text-xs text-gray-500">Reduction: {mockVIPLevels[userVIPLevel].commissionPercent}%</p>
            </div>
            <div 
              className="px-3 py-1 rounded-full text-white font-bold"
              style={{ backgroundColor: getVIPColor(userVIPLevel) }}
            >
              {mockVIPLevels[userVIPLevel].name}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Acheter des coins</h4>
            <div className="space-y-2">
              {mockCoinPackages.map(pkg => (
                <button
                  key={pkg.id}
                  className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition ${
                    pkg.popular 
                      ? "border-orange-500 bg-orange-50" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🪙</span>
                    <div className="text-left">
                      <p className="font-medium">{pkg.amountCoins.toLocaleString('fr-FR')} coins</p>
                      {pkg.bonusCoins > 0 && (
                        <p className="text-xs text-green-600">+{pkg.bonusCoins} bonus!</p>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-orange-600">{pkg.priceCfa.toLocaleString('fr-FR')} XOF</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Gift Modal */}
      <Modal
        isOpen={showGiftModal}
        onClose={() => { setShowGiftModal(false); setSelectedLive(null); }}
        title={selectedLive ? `Envoyer un cadeau - ${selectedLive.creatorName}` : "Envoyer un cadeau"}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <img
              src={selectedLive?.creatorAvatar}
              alt=""
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-medium">{selectedLive?.creatorName}</p>
              <p className="text-xs text-gray-500">{selectedLive?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Votre solde:</span>
            <span className="font-bold text-yellow-600">{userCoins.toLocaleString('fr-FR')} 🪙</span>
          </div>

          <div>
            <h4 className="font-medium mb-3">Choisir un cadeau</h4>
            <div className="grid grid-cols-4 gap-2">
              {mockGifts.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift)}
                  disabled={userCoins < gift.valueCoins}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center transition ${
                    userCoins >= gift.valueCoins
                      ? gift.rarity === "legendary" 
                        ? "border-yellow-400 bg-yellow-50 hover:bg-yellow-100"
                        : gift.rarity === "epic"
                          ? "border-orange-400 bg-orange-50 hover:bg-orange-100"
                          : gift.rarity === "rare"
                            ? "border-orange-300 bg-orange-50 hover:bg-orange-100"
                            : "border-gray-200 hover:border-gray-300"
                      : "border-gray-200 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="text-2xl">{gift.icon}</span>
                  <span className="text-xs mt-1">{gift.name}</span>
                  <span className="text-xs text-yellow-600">{gift.valueCoins}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
