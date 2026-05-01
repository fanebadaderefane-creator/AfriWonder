/**
 * Écran Ride tracking live — passager voit la position de son chauffeur en temps réel.
 *
 * Socket events :
 *   - ride:join {rideId}
 *   - ride:location {rideId, driverId, lat, lng, heading, speed, timestamp}
 *   - ride:status {rideId, status, eta_min, timestamp}
 *
 * Carte via react-native-maps. Sur web, on affiche les coordonnées + distance.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { RideMap } from '../../src/components/rides/RideMap';
import apiClient from '../../src/api/client';
import rideTrackingService, { RideLocationEvent, RideStatusEvent } from '../../src/services/rideTrackingService';

interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_avatar?: string | null;
  vehicle_type: string;
  pickup_location: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_location: string;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  price?: number | null;
  currency: string;
  status: string;
  rating?: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'Recherche d\'un chauffeur...',
  accepted: 'Chauffeur en route',
  arriving: 'Votre chauffeur arrive',
  in_progress: 'En route vers la destination',
  completed: 'Trajet terminé',
  cancelled: 'Annulé',
};

/**
 * Calcule la distance en km entre 2 coords (formule de Haversine).
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RideTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const mapRef = useRef<unknown>(null);

  const loadRide = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/rides/${encodeURIComponent(id)}`);
      const data = res.data?.data as Ride;
      setRide(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger ce trajet.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadRide(); }, [loadRide]);

  // Rejoindre la room socket + écouter les events
  useEffect(() => {
    if (!id) return;
    rideTrackingService.joinRide(id);
    const offLoc = rideTrackingService.onLocation((e: RideLocationEvent) => {
      if (e.rideId !== id) return;
      setDriverPosition({ lat: e.lat, lng: e.lng, heading: e.heading });
    });
    const offStatus = rideTrackingService.onStatus((e: RideStatusEvent) => {
      if (e.rideId !== id) return;
      setRide((prev) => (prev ? { ...prev, status: e.status } : prev));
      if (typeof e.eta_min === 'number') setEtaMin(e.eta_min);
    });
    return () => {
      offLoc();
      offStatus();
      rideTrackingService.leaveRide(id);
    };
  }, [id]);

  const callDriver = () => {
    if (!ride?.driver_phone) {
      Alert.alert('Numéro indisponible', 'Le numéro du chauffeur n\'est pas encore disponible.');
      return;
    }
    Linking.openURL(`tel:${ride.driver_phone}`);
  };

  const chatWithDriver = () => {
    if (!ride?.driver_id) return;
    router.push({ pathname: '/messages/[id]', params: { id: ride.driver_id } } as never);
  };

  const distanceToDest = useMemo(() => {
    if (!driverPosition || !ride?.dropoff_lat || !ride?.dropoff_lng) return null;
    return haversineKm(driverPosition.lat, driverPosition.lng, ride.dropoff_lat, ride.dropoff_lng);
  }, [driverPosition, ride?.dropoff_lat, ride?.dropoff_lng]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: Colors.text }}>Trajet introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.mapWrap, { paddingTop: insets.top }]}>
        <RideMap
          mapRef={mapRef}
          pickupLat={ride.pickup_lat ?? undefined}
          pickupLng={ride.pickup_lng ?? undefined}
          dropoffLat={ride.dropoff_lat ?? undefined}
          dropoffLng={ride.dropoff_lng ?? undefined}
          driverLat={driverPosition?.lat}
          driverLng={driverPosition?.lng}
        />
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{STATUS_LABEL[ride.status] || ride.status}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {etaMin ? (
          <View style={styles.etaBox}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.etaText}>Arrivée dans ~{etaMin} min</Text>
            {distanceToDest != null ? (
              <Text style={styles.etaDistance}>· {distanceToDest.toFixed(1)} km restants</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.driverRow}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={28} color="#999" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{ride.driver_name || 'Chauffeur AfriWonder'}</Text>
            <Text style={styles.driverVehicle}>{ride.vehicle_type === 'moto' ? '🏍️ Moto' : '🚗 Voiture'} · {ride.distance_km?.toFixed(1) ?? '—'} km</Text>
          </View>
          <TouchableOpacity style={styles.circleBtn} onPress={callDriver}>
            <Ionicons name="call" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, { backgroundColor: Colors.primary }]} onPress={chatWithDriver}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tripBox}>
          <View style={styles.tripRow}>
            <View style={[styles.tripDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.tripLocation} numberOfLines={2}>{ride.pickup_location}</Text>
          </View>
          <View style={styles.tripLine} />
          <View style={styles.tripRow}>
            <View style={[styles.tripDot, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.tripLocation} numberOfLines={2}>{ride.dropoff_location}</Text>
          </View>
        </View>

        {ride.price != null ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix estimé</Text>
            <Text style={styles.priceValue}>{ride.price.toLocaleString('fr-FR')} {ride.currency}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  ghostBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  ghostBtnText: { color: Colors.text, fontWeight: '600' },

  mapWrap: { flex: 1 },

  topBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, alignItems: 'center' },
  statusPillText: { color: '#111', fontWeight: '700', fontSize: FontSizes.md },

  bottomSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  etaBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  etaText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.md },
  etaDistance: { color: Colors.textSecondary, fontSize: FontSizes.sm },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  driverName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  driverVehicle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },

  tripBox: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tripDot: { width: 10, height: 10, borderRadius: 5 },
  tripLine: { width: 2, height: 20, backgroundColor: Colors.border, marginLeft: 4 },
  tripLocation: { flex: 1, color: Colors.text, fontSize: FontSizes.md },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  priceLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  priceValue: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: '800' },
});
