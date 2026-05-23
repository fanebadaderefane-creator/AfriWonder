import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  PRODUCT_CAPABILITY_PILLARS,
  capabilityLevelLabelFr,
  type CapabilityShipLevel,
} from '../src/config/productCapabilities';

function levelColor(level: CapabilityShipLevel): string {
  switch (level) {
    case 'shipped':
      return '#2e7d32';
    case 'partial':
    case 'ongoing':
      return '#f57c00';
    case 'depends_on_deployment':
      return '#1565c0';
    default:
      return Colors.textSecondary;
  }
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? (Constants as { manifest?: { version?: string } }).manifest?.version ?? 'dev';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>À propos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Ionicons name="globe" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>AfriWonder</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <Text style={styles.sectionTitle}>Modules</Text>
        {PRODUCT_CAPABILITY_PILLARS.map((p) => (
          <View key={p.id} style={styles.capCard}>
            <View style={styles.capHeader}>
              <Text style={styles.capLabel}>{p.labelFr}</Text>
              <View style={[styles.badge, { borderColor: levelColor(p.level) }]}>
                <Text style={[styles.badgeText, { color: levelColor(p.level) }]}>
                  {capabilityLevelLabelFr[p.level]}
                </Text>
              </View>
            </View>
            <Text style={styles.capDetail}>{p.detailFr}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.matrixLink}
          onPress={() => router.push('/benchmark')}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la matrice"
        >
          <Ionicons name="grid-outline" size={22} color={Colors.primary} />
          <Text style={styles.matrixLinkText}>Matrice</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
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
  logoSection: { alignItems: 'center', marginBottom: Spacing.lg },
  logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  appName: { color: Colors.text, fontSize: FontSizes.display, fontWeight: 'bold' },
  version: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  capCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  capHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  capLabel: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  badge: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  capDetail: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  matrixLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  matrixLinkText: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
});
