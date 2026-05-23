import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import providersApi, { ServiceProvider } from '../../../src/api/providersApi';
import { getDemoProviderById, isAfriWonderDemoId } from '../../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';
import { appAlert } from '../../../src/utils/appAlert';

export default function ServiceProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const row = await providersApi.get(String(id));
      setP(row);
    } catch {
      const demo = getDemoProviderById(String(id));
      if (demo) {
        setP(demo);
        setFromDemo(true);
      } else {
        setP(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onContact = () => {
    if (isAfriWonderDemoId(String(id))) {
      appAlert('Démonstration', 'Prestataire fictif : aucune réservation ni appel réel.');
      return;
    }
    appAlert('Contact', 'La messagerie et les appels seront reliés aux partenaires validés.');
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!p) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prestataire</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Prestataire introuvable.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {p.display_name ?? p.full_name ?? 'Prestataire'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}>
        {fromDemo ? <DemoContentBanner /> : null}
        {p.cover_image ? (
          <Image source={{ uri: p.cover_image }} style={styles.cover} />
        ) : p.avatar_url ? (
          <Image source={{ uri: p.avatar_url }} style={styles.heroAvatar} />
        ) : null}
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{p.display_name ?? p.full_name}</Text>
            {p.is_verified ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
          </View>
          {p.city ? (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} /> {p.city}
            </Text>
          ) : null}
          {p.rating != null ? (
            <Text style={styles.meta}>
              <Ionicons name="star" size={14} color="#FFD700" /> {p.rating.toFixed(1)}
            </Text>
          ) : null}
          {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
          {typeof p.base_price === 'number' ? (
            <Text style={styles.price}>
              À partir de {p.base_price.toLocaleString('fr-FR')} {p.currency ?? 'FCFA'}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.cta} onPress={onContact}>
            <Text style={styles.ctaText}>Contacter / Réserver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  cover: { width: '100%', height: 200, backgroundColor: Colors.card },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginTop: Spacing.lg,
    backgroundColor: Colors.card,
  },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800', flex: 1 },
  meta: { color: Colors.textSecondary, marginTop: Spacing.sm },
  bio: { color: Colors.textSecondary, marginTop: Spacing.lg, lineHeight: 22 },
  price: { color: Colors.primary, fontWeight: '800', marginTop: Spacing.lg, fontSize: FontSizes.md },
  cta: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  ctaText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  muted: { color: Colors.textSecondary },
});
