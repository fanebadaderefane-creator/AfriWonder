import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { API_ROUTES } from '../src/config/api';

const SUPER_ADMIN_EMAIL = (
  process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com'
).toLowerCase();

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);

  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ROUTES.ADMIN_SETTINGS);
      const payload = res.data?.data ?? res.data;
      setSnapshot(payload && typeof payload === 'object' ? payload : null);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Paramètres plateforme</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.denied}>
          <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
          <Text style={styles.deniedText}>Accès réservé aux administrateurs</Text>
        </View>
      </View>
    );
  }

  const kill = snapshot?.killSwitch as Record<string, unknown> | undefined;
  const flags = snapshot?.featureFlags;
  const flagsLen = Array.isArray(flags) ? flags.length : flags && typeof flags === 'object' ? Object.keys(flags).length : 0;
  const minW = snapshot?.min_withdrawal_fcfa;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres plateforme</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : !snapshot ? (
          <Text style={styles.empty}>Impossible de charger les paramètres.</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.hint}>
              Lecture seule sur mobile. Les modifications (super admin) se font via la console web ou PUT{' '}
              {API_ROUTES.ADMIN_SETTINGS}.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Kill switch</Text>
              <Text style={styles.cardValue}>
                {kill && typeof kill === 'object' && 'enabled' in kill
                  ? String((kill as { enabled?: boolean }).enabled)
                  : JSON.stringify(kill ?? {})}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Feature flags</Text>
              <Text style={styles.cardValue}>{flagsLen} entrée(s)</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Commissions (config effective)</Text>
              <Text style={styles.cardValue} numberOfLines={6}>
                {JSON.stringify(snapshot.commissions ?? {}, null, 2)}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seuil min. retrait (FCFA)</Text>
              <Text style={styles.cardValue}>{JSON.stringify(minW)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Message maintenance</Text>
              <Text style={styles.cardValue} numberOfLines={8}>
                {JSON.stringify(snapshot.maintenance_message ?? null)}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bannière promo</Text>
              <Text style={styles.cardValue} numberOfLines={8}>
                {JSON.stringify(snapshot.promotion_banner ?? null)}
              </Text>
            </View>
          </View>
        )}
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  deniedText: { color: Colors.textMuted, fontSize: FontSizes.md },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.lg, lineHeight: 18 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  cardValue: { fontSize: FontSizes.sm, color: Colors.text, fontFamily: 'monospace' },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});
