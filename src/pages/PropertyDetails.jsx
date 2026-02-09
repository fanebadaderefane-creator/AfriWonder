import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Bed, Bath, Maximize, Loader2, Phone } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';
import { toast } from 'sonner';

export default function PropertyDetails() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('id');
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.properties.getById(propertyId)
      .then((p) => { if (!cancelled) setProperty(p); })
      .catch((err) => {
        if (!cancelled) toast.error(err?.apiMessage || 'Annonce introuvable');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId]);

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Annonce non sélectionnée.</p>
          <Link to={createPageUrl('RealEstate')}><Button className="mt-4 bg-blue-500">Voir les biens</Button></Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Annonce introuvable.</p>
          <Link to={createPageUrl('RealEstate')}><Button className="mt-4 bg-blue-500">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const images = Array.isArray(property.images) && property.images.length ? property.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];
  const location = [property.address, property.neighborhood, property.city].filter(Boolean).join(', ') || property.address || '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-24">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between p-4">
        <Link to={createPageUrl('RealEstate')}>
          <Button variant="ghost" size="icon" className="text-white"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-lg font-bold text-white truncate max-w-[180px]">Détail du bien</h1>
        <div className="w-10" />
      </div>
      <div className="space-y-0">
        <div className="relative h-56 bg-black/20">
          <img src={images[0]} alt={property.title} className="w-full h-full object-cover" />
          <Badge className="absolute top-2 left-2 bg-blue-500">{property.listing_type === 'rent' ? 'À louer' : 'À vendre'}</Badge>
          {property.is_verified && <Badge className="absolute top-2 right-2 bg-green-500">Vérifié</Badge>}
        </div>
        <div className="p-4 space-y-4">
          <h2 className="text-xl font-bold text-white">{property.title}</h2>
          <div className="flex items-center gap-2 text-gray-300 text-sm"><MapPin className="w-4 h-4 shrink-0" /> {location}</div>
          <div className="flex gap-4 text-sm text-gray-300">
            {property.bedrooms != null && <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {property.bedrooms} ch.</span>}
            {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {property.bathrooms} sdb</span>}
            {property.surface_area != null && <span className="flex items-center gap-1"><Maximize className="w-4 h-4" /> {property.surface_area} m²</span>}
          </div>
          {property.description && <p className="text-gray-300 text-sm leading-relaxed">{property.description}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="text-2xl font-bold text-white">{Number(property.price).toLocaleString()} {property.currency || 'XOF'}</p>
              <p className="text-xs text-gray-400">{property.listing_type === 'rent' ? '/ mois' : ''}</p>
            </div>
            {property.owner_phone && (
              <a href={`tel:${property.owner_phone}`}>
                <Button className="bg-blue-500"><Phone className="w-4 h-4 mr-2" /> Contacter</Button>
              </a>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
