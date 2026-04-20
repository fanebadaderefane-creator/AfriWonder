import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

const RIDES = [
  { id: 'r1', driver: 'Moussa T.', avatar: 'https://picsum.photos/50/50?random=220', from: 'Bamako', to: 'Segou', date: '28 Jun, 08:00', seats: 3, price: 5000, rating: 4.8 },
  { id: 'r2', driver: 'Aminata S.', avatar: 'https://picsum.photos/50/50?random=221', from: 'Bamako', to: 'Sikasso', date: '28 Jun, 10:00', seats: 2, price: 7500, rating: 4.6 },
  { id: 'r3', driver: 'Ibrahim D.', avatar: 'https://picsum.photos/50/50?random=222', from: 'Bamako', to: 'Mopti', date: '29 Jun, 06:00', seats: 4, price: 12000, rating: 4.9 },
  { id: 'r4', driver: 'Fanta K.', avatar: 'https://picsum.photos/50/50?random=223', from: 'Bamako', to: 'Koulikoro', date: '29 Jun, 14:00', seats: 1, price: 3000, rating: 4.5 },
];

export default function CovoiturageScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Covoiturage" description="Le module covoiturage sera bientôt disponible." icon="people-outline" />;
  }
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Covoiturage</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Search Box */}
        <View style={styles.searchBox}>
          <View style={styles.inputRow}>
            <View style={styles.dotGreen} />
            <TextInput style={styles.input} placeholder="Depart" placeholderTextColor={Colors.textMuted} value={from} onChangeText={setFrom} />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <View style={styles.dotRed} />
            <TextInput style={styles.input} placeholder="Destination" placeholderTextColor={Colors.textMuted} value={to} onChangeText={setTo} />
          </View>
          <TouchableOpacity style={styles.searchBtn}><Text style={styles.searchBtnText}>Rechercher</Text></TouchableOpacity>
        </View>

        {/* Available Rides */}
        <Text style={styles.sectionTitle}>Trajets disponibles</Text>
        {RIDES.map((ride) => (
          <TouchableOpacity key={ride.id} style={styles.rideCard}>
            <View style={styles.rideHeader}>
              <Image source={{ uri: ride.avatar }} style={styles.driverAvatar} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{ride.driver}</Text>
                <View style={styles.ratingRow}><Ionicons name="star" size={12} color={Colors.accent} /><Text style={styles.ratingText}>{ride.rating}</Text></View>
              </View>
              <Text style={styles.ridePrice}>{ride.price.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}><View style={styles.dotGreenSm} /><Text style={styles.routeCity}>{ride.from}</Text></View>
              <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} />
              <View style={styles.routePoint}><View style={styles.dotRedSm} /><Text style={styles.routeCity}>{ride.to}</Text></View>
            </View>
            <View style={styles.rideMeta}>
              <View style={styles.metaItem}><Ionicons name="calendar" size={14} color={Colors.textSecondary} /><Text style={styles.metaText}>{ride.date}</Text></View>
              <View style={styles.metaItem}><Ionicons name="people" size={14} color={Colors.textSecondary} /><Text style={styles.metaText}>{ride.seats} places</Text></View>
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
  searchBox: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xxl },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.error },
  input: { flex: 1, color: Colors.text, fontSize: FontSizes.md, paddingVertical: Spacing.md },
  inputDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 24 },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  searchBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  rideCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  rideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: 22 },
  driverInfo: { flex: 1, marginLeft: Spacing.md },
  driverName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.accent, fontSize: FontSizes.sm },
  ridePrice: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotGreenSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  dotRedSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  routeCity: { color: Colors.text, fontSize: FontSizes.md },
  rideMeta: { flexDirection: 'row', gap: Spacing.xl },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
