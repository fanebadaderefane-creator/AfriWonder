import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';

/** Phase 1: pas de paiement sur AfriWonder — revenus via abonnements prestataires uniquement */
const MARKETPLACE_PHASE1 = import.meta.env.VITE_MARKETPLACE_PHASE1_NO_PAYMENT === 'true';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, MapPin, CreditCard, Package, AlertCircle, 
  Plus, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

const paymentIcons = {
  orange_money: 'OM',
  moov_money: 'MM',
  card: 'CB',
  wallet: 'W',
  cod: 'COD',
};

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // Form states
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [saveAddress, setSaveAddress] = useState(false);
  
  // Guest checkout
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });

  // New address form
  const [newAddress, setNewAddress] = useState({
    label: 'Maison',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    is_default: false
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        setNewAddress(prev => ({ ...prev, full_name: u.full_name }));
      } catch (_e) {
        setIsGuest(true);
      }
    };
    getUser();
  }, []);

  // Phase 1: redirection vers le panier (boutons WhatsApp par vendeur)
  useEffect(() => {
    if (MARKETPLACE_PHASE1) {
      navigate(createPageUrl('Cart'), { replace: true });
    }
  }, [MARKETPLACE_PHASE1, navigate]);

  const { data: cart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => api.cart.get(),
    enabled: !!user?.id
  });

  const { data: cartBreakdown } = useQuery({
    queryKey: ['cart', 'breakdown', user?.id],
    queryFn: () => api.cart.getBreakdown(),
    enabled: !!user?.id && !!(cart?.items?.length)
  });

  const { data: addressesRaw } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => api.addresses.list(),
    enabled: !!user?.id
  });
  const rawList = Array.isArray(addressesRaw) ? addressesRaw : (addressesRaw?.data ?? addressesRaw ?? []);
  const addresses = Array.isArray(rawList) ? rawList.map((a) => ({
    id: a.id,
    address_line1: a.street,
    city: a.city,
    postal_code: a.postal_code,
    phone: a.phone,
    label: a.type || 'Adresse',
    is_default: a.is_default,
    full_name: user?.full_name,
  })) : [];

  const { data: commissionConfig } = useQuery({
    queryKey: ['commissions-config'],
    queryFn: async () => {
      const { getCommissionConfig, formatCommissionRate } = await import('@/utils/commissions');
      const c = await getCommissionConfig();
      const data = c?.data ?? c;
      const rate = data?.marketplace?.seller_commission_default_pct ?? 0.1;
      return { rate, rateLabel: formatCommissionRate(rate) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveAddressMutation = useMutation({
    mutationFn: async (addressData) => {
      const created = await api.addresses.create({
        street: addressData.address_line1,
        city: addressData.city,
        postal_code: addressData.postal_code || undefined,
        phone: addressData.phone || undefined,
        type: addressData.label || 'shipping',
        is_default: addressData.is_default ?? false,
      });
      return created;
    },
    onSuccess: (address) => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      setSelectedAddress(address?.id);
      setShowNewAddress(false);
      toast.success('Adresse enregistrée');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const createOrdersMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Vous devez être connecté');
      if (!isGuest && !selectedAddress && !showNewAddress) {
        throw new Error('Veuillez sélectionner une adresse de livraison');
      }

      const shippingCity = isGuest
        ? guestInfo.city
        : showNewAddress
          ? newAddress.city
          : (() => {
              const addr = addresses.find((a) => a.id === selectedAddress);
              return addr?.city || newAddress.city;
            })();

      const shippingAddress = isGuest
        ? `${guestInfo.address}, ${guestInfo.city}`
        : showNewAddress
          ? `${newAddress.address_line1}, ${newAddress.city}`
          : (() => {
              const addr = addresses.find((a) => a.id === selectedAddress);
              return addr ? `${addr.address_line1}, ${addr.city}` : (newAddress.address_line1 ? `${newAddress.address_line1}, ${newAddress.city}` : '');
            })();

      if (!shippingAddress?.trim()) {
        throw new Error('Veuillez renseigner une adresse de livraison');
      }

      const result = await api.orders.create({
        shipping_address: shippingAddress,
        shipping_city: shippingCity || undefined,
        payment_method: paymentMethod || 'orange_money',
      });

      const orders = result.orders || (result.id ? [result] : []);
      return Array.isArray(orders) ? orders : [result];
    },
    onSuccess: (orders) => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast.success(orders.length > 1 ? 'Commandes créées avec succès !' : 'Commande créée avec succès !');
      navigate(`/OrderTracking?id=${orders[0]?.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de la commande');
    }
  });

  const handleSubmit = async () => {
    // Validation
    if (isGuest) {
      if (!guestInfo.name || !guestInfo.email || !guestInfo.phone || !guestInfo.address || !guestInfo.city) {
        toast.error('Veuillez remplir tous les champs');
        return;
      }
    } else if (showNewAddress) {
      if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.city) {
        toast.error('Veuillez remplir tous les champs de l\'adresse');
        return;
      }
      
      if (saveAddress) {
        await saveAddressMutation.mutateAsync({ ...newAddress, is_default: saveAddress });
      }
    }

    createOrdersMutation.mutate();
  };

  const items = cart?.items || [];
  const feesBySeller = cartBreakdown?.feesBySeller || [];
  const totalFees = cartBreakdown?.totalFees ?? 0;
  const calculateTotals = () => {
    const subtotal = cart?.subtotal ?? (items.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0);
    const deliveryFee = items.length > 0 ? 1000 : 0;
    const tax = 0;
    const platformFees = totalFees || 0;
    const total = subtotal + deliveryFee + platformFees;
    return { subtotal, deliveryFee, tax, total, platformFees };
  };

  if (MARKETPLACE_PHASE1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (user && cart === undefined)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { subtotal, deliveryFee, tax, total, platformFees } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Finaliser la commande</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Guest Checkout Option */}
        {isGuest && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Commander en tant qu'invité</h3>
              <Button variant="link" onClick={() => navigate('/')}>
                Se connecter
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={guestInfo.name}
                  onChange={(e) => setGuestInfo({...guestInfo, name: e.target.value})}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                  placeholder="jean@example.com"
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div>
                <Label>Adresse *</Label>
                <Input
                  value={guestInfo.address}
                  onChange={(e) => setGuestInfo({...guestInfo, address: e.target.value})}
                  placeholder="123 Rue de la Paix"
                />
              </div>
              <div>
                <Label>Ville *</Label>
                <Input
                  value={guestInfo.city}
                  onChange={(e) => setGuestInfo({...guestInfo, city: e.target.value})}
                  placeholder="Dakar"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Delivery Address (for logged-in users) */}
        {!isGuest && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adresse de livraison
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewAddress(!showNewAddress)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle
              </Button>
            </div>

            {showNewAddress ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Libellé</Label>
                    <Input
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Nom complet *</Label>
                    <Input
                      value={newAddress.full_name}
                      onChange={(e) => setNewAddress({...newAddress, full_name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Adresse *</Label>
                  <Input
                    value={newAddress.address_line1}
                    onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                    placeholder="Numéro et nom de rue"
                  />
                </div>
                <div>
                  <Label>Complément d'adresse</Label>
                  <Input
                    value={newAddress.address_line2}
                    onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                    placeholder="Appartement, étage, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ville *</Label>
                    <Input
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({...newAddress, postal_code: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={saveAddress}
                    onCheckedChange={setSaveAddress}
                    id="save-address"
                  />
                  <Label htmlFor="save-address" className="text-sm">
                    Enregistrer cette adresse
                  </Label>
                </div>
              </div>
            ) : (
              <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                {addresses.map((addr) => (
                  <div key={addr.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <RadioGroupItem value={addr.id} id={addr.id} />
                    <label htmlFor={addr.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{addr.label}</div>
                      {(addr.full_name || addr.phone) && (
                        <div className="text-sm text-gray-600">
                          {[addr.full_name, addr.phone].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {addr.address_line1}, {addr.city}
                      </div>
                    </label>
                    {addr.is_default && (
                      <Badge className="bg-green-100 text-green-700">Par défaut</Badge>
                    )}
                  </div>
                ))}
              </RadioGroup>
            )}
          </Card>
        )}

        {/* Payment Method */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5" />
            Mode de paiement
          </h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-2">
              {[
                { id: 'orange_money', label: 'Orange Money', hint: 'Paiement mobile instantané' },
                { id: 'moov_money', label: 'Moov Money', hint: 'Paiement mobile Moov' },
                { id: 'card', label: 'Carte bancaire', hint: 'Visa / Mastercard (Stripe)' },
                { id: 'wallet', label: 'Portefeuille', hint: 'Payer depuis votre solde AfriWonder' },
                { id: 'cod', label: 'Paiement à la livraison', hint: 'Règlement au livreur' },
              ].map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${paymentMethod === m.id ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}
                >
                  <RadioGroupItem value={m.id} id={m.id} />
                  <label htmlFor={m.id} className="flex-1 cursor-pointer flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{paymentIcons[m.id]}</span>
                      <span className="font-medium">{m.label}</span>
                    </span>
                    <span className="text-xs text-gray-500">{m.hint}</span>
                  </label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        {/* Order Summary */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Package className="w-5 h-5" />
            Résumé de la commande
          </h3>
          
          <div className="space-y-3 mb-4">
            {items.map((item, idx) => (
              <div key={item.productId || item.product_id || idx} className="flex gap-3">
                <img
                  src={item.image || item.product_image}
                  alt={item.name || item.product_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm line-clamp-2">{item.name || item.product_name}</p>
                  <p className="text-xs text-gray-500">Qté: {item.quantity}</p>
                  <p className="font-semibold text-orange-500">
                    {(item.price * item.quantity).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{subtotal.toLocaleString()} FCFA</span>
            </div>
            {feesBySeller.length > 0 && (
              <div className="text-gray-600">Commission plateforme ({commissionConfig?.rateLabel ?? '10 %'}) — AfriWonder</div>
            )}
            {feesBySeller.map((f) => (
              <div key={f.sellerId} className="flex justify-between pl-2 text-xs text-gray-500">
                <span>Vendeur: {f.itemCount} article(s)</span>
                <span>{f.platformFee?.toLocaleString?.() ?? f.platformFee} FCFA</span>
              </div>
            ))}
            {platformFees > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frais plateforme total</span>
                <span className="font-medium">{platformFees.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Frais de livraison</span>
              <span className="font-medium">{deliveryFee.toLocaleString()} FCFA</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes</span>
                <span className="font-medium">{tax.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-orange-500">{total.toLocaleString()} FCFA</span>
            </div>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <p>
            Vos fonds seront sécurisés en escrow et libérés au vendeur uniquement après 
            confirmation de réception de votre commande.
          </p>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
        <Button
          onClick={handleSubmit}
          disabled={createOrdersMutation.isPending}
          className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-500 text-lg"
        >
          {createOrdersMutation.isPending ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Confirmer la commande ({total.toLocaleString()} FCFA)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
