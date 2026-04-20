import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

const SERVICES_LIST = [
  { id: 'c1', name: 'Garde a domicile', icon: 'home', color: '#FF6B6B', price: 'A partir de 5 000 FCFA/jour' },
  { id: 'c2', name: 'Creche / Garderie', icon: 'people', color: '#4ECDC4', price: 'A partir de 25 000 FCFA/mois' },
  { id: 'c3', name: 'Babysitting soiree', icon: 'moon', color: '#DDA0DD', price: 'A partir de 3 000 FCFA/soiree' },
  { id: 'c4', name: 'Aide aux devoirs', icon: 'book', color: '#45B7D1', price: 'A partir de 2 000 FCFA/h' },
];

const PROVIDERS = [
  { id: 'p1', name: 'Mariam Coulibaly', avatar: 'https://picsum.photos/60/60?random=240', rating: 4.9, reviews: 45, experience: '5 ans', verified: true },
  { id: 'p2', name: 'Awa Traore', avatar: 'https://picsum.photos/60/60?random=241', rating: 4.7, reviews: 23, experience: '3 ans', verified: true },
  { id: 'p3', name: 'Creche Les Bambins', avatar: 'https://picsum.photos/60/60?random=242', rating: 4.8, reviews: 89, experience: '10 ans', verified: true },
];

export default function ChildcareScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Garde d'enfants" description="Les services de garde d'enfants seront bientôt disponibles." icon="happy-outline" />;
  }
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Garde d'enfants</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Services */}
        <Text style={styles.sectionTitle}>Services</Text>
        {SERVICES_LIST.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceCard}>
            <View style={[styles.serviceIcon, { backgroundColor: service.color }]}><Ionicons name={service.icon as any} size={24} color="#FFF" /></View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>{service.price}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Providers */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Prestataires recommandes</Text>
        {PROVIDERS.map((provider) => (
          <TouchableOpacity key={provider.id} style={styles.providerCard}>
            <Image source={{ uri: provider.avatar }} style={styles.providerAvatar} />
            <View style={styles.providerInfo}>
              <View style={styles.providerNameRow}>
                <Text style={styles.providerName}>{provider.name}</Text>
                {provider.verified && <Ionicons name="checkmark-circle" size={16} color={Colors.info} />}
              </View>
              <View style={styles.providerMeta}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.providerRating}>{provider.rating} ({provider.reviews})</Text>
                <Text style={styles.providerExp}>{provider.experience} d'exp.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contactBtn}><Text style={styles.contactBtnText}>Contacter</Text></TouchableOpacity>
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
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  servicePrice: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  providerAvatar: { width: 50, height: 50, borderRadius: 25 },
  providerInfo: { flex: 1 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerRating: { color: Colors.accent, fontSize: FontSizes.sm },
  providerExp: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginLeft: Spacing.sm },
  contactBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  contactBtnText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
});
