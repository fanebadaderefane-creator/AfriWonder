import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const VEHICLES = [
  { id: 'v1', name: 'Toyota Corolla', type: 'Berline', image: 'https://picsum.photos/400/200?random=230', price: 25000, perDay: true, rating: 4.7, available: true },
  { id: 'v2', name: 'Moto Jakarta', type: 'Moto', image: 'https://picsum.photos/400/200?random=231', price: 5000, perDay: true, rating: 4.5, available: true },
  { id: 'v3', name: 'Toyota Hilux', type: 'Pick-up', image: 'https://picsum.photos/400/200?random=232', price: 45000, perDay: true, rating: 4.8, available: false },
  { id: 'v4', name: 'Bus 30 places', type: 'Bus', image: 'https://picsum.photos/400/200?random=233', price: 80000, perDay: true, rating: 4.6, available: true },
];

export default function VehicleRentalScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Location vehicules</Text>
        <TouchableOpacity><Ionicons name="filter" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {VEHICLES.map((vehicle) => (
          <TouchableOpacity key={vehicle.id} style={styles.vehicleCard}>
            <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} />
            {!vehicle.available && <View style={styles.unavailableBadge}><Text style={styles.unavailableText}>Indisponible</Text></View>}
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleHeader}>
                <View><Text style={styles.vehicleName}>{vehicle.name}</Text><Text style={styles.vehicleType}>{vehicle.type}</Text></View>
                <View style={styles.ratingBadge}><Ionicons name="star" size={12} color={Colors.accent} /><Text style={styles.ratingText}>{vehicle.rating}</Text></View>
              </View>
              <View style={styles.vehicleFooter}>
                <Text style={styles.vehiclePrice}>{vehicle.price.toLocaleString()} FCFA<Text style={styles.perDay}>/jour</Text></Text>
                <TouchableOpacity style={[styles.rentBtn, !vehicle.available && styles.rentBtnDisabled]}>
                  <Text style={styles.rentBtnText}>{vehicle.available ? 'Reserver' : 'Indisponible'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  vehicleCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  vehicleImage: { width: '100%', height: 160 },
  unavailableBadge: { position: 'absolute', top: Spacing.md, right: Spacing.md, backgroundColor: Colors.error, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  unavailableText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  vehicleInfo: { padding: Spacing.lg },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  vehicleName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  vehicleType: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.accent, fontSize: FontSizes.sm, fontWeight: '600' },
  vehicleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehiclePrice: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  perDay: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: 'normal' },
  rentBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  rentBtnDisabled: { backgroundColor: Colors.border },
  rentBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
});
