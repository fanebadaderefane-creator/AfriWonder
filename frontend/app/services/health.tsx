import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const HEALTH_SERVICES = [
  { id: 'consult', name: 'Teleconsultation', icon: 'videocam', color: '#45B7D1', price: '5 000 FCFA' },
  { id: 'pharmacy', name: 'Pharmacie', icon: 'medical', color: '#96CEB4', price: 'Variable' },
  { id: 'lab', name: 'Analyses', icon: 'flask', color: '#DDA0DD', price: '10 000 FCFA' },
  { id: 'emergency', name: 'Urgences', icon: 'pulse', color: '#FF6B6B', price: 'Gratuit' },
];

const DOCTORS = [
  {
    id: 'd1',
    name: 'Dr. Aminata Coulibaly',
    specialty: 'Medecine Generale',
    avatar: 'https://i.pravatar.cc/150?img=5',
    rating: 4.9,
    consultations: 1250,
    available: true,
    price: 5000,
  },
  {
    id: 'd2',
    name: 'Dr. Moussa Keita',
    specialty: 'Pediatrie',
    avatar: 'https://i.pravatar.cc/150?img=8',
    rating: 4.8,
    consultations: 890,
    available: true,
    price: 7500,
  },
  {
    id: 'd3',
    name: 'Dr. Fatoumata Diarra',
    specialty: 'Dermatologie',
    avatar: 'https://i.pravatar.cc/150?img=9',
    rating: 4.7,
    consultations: 456,
    available: false,
    price: 10000,
  },
  {
    id: 'd4',
    name: 'Dr. Ibrahim Traore',
    specialty: 'Cardiologie',
    avatar: 'https://i.pravatar.cc/150?img=11',
    rating: 4.9,
    consultations: 2100,
    available: true,
    price: 15000,
  },
];

export default function HealthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sante</Text>
        <TouchableOpacity>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Emergency Banner */}
        <TouchableOpacity style={styles.emergencyBanner}>
          <View style={styles.emergencyIcon}>
            <Ionicons name="call" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Urgence medicale ?</Text>
            <Text style={styles.emergencySubtitle}>Appeler le 15 (SAMU Mali)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>

        {/* Health Services */}
        <Text style={styles.sectionTitle}>Services de sante</Text>
        <View style={styles.servicesGrid}>
          {HEALTH_SERVICES.map((service) => (
            <TouchableOpacity key={service.id} style={styles.serviceCard}>
              <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                <Ionicons name={service.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>{service.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Doctors */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medecins disponibles</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {DOCTORS.map((doctor) => (
          <TouchableOpacity key={doctor.id} style={styles.doctorCard}>
            <Image source={{ uri: doctor.avatar }} style={styles.doctorAvatar} />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              <View style={styles.doctorMeta}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.doctorRating}>{doctor.rating}</Text>
                <Text style={styles.doctorConsultations}>{doctor.consultations} consultations</Text>
              </View>
            </View>
            <View style={styles.doctorRight}>
              <Text style={styles.doctorPrice}>{doctor.price.toLocaleString()} FCFA</Text>
              <View style={[styles.availabilityBadge, { backgroundColor: doctor.available ? Colors.success : Colors.textMuted }]}>
                <Text style={styles.availabilityText}>{doctor.available ? 'Disponible' : 'Indisponible'}</Text>
              </View>
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
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  emergencySubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  serviceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  servicePrice: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  doctorSpecialty: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorRating: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  doctorConsultations: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  doctorRight: {
    alignItems: 'flex-end',
  },
  doctorPrice: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  availabilityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
});
