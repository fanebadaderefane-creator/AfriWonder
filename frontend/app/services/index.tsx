import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.xl * 2 - Spacing.md * 2) / 3;

const SERVICES = [
  { id: 'food', name: 'Livraison', icon: 'fast-food', color: '#FF6B6B', route: '/services/food' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#4ECDC4', route: '/services/transport' },
  { id: 'health', name: 'Sante', icon: 'medkit', color: '#45B7D1', route: '/services/health' },
  { id: 'realestate', name: 'Immobilier', icon: 'home', color: '#96CEB4', route: '/services/realestate' },
  { id: 'events', name: 'Evenements', icon: 'calendar', color: '#DDA0DD', route: '/services/events' },
  { id: 'jobs', name: 'Emploi', icon: 'briefcase', color: '#F7DC6F', route: '/services/jobs' },
  { id: 'wallet', name: 'Finance', icon: 'wallet', color: '#FF6B00', route: '/wallet' },
  { id: 'education', name: 'Education', icon: 'school', color: '#82E0AA', route: '/services/index' },
  { id: 'market', name: 'Market', icon: 'cart', color: '#E74C3C', route: '/(tabs)/market' },
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
              <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                <Ionicons name={service.icon as any} size={28} color="#FFFFFF" />
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
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
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
