import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../../src/theme/colors';
import { transportScreenStyles as styles } from '../../src/screens/services/transportScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import { driversApi, ridesApi, Driver } from '../../src/api/ridesApi';
import { filterDemoDrivers } from '../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../src/components/common/DemoContentBanner';

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
  return <TransportContent />;
}

function TransportContent() {
  const insets = useSafeAreaInsets();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('taxi');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowDemo(false);
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
      if (featureFlags.superAppDemoContent && list.length === 0) {
        setDrivers(filterDemoDrivers(selectedVehicle));
        setShowDemo(true);
      } else {
        setDrivers(list);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Aucun chauffeur disponible pour le moment.';
      if (featureFlags.superAppDemoContent) {
        setDrivers(filterDemoDrivers(selectedVehicle));
        setShowDemo(true);
      } else {
        setError(msg);
        setDrivers([]);
      }
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
    if (showDemo) {
      Alert.alert(
        'Démonstration',
        'Course fictive : aucun chauffeur réel n’est contacté. Branchement partenaires à venir.',
      );
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
        [{ text: 'OK', onPress: () => router.push(`/rides/${ride.id}` as any) }]
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
        {showDemo ? <DemoContentBanner /> : null}
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
