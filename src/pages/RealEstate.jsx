import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Home, Building2, MapPin, Bed, Bath, Maximize, Heart, Filter } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';

const MOCK_PROPERTIES = [
  { id: 1, title: 'Appartement F3 Plateau', type: 'Appartement', price: 250000, priceType: 'mois', bedrooms: 3, bathrooms: 2, surface: 85, location: 'Plateau, Dakar', images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'], featured: true, verified: true },
  { id: 2, title: 'Villa moderne Almadies', type: 'Villa', price: 15000000, priceType: 'total', bedrooms: 5, bathrooms: 4, surface: 320, location: 'Almadies, Dakar', images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400'], featured: true, verified: true },
  { id: 3, title: 'Studio meuble Mermoz', type: 'Studio', price: 150000, priceType: 'mois', bedrooms: 1, bathrooms: 1, surface: 35, location: 'Mermoz, Dakar', images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'], featured: false, verified: true },
];

export default function RealEstate() {
  const [searchQuery, setSearchQuery] = useState('');
  const [listingType, setListingType] = useState('rent');
  const [properties, setProperties] = useState(MOCK_PROPERTIES);
  const [loading, setLoading] = useState(true);
  const propertyTypes = [
    { id: 'apartment', name: 'Appartement', icon: Building2 },
    { id: 'house', name: 'Maison', icon: Home },
    { id: 'villa', name: 'Villa', icon: Building2 },
    { id: 'studio', name: 'Studio', icon: Home },
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.properties.list({ listing_type: listingType, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.properties ?? [];
        if (list.length) setProperties(list.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.property_type,
          price: p.price,
          priceType: p.listing_type === 'sale' ? 'total' : 'mois',
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          surface: p.surface_area,
          location: [p.neighborhood, p.city].filter(Boolean).join(', ') || p.address,
          images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
          featured: false,
          verified: p.is_verified,
        })));
      })
      .catch(() => { if (!cancelled) setProperties(MOCK_PROPERTIES); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [listingType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}><Button variant="ghost" size="icon" className="text-white"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-xl font-bold text-white">Immobilier</h1>
          <Button variant="ghost" size="icon" className="text-white"><Filter className="w-5 h-5" /></Button>
        </div>
        <div className="px-4 pb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Localisation, quartier..." className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setListingType('rent')} className={listingType === 'rent' ? 'flex-1 bg-gradient-to-r from-blue-500 to-purple-500' : 'flex-1 bg-white/10'}>Location</Button>
            <Button onClick={() => setListingType('sale')} className={listingType === 'sale' ? 'flex-1 bg-gradient-to-r from-blue-500 to-purple-500' : 'flex-1 bg-white/10'}>Vente</Button>
          </div>
        </div>
      </div>
      <div className="p-4 pb-24 space-y-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {propertyTypes.map((type) => {
            const Icon = type.icon;
            return (
              <motion.button key={type.id} whileTap={{ scale: 0.95 }} className="flex-shrink-0 px-4 py-3 bg-white/10 backdrop-blur-md border-white/20 rounded-xl flex items-center gap-2">
                <Icon className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold text-white whitespace-nowrap">{type.name}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/10 backdrop-blur-md border-white/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-white">450+</p><p className="text-xs text-gray-300">Annonces</p></CardContent></Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-white">120+</p><p className="text-xs text-gray-300">Verifiees</p></CardContent></Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20"><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-white">15</p><p className="text-xs text-gray-300">Nouvelles</p></CardContent></Card>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">{listingType === 'rent' ? 'A louer' : 'A vendre'}</h2>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">{properties.length} biens</Badge>
          </div>
          <div className="space-y-4">
            {loading && <p className="text-center text-gray-400 py-4">Chargement...</p>}
            {!loading && properties.map((p) => (
              <Link key={p.id} to={`${createPageUrl('PropertyDetails')}?id=${p.id}`}>
                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl overflow-hidden">
                  <div className="relative">
                    <img src={Array.isArray(p.images) && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'} alt={p.title} className="w-full h-48 object-cover" />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50"><Heart className="w-5 h-5 text-white" /></Button>
                    {p.featured && <Badge className="absolute top-2 left-2 bg-yellow-500">A la une</Badge>}
                    {p.verified && <Badge className="absolute bottom-2 left-2 bg-green-500">Verifie</Badge>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white mb-1">{p.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3"><MapPin className="w-3 h-3" />{p.location}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-300 mb-3">
                      <span><Bed className="w-4 h-4 inline" />{p.bedrooms}</span>
                      <span><Bath className="w-4 h-4 inline" />{p.bathrooms}</span>
                      <span><Maximize className="w-4 h-4 inline" />{p.surface}m2</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-2xl font-bold text-white">{p.price.toLocaleString()} FCFA</p><p className="text-xs text-gray-400">{p.priceType === 'mois' ? '/mois' : ''}</p></div>
                      <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500">Voir details</Button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
        <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-green-400/30">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-2">Vous avez un bien a louer ou vendre ?</h3>
            <p className="text-sm text-gray-300 mb-4">Publiez votre annonce gratuitement</p>
            <Button className="bg-gradient-to-r from-green-500 to-teal-500">Publier une annonce</Button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
