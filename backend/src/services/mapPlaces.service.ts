import prisma from '../config/database.js';

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export const mapPlacesService = {
  async listNearby(lat: number, lng: number, radiusKm: number, category?: string, limit = 100) {
    const delta = radiusKm / 111;
    const places = await prisma.mapPlace.findMany({
      where: {
        latitude: { gte: lat - delta, lte: lat + delta },
        longitude: { gte: lng - delta, lte: lng + delta },
        ...(category ? { category } : {}),
      },
      take: limit * 2,
      orderBy: { created_at: 'desc' },
    });
    type PlaceWithDist = (typeof places)[number] & { distance_km: number };
    const withDist = places
      .map((p: (typeof places)[number]) => ({ ...p, distance_km: haversineKm(lat, lng, p.latitude, p.longitude) }))
      .filter((p: PlaceWithDist) => p.distance_km <= radiusKm)
      .sort((a: PlaceWithDist, b: PlaceWithDist) => a.distance_km - b.distance_km)
      .slice(0, limit);
    return { items: withDist, total: withDist.length };
  },

  async create(data: { name: string; category: string; address?: string; latitude: number; longitude: number; description?: string; image_url?: string }) {
    return prisma.mapPlace.create({
      data: {
        name: data.name,
        category: data.category,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        image_url: data.image_url,
      },
    });
  },
};
