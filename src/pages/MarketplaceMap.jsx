import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from '@/lib/utils';
import { api } from '@/api/expressClient';
import BottomNav from '@/components/navigation/BottomNav';
import 'leaflet/dist/leaflet.css';

const MALI_CENTER = [12.6392, -8.0029];

export default function MarketplaceMap() {
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);
  const [userPosition, setUserPosition] = useState(MALI_CENTER);
  const [radiusKm, setRadiusKm] = useState(50);
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    setMapReady(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-map', userPosition[0], userPosition[1], radiusKm, category, maxPrice, verifiedOnly],
    queryFn: async () => {
      try {
        return await api.products.getNearby({
          latitude: userPosition[0],
          longitude: userPosition[1],
          radius_km: radiusKm,
          limit: 200,
          category: category || undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          verified_seller: verifiedOnly || undefined,
        });
      } catch {
        const res = await api.products.list({ page: 1, limit: 200 });
        return res?.products || [];
      }
    },
  });

  const products = Array.isArray(productsData) ? productsData : (productsData?.products || []);
  const productsWithCoords = products.filter((p) => p.latitude != null && p.longitude != null);

  if (!mapReady) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-2 p-3 bg-white border-b z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Marketplace'))}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">Recherche par carte</h1>
        <select
          className="ml-auto border rounded px-2 py-1 text-sm"
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
        >
          <option value={10}>10 km</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
          <option value={100}>100 km</option>
        </select>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Toutes categories</option>
          <option value="electronics">Electronics</option>
          <option value="mode">Mode</option>
          <option value="maison">Maison</option>
          <option value="services">Services</option>
        </select>
        <input
          type="number"
          min="0"
          placeholder="Prix max"
          className="border rounded px-2 py-1 text-sm w-28"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <label className="text-xs flex items-center gap-1 text-gray-600">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          Vendeur verifie
        </label>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={userPosition}
          zoom={6}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {productsWithCoords.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <div className="min-w-[180px]">
                  <img
                    src={getAbsoluteImageUrl(p.images?.[0]) || MARKETPLACE_PLACEHOLDER_IMG}
                    alt={p.name}
                    className="w-full h-20 object-cover rounded mb-2 bg-gray-100"
                    onError={(e) => { e.target.onerror = null; e.target.src = MARKETPLACE_PLACEHOLDER_IMG; }}
                  />
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-orange-600 font-bold text-sm">{p.price?.toLocaleString()} FCFA</p>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate(`${createPageUrl('Product')}?id=${p.id}`)}
                  >
                    Voir
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-center py-2 bg-gray-50 text-gray-500">
        {productsWithCoords.length} produit(s) dans {radiusKm} km
      </p>

      <BottomNav />
    </div>
  );
}
