import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const VEHICLE_TYPES = [
  { id: 'moto', name: 'Moto', icon: 'bicycle', price: '500-1500', time: '5-15 min', color: '#4ECDC4' },
  { id: 'taxi', name: 'Taxi', icon: 'car', price: '1000-3000', time: '10-20 min', color: '#FFD93D' },
  { id: 'comfort', name: 'Confort', icon: 'car-sport', price: '2000-5000', time: '10-25 min', color: '#6C5CE7' },
  { id: 'van', name: 'Van', icon: 'bus', price: '5000-10000', time: '15-30 min', color: '#E17055' },
];

const RECENT_TRIPS = [
  { id: '1', from: 'Bamako ACI 2000', to: 'Aeroport Bamako', price: 3500, date: 'Hier' },
  { id: '2', from: 'Hamdallaye', to: 'Marche de Medine', price: 1200, date: 'Lun' },
  { id: '3', from: 'Badalabougou', to: 'Universite', price: 800, date: 'Sam' },
];

export default function TransportScreen() {
  const insets = useSafeAreaInsets();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('taxi');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport</Text>
        <TouchableOpacity>
          <Ionicons name="time-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={60} color={Colors.textMuted} />
          <Text style={styles.mapText}>Carte interactive</Text>
          <Text style={styles.mapSubtext}>La carte sera disponible bientot</Text>
        </View>

        {/* Location Inputs */}
        <View style={styles.locationInputs}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: Colors.success }]} />
            <TextInput
              style={styles.locationInput}
              placeholder="Lieu de depart"
              placeholderTextColor={Colors.textMuted}
              value={pickup}
              onChangeText={setPickup}
            />
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: Colors.primary }]} />
            <TextInput
              style={styles.locationInput}
              placeholder="Destination"
              placeholderTextColor={Colors.textMuted}
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        </View>

        {/* Vehicle Types */}
        <Text style={styles.sectionTitle}>Type de vehicule</Text>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.vehicleCardActive,
              ]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              <View style={[styles.vehicleIcon, { backgroundColor: vehicle.color }]}>
                <Ionicons name={vehicle.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehiclePrice}>{vehicle.price} FCFA</Text>
              <Text style={styles.vehicleTime}>{vehicle.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Book Button */}
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Reserver maintenant</Text>
        </TouchableOpacity>

        {/* Recent Trips */}
        <Text style={styles.sectionTitle}>Trajets recents</Text>
        {RECENT_TRIPS.map((trip) => (
          <TouchableOpacity key={trip.id} style={styles.tripCard}>
            <View style={styles.tripIcon}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripFrom}>{trip.from}</Text>
              <Text style={styles.tripTo}>{trip.to}</Text>
            </View>
            <View style={styles.tripMeta}>
              <Text style={styles.tripPrice}>{trip.price} FCFA</Text>
              <Text style={styles.tripDate}>{trip.date}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  mapText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  mapSubtext: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  locationInputs: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.sm,
  },
  locationDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 28,
    marginVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  vehicleGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleCardActive: {
    borderColor: Colors.primary,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  vehicleName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehiclePrice: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  vehicleTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  bookButtonText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripFrom: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  tripTo: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  tripMeta: {
    alignItems: 'flex-end',
  },
  tripPrice: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  tripDate: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
});
