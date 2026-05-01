import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import doctorsApi, { Doctor } from '../../src/api/doctorsApi';

const SPECIALTIES = ['Tous', 'Généraliste', 'Pédiatre', 'Cardiologue', 'Dermatologue', 'Gynécologue'];

export default function HealthScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Santé" description="La téléconsultation et les services santé seront bientôt disponibles." icon="medkit-outline" />;
  }
  return <HealthContent />;
}

function HealthContent() {
  const insets = useSafeAreaInsets();
  const [activeSpecialty, setActiveSpecialty] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const params: Parameters<typeof doctorsApi.list>[0] = { page: 1, limit: 30 };
      if (activeSpecialty > 0) params.specialty = SPECIALTIES[activeSpecialty];
      const list = await doctorsApi.list(params);
      if (list === null) {
        // Module télémédecine désactivé côté serveur — affichage "indisponible"
        setUnavailable(true);
        setDoctors([]);
      } else {
        setDoctors(list);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les médecins.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeSpecialty]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true).finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Santé</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {SPECIALTIES.map((s, idx) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, activeSpecialty === idx && styles.tabActive]}
            onPress={() => setActiveSpecialty(idx)}
          >
            <Text style={[styles.tabText, activeSpecialty === idx && styles.tabTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : unavailable ? (
        <View style={styles.centerBox}>
          <Ionicons name="medkit-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Téléconsultation indisponible</Text>
          <Text style={styles.emptyText}>
            Le service de téléconsultation n'est pas encore activé dans votre région. Revenez bientôt !
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Médecins indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="person-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun médecin</Text>
          <Text style={styles.emptyText}>Aucun médecin disponible dans cette spécialité.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {doctors.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.card}
              onPress={() => router.push(`/services/doctor/${d.id}` as any)}
            >
              {d.avatar_url ? (
                <Image source={{ uri: d.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={28} color={Colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{d.full_name}</Text>
                  {d.is_verified ? <Ionicons name="checkmark-circle" size={16} color={Colors.primary} /> : null}
                </View>
                <Text style={styles.cardSpecialty}>{d.specialty}</Text>
                {d.clinic_name ? <Text style={styles.cardClinic}>{d.clinic_name}</Text> : null}
                <View style={styles.cardMeta}>
                  {d.rating ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.metaText}>{d.rating.toFixed(1)}</Text>
                      {d.total_reviews ? <Text style={styles.metaText}>({d.total_reviews})</Text> : null}
                    </View>
                  ) : null}
                  {d.city ? (
                    <Text style={styles.metaText}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {d.city}
                    </Text>
                  ) : null}
                </View>
                {typeof d.consultation_fee === 'number' ? (
                  <Text style={styles.priceText}>
                    Consultation : {d.consultation_fee.toLocaleString()} {d.currency ?? 'FCFA'}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  tabsContainer: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, maxHeight: 44 },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF' },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.card },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  cardSpecialty: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '500', marginTop: 2 },
  cardClinic: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  priceText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600', marginTop: Spacing.sm },
});
