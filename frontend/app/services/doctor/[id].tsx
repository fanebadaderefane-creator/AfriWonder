import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import doctorsApi, { Doctor } from '../../../src/api/doctorsApi';
import { toAbsoluteMediaUrl } from '../../../src/utils/absoluteMediaUrl';
import { doctorAvatarPlaceholderUrl } from '../../../src/utils/serviceVisualPlaceholders';
import { appAlert } from '../../../src/utils/appAlert';
import { getDemoDoctorById } from '../../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const d = await doctorsApi.get(String(id));
      setDoctor(d);
    } catch {
      const demo = getDemoDoctorById(String(id));
      if (demo) {
        setDoctor(demo);
        setFromDemo(true);
      } else {
        setDoctor(null);
        appAlert('Médecin', 'Profil introuvable ou service indisponible.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const avatarUri = doctor
    ? (doctor.avatar_url ? toAbsoluteMediaUrl(doctor.avatar_url) : doctorAvatarPlaceholderUrl(doctor.id))
    : '';

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Santé</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Médecin introuvable.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayShortName = doctor.full_name.replace(/^dr\.\s*/i, '').trim();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Dr. {displayShortName}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {fromDemo ? <DemoContentBanner /> : null}
        <Image source={{ uri: avatarUri }} style={styles.hero} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>Dr. {displayShortName}</Text>
          {doctor.is_verified ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
        </View>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        {doctor.clinic_name ? <Text style={styles.meta}>{doctor.clinic_name}</Text> : null}
        {doctor.city ? (
          <Text style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} /> {doctor.city}
          </Text>
        ) : null}
        {typeof doctor.consultation_fee === 'number' ? (
          <Text style={styles.fee}>
            Consultation : {doctor.consultation_fee.toLocaleString('fr-FR')} {doctor.currency ?? 'FCFA'}
          </Text>
        ) : null}
        {doctor.bio ? <Text style={styles.bio}>{doctor.bio}</Text> : null}

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push(`/health/book?doctorId=${encodeURIComponent(doctor.id)}` as never)}
          accessibilityRole="button"
          accessibilityLabel="Prendre rendez-vous"
        >
          <Ionicons name="calendar" size={22} color="#FFF" />
          <Text style={styles.bookBtnText}>Prendre rendez-vous</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.lg },
  hero: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.card,
    marginBottom: Spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  specialty: { color: Colors.primary, fontWeight: '700', marginTop: Spacing.xs },
  meta: { color: Colors.textSecondary, marginTop: Spacing.xs },
  fee: { color: Colors.primary, fontWeight: '800', marginTop: Spacing.md },
  bio: { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 22 },
  bookBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  bookBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  muted: { color: Colors.textSecondary },
  cta: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  ctaText: { color: '#FFF', fontWeight: '700' },
});
