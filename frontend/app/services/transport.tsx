import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import { driversApi, ridesApi, Driver } from '../../src/api/ridesApi';

const VEHICLE_TYPES: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'moto', name: 'Moto', icon: 'bicycle-outline' },
  { id: 'taxi', name: 'Taxi', icon: 'car-outline' },
  { id: 'comfort', name: 'Confort', icon: 'car-sport-outline' },
  { id: 'van', name: 'Van', icon: 'bus-outline' },
];

export default function TransportScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Transport" description="Le module transport / VTC sera bientôt disponible." icon="car-outline" />;
  }
  const insets = useSafeAreaInsets();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('taxi');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Tente de récupérer la position pour des chauffeurs vraiment proches.
      let lat = 12.6392; // Bamako par défaut
      let lng = -8.0029;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch {
        // Position non disponible, on garde le défaut.
      }
      const list = await driversApi.nearby({
        lat,
        lng,
        vehicle_type: selectedVehicle,
        limit: 20,
        max_km: 10,
      });
      setDrivers(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Aucun chauffeur disponible pour le moment.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const handleRequestRide = async () => {
    if (!pickup.trim() || !destination.trim()) {
      Alert.alert('Adresses requises', 'Renseignez le départ et la destination.');
      return;
    }
    setRequesting(true);
    try {
      const ride = await ridesApi.request({
        pickup_location: pickup.trim(),
        dropoff_location: destination.trim(),
        vehicle_type: selectedVehicle,
        payment_method: 'cash',
      });
      Alert.alert(
        'Course demandée',
        'Votre demande a été envoyée aux chauffeurs proches. Vous serez notifié dès qu\'un chauffeur accepte.',
        [{ text: 'OK', onPress: () => router.push(`/services/ride/${ride.id}` as any) }]
      );
      setPickup('');
      setDestination('');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Demande impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <View style={styles.inputRow}>
            <View style={styles.inputDot} />
            <TextInput
              value={pickup}
              onChangeText={setPickup}
              placeholder="Lieu de départ"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <View style={[styles.inputDot, styles.inputDotEnd]} />
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Type de véhicule</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleCard, selectedVehicle === v.id && styles.vehicleCardActive]}
              onPress={() => setSelectedVehicle(v.id)}
            >
              <Ionicons name={v.icon} size={24} color={selectedVehicle === v.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.vehicleName, selectedVehicle === v.id && styles.vehicleNameActive]}>{v.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Chauffeurs disponibles</Text>
        {loading ? (
          <View style={styles.centerSmall}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Recherche des chauffeurs...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerSmall}>
            <Ionicons name="cloud-offline-outline" size={36} color={Colors.textSecondary} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadDrivers}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.centerSmall}>
            <Ionicons name="car-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun chauffeur {selectedVehicle} disponible dans votre zone.</Text>
          </View>
        ) : (
          drivers.map((d) => (
            <View key={d.id} style={styles.driverCard}>
              <View style={styles.driverIcon}>
                <Ionicons name="person" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{d.full_name ?? 'Chauffeur'}</Text>
                <View style={styles.driverMeta}>
                  {d.rating ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.metaText}>{d.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  {typeof d.distance_km === 'number' ? (
                    <Text style={styles.metaText}>à {d.distance_km.toFixed(1)} km</Text>
                  ) : null}
                  {d.license_plate ? <Text style={styles.metaText}>{d.license_plate}</Text> : null}
                </View>
              </View>
              {d.is_available !== false ? (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableText}>Disponible</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, (requesting || !pickup.trim() || !destination.trim()) && styles.primaryBtnDisabled]}
          onPress={handleRequestRide}
          disabled={requesting || !pickup.trim() || !destination.trim()}
        >
          {requesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Demander une course</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 120 },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  inputDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  inputDotEnd: { backgroundColor: Colors.primary },
  input: { flex: 1, color: Colors.text, fontSize: FontSizes.md, padding: 0 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4, marginLeft: 22 },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vehicleCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  vehicleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  vehicleName: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '500' },
  vehicleNameActive: { color: Colors.primary, fontWeight: '700' },
  centerSmall: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
  retryBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.sm, fontWeight: '600' },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  driverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  driverMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: 2, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  availableBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  availableText: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: '600' },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: 'bold' },
});
