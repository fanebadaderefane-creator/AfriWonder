import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.xl * 2 - Spacing.md * 2) / 3;

const SERVICES: {
  id: string;
  name: string;
  icon: string;
  color: string;
  route: string;
  coverUrl?: string;
}[] = [
  {
    id: 'food',
    name: 'Restauration',
    icon: 'fast-food',
    color: '#FF6B6B',
    route: '/services/food',
    coverUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'car',
    color: '#4ECDC4',
    route: '/services/transport',
    coverUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80',
  },
  {
    id: 'health',
    name: 'Sante',
    icon: 'medkit',
    color: '#45B7D1',
    route: '/services/health',
    coverUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80',
  },
  {
    id: 'realestate',
    name: 'Immobilier',
    icon: 'home',
    color: '#96CEB4',
    route: '/services/realestate',
    coverUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80',
  },
  {
    id: 'events',
    name: 'Evenements',
    icon: 'calendar',
    color: '#DDA0DD',
    route: '/services/events',
    coverUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=400&q=80',
  },
  {
    id: 'insurance',
    name: 'Assurances',
    icon: 'shield-checkmark',
    color: '#2980B9',
    route: '/services/insurance',
    coverUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80',
  },
  {
    id: 'jobs',
    name: 'Emploi',
    icon: 'briefcase',
    color: '#F7DC6F',
    route: '/services/jobs',
    coverUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80',
  },
  {
    id: 'wallet',
    name: 'Finance',
    icon: 'wallet',
    color: '#FF6B00',
    route: '/wallet',
    coverUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80',
  },
  {
    id: 'education',
    name: 'Formations',
    icon: 'school',
    color: '#82E0AA',
    route: '/courses',
    coverUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=80',
  },
  {
    id: 'market',
    name: 'Market',
    icon: 'cart',
    color: '#E74C3C',
    route: '/(tabs)/market',
    coverUrl: 'https://images.unsplash.com/photo-1604719314766-07c0c0e0fdd6?w=400&q=80',
  },
  {
    id: 'covoiturage',
    name: 'Covoiturage',
    icon: 'people',
    color: '#9B59B6',
    route: '/services/covoiturage',
    coverUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80',
  },
  {
    id: 'rental',
    name: 'Location',
    icon: 'key',
    color: '#1ABC9C',
    route: '/services/vehicle-rental',
    coverUrl: 'https://images.unsplash.com/photo-1489823555147-2d0db59c9c7a?w=400&q=80',
  },
  {
    id: 'childcare',
    name: 'Garde enfant',
    icon: 'happy',
    color: '#E91E63',
    route: '/services/childcare',
    coverUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80',
  },
  {
    id: 'voyage',
    name: 'Voyage',
    icon: 'airplane',
    color: '#3498DB',
    route: '/services/voyage',
    coverUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80',
  },
  {
    id: 'news',
    name: 'Actualites',
    icon: 'newspaper',
    color: '#E67E22',
    route: '/news',
    coverUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',
  },
  {
    id: 'communities',
    name: 'Communautes',
    icon: 'chatbubbles',
    color: '#2ECC71',
    route: '/communities',
    coverUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80',
  },
  {
    id: 'crowdfunding',
    name: 'Crowdfunding',
    icon: 'heart',
    color: '#E74C3C',
    route: '/crowdfunding',
    coverUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80',
  },
  {
    id: 'civic',
    name: 'Civique',
    icon: 'flag',
    color: '#34495E',
    route: '/civic',
    coverUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=80',
  },
  {
    id: 'miniapps',
    name: 'Mini-Apps',
    icon: 'grid',
    color: '#8E44AD',
    route: '/miniapps',
    coverUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=80',
  },
];

const PROMOS = [
  { id: '1', title: 'Livraison gratuite', subtitle: 'Sur votre 1ere commande', color: '#FF6B6B', icon: 'bicycle' },
  { id: '2', title: '-50% Transport', subtitle: 'Code: AFRIGO50', color: '#4ECDC4', icon: 'car' },
  { id: '3', title: 'Teleconsultation', subtitle: 'Gratuite ce mois', color: '#45B7D1', icon: 'medkit' },
];

export default function ServicesHubScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Services Grid */}
        <View style={styles.servicesGrid}>
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => router.push(service.route as any)}
            >
              <View style={styles.serviceIconWrap}>
                {service.coverUrl ? (
                  <Image source={{ uri: service.coverUrl }} style={styles.serviceCover} />
                ) : null}
                <View style={[styles.serviceIconTint, { backgroundColor: service.color + 'CC' }]} />
                <View style={styles.serviceIconGlyph}>
                  <Ionicons name={service.icon as any} size={26} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promotions */}
        <Text style={styles.sectionTitle}>Offres speciales</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promosScroll}>
          {PROMOS.map((promo) => (
            <TouchableOpacity key={promo.id} style={[styles.promoCard, { backgroundColor: promo.color }]}>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
              </View>
              <Ionicons name={promo.icon as any} size={40} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wallet')}>
            <Ionicons name="send" size={22} color={Colors.primary} />
            <Text style={styles.quickActionText}>Envoyer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wallet')}>
            <Ionicons name="download" size={22} color={Colors.success} />
            <Text style={styles.quickActionText}>Recevoir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wallet')}>
            <Ionicons name="phone-portrait" size={22} color={Colors.info} />
            <Text style={styles.quickActionText}>Recharger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wallet')}>
            <Ionicons name="receipt" size={22} color={Colors.accent} />
            <Text style={styles.quickActionText}>Factures</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  serviceCard: {
    width: CARD_SIZE,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  serviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCover: {
    ...StyleSheet.absoluteFillObject,
    width: 56,
    height: 56,
  },
  serviceIconTint: {
    ...StyleSheet.absoluteFillObject,
  },
  serviceIconGlyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  promosScroll: {
    marginBottom: Spacing.xxl,
  },
  promoCard: {
    width: width * 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginRight: Spacing.md,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickActionText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
});
