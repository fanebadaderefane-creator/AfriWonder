import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

const TRACKING_STEPS = [
  { label: 'Commande confirmee', time: '25 Jun, 10:30', done: true },
  { label: 'En preparation', time: '25 Jun, 11:00', done: true },
  { label: 'Expedie', time: '25 Jun, 14:00', done: true },
  { label: 'En livraison', time: '25 Jun, 16:30', done: false },
  { label: 'Livre', time: '', done: false },
];

export default function OrderDetailScreen() {
  if (!featureFlags.marketplace) {
    return (
      <ComingSoonScreen
        title="Détail commande"
        description="Le suivi de commande marketplace sera bientôt disponible."
        icon="receipt-outline"
      />
    );
  }
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{id}</Text>
        <TouchableOpacity><Ionicons name="call" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="cube" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.statusTitle}>En livraison</Text>
          <Text style={styles.statusSubtitle}>Votre commande arrive bientot</Text>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi de livraison</Text>
          {TRACKING_STEPS.map((step, index) => (
            <View key={index} style={styles.trackingStep}>
              <View style={styles.trackingLeft}>
                <View style={[styles.trackingDot, step.done && styles.trackingDotDone]} />
                {index < TRACKING_STEPS.length - 1 && (
                  <View style={[styles.trackingLine, step.done && styles.trackingLineDone]} />
                )}
              </View>
              <View style={styles.trackingInfo}>
                <Text style={[styles.trackingLabel, step.done && styles.trackingLabelDone]}>{step.label}</Text>
                {step.time ? <Text style={styles.trackingTime}>{step.time}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.addressName}>Domicile</Text>
              <Text style={styles.addressText}>Bamako, Commune III, Quartier Hippodrome</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sous-total</Text>
            <Text style={styles.detailValue}>30 500 FCFA</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Livraison</Text>
            <Text style={styles.detailValue}>1 500 FCFA</Text>
          </View>
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>32 000 FCFA</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle" size={20} color={Colors.primary} />
          <Text style={styles.helpText}>Besoin d'aide avec cette commande ?</Text>
        </TouchableOpacity>
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
  statusCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  statusIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  statusTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  statusSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 4 },
  section: { marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  trackingStep: { flexDirection: 'row', minHeight: 56 },
  trackingLeft: { alignItems: 'center', width: 24 },
  trackingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border, borderWidth: 2, borderColor: Colors.border },
  trackingDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  trackingLine: { flex: 1, width: 2, backgroundColor: Colors.border },
  trackingLineDone: { backgroundColor: Colors.primary },
  trackingInfo: { flex: 1, paddingLeft: Spacing.md, paddingBottom: Spacing.lg },
  trackingLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  trackingLabelDone: { color: Colors.text, fontWeight: '600' },
  trackingTime: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
  addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg },
  addressName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  addressText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  detailValue: { color: Colors.text, fontSize: FontSizes.md },
  totalLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  helpButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg },
  helpText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '500' },
});
