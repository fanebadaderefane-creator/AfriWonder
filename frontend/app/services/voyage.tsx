import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

const { width } = Dimensions.get('window');

const DESTINATIONS = [
  { id: 'd1', name: 'Tombouctou', image: 'https://picsum.photos/400/200?random=250', rating: 4.9, description: 'Cite historique du Sahara' },
  { id: 'd2', name: 'Pays Dogon', image: 'https://picsum.photos/400/200?random=251', rating: 4.8, description: 'Patrimoine UNESCO, falaises et villages' },
  { id: 'd3', name: 'Djenne', image: 'https://picsum.photos/400/200?random=252', rating: 4.7, description: 'Grande Mosquee, architecture en terre' },
];

const PACKAGES = [
  { id: 'pk1', title: 'Tombouctou 3J/2N', price: 150000, includes: ['Hotel', 'Transport', 'Guide'], duration: '3 jours' },
  { id: 'pk2', title: 'Pays Dogon 5J/4N', price: 250000, includes: ['Hotel', 'Transport', 'Guide', 'Repas'], duration: '5 jours' },
  { id: 'pk3', title: 'Circuit Mali complet', price: 500000, includes: ['Hotel', 'Transport', 'Guide', 'Repas', 'Assurance'], duration: '10 jours' },
];

const ALERTS = [
  { id: 'a1', title: 'Route Bamako-Mopti', type: 'info', message: 'Route en bon etat, temps de trajet normal' },
  { id: 'a2', title: 'Zone Nord', type: 'warning', message: 'Consultez les avis de voyage avant deplacement' },
];

export default function VoyageScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Voyage" description="Le module voyage sera bientôt disponible." icon="airplane-outline" />;
  }
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Voyage</Text>
        <TouchableOpacity><Ionicons name="search" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Destinations */}
        <Text style={styles.sectionTitle}>Destinations populaires</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destinationScroll}>
          {DESTINATIONS.map((dest) => (
            <TouchableOpacity key={dest.id} style={styles.destCard}>
              <Image source={{ uri: dest.image }} style={styles.destImage} />
              <View style={styles.destOverlay}>
                <Text style={styles.destName}>{dest.name}</Text>
                <Text style={styles.destDesc}>{dest.description}</Text>
                <View style={styles.destRating}><Ionicons name="star" size={12} color={Colors.accent} /><Text style={styles.destRatingText}>{dest.rating}</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Travel Packages */}
        <Text style={styles.sectionTitle}>Forfaits voyage</Text>
        {PACKAGES.map((pkg) => (
          <TouchableOpacity key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <View><Text style={styles.packageTitle}>{pkg.title}</Text><Text style={styles.packageDuration}>{pkg.duration}</Text></View>
              <Text style={styles.packagePrice}>{pkg.price.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.includesList}>
              {pkg.includes.map((inc, i) => (
                <View key={i} style={styles.includeItem}><Ionicons name="checkmark-circle" size={14} color={Colors.success} /><Text style={styles.includeText}>{inc}</Text></View>
              ))}
            </View>
            <TouchableOpacity style={styles.bookBtn}><Text style={styles.bookBtnText}>Reserver</Text></TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Travel Alerts */}
        <Text style={styles.sectionTitle}>Alertes voyage</Text>
        {ALERTS.map((alert) => (
          <View key={alert.id} style={[styles.alertCard, alert.type === 'warning' && styles.alertWarning]}>
            <Ionicons name={alert.type === 'warning' ? 'warning' : 'information-circle'} size={22} color={alert.type === 'warning' ? Colors.warning : Colors.info} />
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          </View>
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
  content: { paddingBottom: Spacing.xxxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, paddingHorizontal: Spacing.xl },
  destinationScroll: { marginBottom: Spacing.xxl },
  destCard: { width: width * 0.65, height: 180, borderRadius: BorderRadius.lg, overflow: 'hidden', marginLeft: Spacing.xl },
  destImage: { width: '100%', height: '100%' },
  destOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: Spacing.lg },
  destName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  destDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  destRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  destRatingText: { color: Colors.accent, fontSize: FontSizes.sm },
  packageCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  packageTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  packageDuration: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  packagePrice: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  includesList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  includeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  includeText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  bookBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  bookBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, gap: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.info },
  alertWarning: { borderLeftColor: Colors.warning },
  alertInfo: { flex: 1 },
  alertTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  alertMessage: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
