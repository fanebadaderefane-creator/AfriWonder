import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Phone,
  Building2,
  MessageCircle,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const TRANSACTION_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'sale', label: 'Vente' },
  { value: 'rent', label: 'Location' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Tous types' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'office', label: 'Bureau' },
  { value: 'land', label: 'Terrain' },
  { value: 'shop', label: 'Commerce' },
];

// Données fictives AfriWonder — cohérentes avec les maquettes (Mali)
const MOCK_PROPERTIES = [
  {
    id: 'mock-villa-aci',
    _mock: true,
    listing_type: 'sale',
    property_type: 'villa',
    title: 'Villa moderne à ACI 2000',
    address: 'ACI 2000',
    city: 'Bamako',
    neighborhood: 'ACI 2000',
    price: 150000000,
    bedrooms: 4,
    bathrooms: 3,
    surface_area: 250,
    description: 'Belle villa moderne avec toutes les commodités.',
    amenities: ['Piscine', 'Garage', 'Jardin', 'Sécurité 24h'],
    owner_phone: '+223 70 00 00 00',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    status: 'available',
  },
  {
    id: 'mock-apt-badalabougou',
    _mock: true,
    listing_type: 'rent',
    property_type: 'apartment',
    title: 'Appartement F3 à Badalabougou',
    address: 'Badalabougou',
    city: 'Bamako',
    neighborhood: 'Badalabougou',
    price: 250000,
    bedrooms: 2,
    bathrooms: 1,
    surface_area: 85,
    description: 'Appartement bien situé proche des commodités.',
    amenities: ['Climatisation', 'Eau courante', 'Électricité'],
    owner_phone: '+223 76 12 34 56',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    status: 'available',
  },
];

function formatPrice(price, listingType) {
  const n = Number(price);
  const s = n.toLocaleString('fr-FR') + ' FCFA';
  return listingType === 'rent' ? s + '/mois' : s;
}

