import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { updateMobileDeviceSettings } from '../../src/services/mobileApiService';
import { formatDataEstimateBytes, useDataSaver, useTodayDataUsage } from '../../src/dataSaver/DataSaverContext';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';

export default function DataSaverScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [enabled, setEnabled] = useState(Boolean(user?.data_saver_mode));
  const {
    refreshTodayUsage,
    autoSlowNetwork,
    effectiveDataSaver,
    manualDataSaver,
    reduceAnimations,
    setReduceAnimations,
  } = useDataSaver();
  const todayUsageBytes = useTodayDataUsage();

  useEffect(() => {
    setEnabled(Boolean(user?.data_saver_mode));
  }, [user?.data_saver_mode]);

  useEffect(() => {
    void refreshTodayUsage();
  }, [refreshTodayUsage]);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    updateUser({ data_saver_mode: value });
    try {
      await updateMobileDeviceSettings({ data_saver_mode: value });
    } catch {
      /* garde l’état optimiste */
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Économie de données</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.heroCard, effectiveDataSaver && styles.heroCardOn]}>
          <View style={styles.heroTop}>
            <Ionicons name="pulse-outline" size={28} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{effectiveDataSaver ? 'Mode économie actif' : 'Mode standard'}</Text>
              <Text style={styles.heroText}>
                {autoSlowNetwork && !manualDataSaver
                  ? 'Activation automatique : données mobiles (forfait) ou réseau lent.'
                  : 'Vidéos plus légères, moins de chargements en arrière-plan — recommandé au Mali et en Afrique.'}
              </Text>
            </View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Mode Data Saver manuel</Text>
            <Switch
              value={enabled}
              onValueChange={(v) => void toggle(v)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.text}
            />
          </View>
        </View>

        {effectiveDataSaver ? (
          <View style={styles.badgeBanner}>
            <Ionicons name="leaf" size={18} color="#0b3d0b" />
            <Text style={styles.badgeText}>Économie estimée : jusqu’à ~80 % de données vs lecture HD sur ce réseau</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consommation estimée aujourd’hui (vidéos)</Text>
          <Text style={styles.usageBig}>{formatDataEstimateBytes(todayUsageBytes)}</Text>
          <Text style={styles.cardHint}>
            Estimation locale (ordre de grandeur) — pas une mesure opérateur exacte.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={styles.cardTitle}>Réduire les animations</Text>
              <Text style={styles.cardText}>Moins de rotations et effets — économie batterie (Phase 14.7).</Text>
            </View>
            <Switch
              value={reduceAnimations}
              onValueChange={(v) => void setReduceAnimations(v)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.text}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ce que fait le mode économie</Text>
          <Text style={styles.cardText}>• Qualité vidéo basse en priorité (flux léger / 240p si disponible côté API)</Text>
          <Text style={styles.cardText}>• Autoplay du fil conservé ; moins de données grâce au flux léger</Text>
          <Text style={styles.cardText}>• Moins de cellules vidéo pré-rendues (liste)</Text>
          <Text style={styles.cardText}>• Chargement des pages suivantes plus tard au scroll</Text>
          <Text style={styles.cardText}>
            • Pré-cache automatique du fil pour lecture sans Internet (comme TikTok, aucun bouton à toucher)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  heroCardOn: { borderColor: Colors.primary },
  heroTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  heroTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  heroText: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', flex: 1 },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(154, 230, 110, 0.35)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  badgeText: { flex: 1, color: '#0b3d0b', fontSize: FontSizes.sm, fontWeight: '600', lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 6 },
  cardText: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: 4 },
  cardHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 6 },
  usageBig: { color: Colors.primary, fontSize: 32, fontWeight: '800', marginTop: 4 },
});