export default function RealEstate() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState(''); // '' | 'sale' | 'rent'
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [detailProperty, setDetailProperty] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    listing_type: 'rent',
    property_type: 'apartment',
    title: '',
    address: '',
    city: '',
    neighborhood: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    surface_area: '',
    description: '',
    owner_phone: '',
    amenities: [],
  });

  const params = useMemo(() => {
    const p = { limit: 50, page: 1 };
    if (transactionFilter) p.listing_type = transactionFilter;
    if (propertyTypeFilter) p.property_type = propertyTypeFilter;
    if (searchQuery.trim()) p.city = searchQuery.trim();
    return p;
  }, [transactionFilter, propertyTypeFilter, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.properties.list(params)
      .then((res) => {
        if (cancelled) return;
        const list = res?.properties ?? [];
        setProperties(list);
        setPagination(res?.pagination ?? { total: list.length, totalPages: 1 });
      })
      .catch(() => { if (!cancelled) setProperties([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  // Liste affichée : API ou données fictives AfriWonder si vide
  const displayList = useMemo(() => {
    if (properties.length > 0) return properties;
    return MOCK_PROPERTIES.filter((m) => {
      if (transactionFilter && m.listing_type !== transactionFilter) return false;
      if (propertyTypeFilter && m.property_type !== propertyTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return [m.city, m.neighborhood, m.title, m.address].some((s) => s && String(s).toLowerCase().includes(q));
      }
      return true;
    });
  }, [properties, transactionFilter, propertyTypeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = properties.length > 0 ? (pagination.total ?? properties.length) : 1200;
    const sales = transactionFilter === 'sale' ? (properties.length > 0 ? (pagination.total ?? properties.length) : 234) : (transactionFilter === 'rent' ? 0 : 234);
    const rentals = transactionFilter === 'rent' ? (properties.length > 0 ? (pagination.total ?? properties.length) : 890) : (transactionFilter === 'sale' ? 0 : 890);
    return {
      total: total >= 1000 ? (total / 1000).toFixed(1) + 'K+' : String(total) + (total > 0 ? '+' : ''),
      sales: sales >= 1000 ? (sales / 1000).toFixed(1) + 'K+' : String(sales),
      rentals: rentals >= 1000 ? (rentals / 1000).toFixed(1) + 'K+' : String(rentals),
    };
  }, [pagination.total, properties.length, transactionFilter]);

  const openDetail = (p) => {
    if (!p) return;
    if (p._mock) {
      setDetailProperty(p);
      return;
    }
    api.properties.getById(p.id).then(setDetailProperty).catch(() => toast.error('Annonce introuvable'));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour publier une annonce');
      return;
    }
    const { listing_type, property_type, title, address, city, neighborhood, price, bedrooms, bathrooms, surface_area, description, owner_phone, amenities } = createForm;
    if (!title.trim() || !address.trim() || !price) {
      toast.error('Titre, adresse et prix sont requis');
      return;
    }
    setCreateSubmitting(true);
    try {
      const res = await api.properties.create({
        listing_type,
        property_type,
        title: title.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        price: Number(price),
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        surface_area: surface_area ? Number(surface_area) : undefined,
        description: description.trim() || undefined,
        owner_phone: owner_phone.trim() || undefined,
        amenities: Array.isArray(amenities) && amenities.length ? amenities : undefined,
      });
      const msg = (res && typeof res === 'object' && 'message' in res) ? res.message : null;
      toast.success(msg || 'Annonce enregistrée. Vous serez notifié après validation par l\'administrateur.');
      setShowCreateModal(false);
      setCreateForm({ listing_type: 'rent', property_type: 'apartment', title: '', address: '', city: '', neighborhood: '', price: '', bedrooms: '', bathrooms: '', surface_area: '', description: '', owner_phone: '', amenities: [] });
      api.properties.list(params).then((r) => {
        setProperties(r?.properties ?? []);
        setPagination(r?.pagination ?? {});
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de l\'envoi');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" aria-label="Retour"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Immobilier</h1>
            <p className="text-sm text-gray-500">Trouvez votre bien idéal au Mali</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par ville, quartier..."
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex gap-2 mt-3">
            {TRANSACTION_OPTIONS.map((opt) => (
              <Button
                key={opt.value || 'all'}
                variant={transactionFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                className={transactionFilter === opt.value ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700'}
                onClick={() => setTransactionFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value || 'all'}
                variant={propertyTypeFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                className={`flex-shrink-0 ${propertyTypeFilter === opt.value ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700'}`}
                onClick={() => setPropertyTypeFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Cartes stats — couleurs AfriWonder : bleu */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-500">Annonces</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.sales}</p>
              <p className="text-xs text-gray-500">Ventes</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.rentals}</p>
              <p className="text-xs text-gray-500">Locations</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading && <p className="col-span-2 text-center text-gray-500 py-8">Chargement...</p>}
          {!loading && displayList.length === 0 && (
            <p className="col-span-2 text-center text-gray-500 py-8">Aucune annonce pour le moment.</p>
          )}
          {!loading && displayList.map((p) => {
            const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';
            const location = [p.neighborhood, p.city].filter(Boolean).join(', ') || p.address || '';
            const amenitiesList = Array.isArray(p.amenities) ? p.amenities : [];
            const isRent = p.listing_type === 'rent';
            return (
              <Card key={p.id} className="bg-white border-gray-200 overflow-hidden flex flex-col shadow-sm">
                <div className="relative aspect-[4/3] bg-gray-100">
                  <img src={img} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <Badge className="absolute top-2 left-2 text-white text-xs border-0" style={isRent ? { backgroundColor: '#6b7280' } : { backgroundColor: '#2563eb' }}>
                    {isRent ? 'Location' : 'Vente'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <p className="absolute bottom-2 left-2 right-2 text-lg font-bold text-white drop-shadow-md">{formatPrice(p.price, p.listing_type)}</p>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
                  {location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" /> {location}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    {p.bedrooms != null && <span>{p.bedrooms} ch.</span>}
                    {p.bathrooms != null && <span>{p.bathrooms} sdb.</span>}
                    {p.surface_area != null && <span>{p.surface_area} m²</span>}
                  </div>
                  {amenitiesList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {amenitiesList.slice(0, 4).map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{typeof a === 'string' ? a : a}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto pt-2">
                    {p.owner_phone && (
                      <a href={`tel:${p.owner_phone}`}>
                        <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                          <Phone className="w-4 h-4 mr-1" /> Appeler
                        </Button>
                      </a>
                    )}
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" onClick={() => openDetail(p)}>
                      Voir détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Vous avez un bien à louer ou vendre ?</h3>
            <p className="text-sm text-gray-500 mb-4">Publiez votre annonce. Elle sera visible après validation par l'administrateur.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowCreateModal(true)}>
              Publier une annonce
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal Détail */}
      <Modal
        isOpen={!!detailProperty}
        onClose={() => setDetailProperty(null)}
        title={detailProperty?.title}
        size="lg"
      >
        {detailProperty && (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
              <img
                src={Array.isArray(detailProperty.images) && detailProperty.images[0] ? detailProperty.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'}
                alt={detailProperty.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xl font-bold text-blue-600">
                {formatPrice(detailProperty.price, detailProperty.listing_type)}
              </p>
              <Badge className="bg-blue-100 text-blue-700 border-0">Disponible</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {[detailProperty.address, detailProperty.neighborhood, detailProperty.city].filter(Boolean).join(', ') || '—'}
            </div>
            {detailProperty.description && <p className="text-gray-600 text-sm">{detailProperty.description}</p>}
            <div className="grid grid-cols-3 gap-2">
              {detailProperty.bedrooms != null && (
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <Bed className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="font-semibold text-gray-900">{detailProperty.bedrooms}</p>
                  <p className="text-xs text-gray-500">Chambres</p>
                </div>
              )}
              {detailProperty.bathrooms != null && (
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <Bath className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="font-semibold text-gray-900">{detailProperty.bathrooms}</p>
                  <p className="text-xs text-gray-500">Salles de bain</p>
                </div>
              )}
              {detailProperty.surface_area != null && (
                <div className="p-3 rounded-xl bg-gray-50 text-center">
                  <Maximize className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="font-semibold text-gray-900">{detailProperty.surface_area}</p>
                  <p className="text-xs text-gray-500">m²</p>
                </div>
              )}
            </div>
            {Array.isArray(detailProperty.amenities) && detailProperty.amenities.length > 0 && (
              <>
                <h4 className="font-bold text-gray-900">Équipements</h4>
                <div className="flex flex-wrap gap-2">
                  {detailProperty.amenities.map((a) => (
                    <span key={a} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">{typeof a === 'string' ? a : a}</span>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              {detailProperty.owner_phone && (
                <a href={`tel:${detailProperty.owner_phone}`} className="flex-1">
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Phone className="w-4 h-4 mr-2" /> Appeler l'agent
                  </Button>
                </a>
              )}
              <a
                href={detailProperty.owner_phone ? `https://wa.me/${detailProperty.owner_phone.replace(/\D/g, '')}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Publier une annonce */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Publier une annonce" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Transaction</label>
            <select
              value={createForm.listing_type}
              onChange={(e) => setCreateForm((f) => ({ ...f, listing_type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="rent">Location</option>
              <option value="sale">Vente</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type de bien</label>
            <select
              value={createForm.property_type}
              onChange={(e) => setCreateForm((f) => ({ ...f, property_type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PROPERTY_TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            placeholder="Titre de l'annonce *"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            className="border-gray-300"
          />
          <Input
            placeholder="Adresse *"
            value={createForm.address}
            onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
            className="border-gray-300"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Ville" value={createForm.city} onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))} className="border-gray-300" />
            <Input placeholder="Quartier" value={createForm.neighborhood} onChange={(e) => setCreateForm((f) => ({ ...f, neighborhood: e.target.value }))} className="border-gray-300" />
          </div>
          <Input
            type="number"
            placeholder="Prix (FCFA) *"
            value={createForm.price}
            onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
            className="border-gray-300"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Chambres" value={createForm.bedrooms} onChange={(e) => setCreateForm((f) => ({ ...f, bedrooms: e.target.value }))} className="border-gray-300" />
            <Input type="number" placeholder="Sdb" value={createForm.bathrooms} onChange={(e) => setCreateForm((f) => ({ ...f, bathrooms: e.target.value }))} className="border-gray-300" />
            <Input type="number" placeholder="m²" value={createForm.surface_area} onChange={(e) => setCreateForm((f) => ({ ...f, surface_area: e.target.value }))} className="border-gray-300" />
          </div>
          <Textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="border-gray-300 min-h-[80px]" />
          <Input placeholder="Téléphone de contact" value={createForm.owner_phone} onChange={(e) => setCreateForm((f) => ({ ...f, owner_phone: e.target.value }))} className="border-gray-300" />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createSubmitting}>
              {createSubmitting ? 'Envoi...' : 'Publier'}
            </Button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}
