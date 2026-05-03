import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import jobsApi, { Job } from '../../../src/api/jobsApi';
import { getDemoJobById, isAfriWonderDemoId } from '../../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';
import { appAlert } from '../../../src/utils/appAlert';

const TYPE_LABELS: Record<string, string> = {
  full_time: 'CDI',
  part_time: 'Temps partiel',
  contract: 'CDD',
  internship: 'Stage',
  freelance: 'Freelance',
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const row = await jobsApi.get(String(id));
      setJob(row);
    } catch {
      const demo = getDemoJobById(String(id));
      if (demo) {
        setJob(demo);
        setFromDemo(true);
      } else {
        setJob(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApply = () => {
    if (!job) return;
    if (isAfriWonderDemoId(job.id)) {
      appAlert('Démonstration', 'Offre fictive : aucune candidature réelle n’est envoyée.');
      return;
    }
    appAlert('Candidature', 'Envoi de CV / formulaire à brancher côté API.');
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emploi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Offre introuvable.</Text>
        </View>
      </View>
    );
  }

  const cur = job.currency ?? 'FCFA';
  let salary = 'Salaire à négocier';
  if (job.salary_min && job.salary_max) {
    salary = `${job.salary_min.toLocaleString('fr-FR')} – ${job.salary_max.toLocaleString('fr-FR')} ${cur}`;
  } else if (job.salary_min) {
    salary = `À partir de ${job.salary_min.toLocaleString('fr-FR')} ${cur}`;
  } else if (job.salary_max) {
    salary = `Jusqu'à ${job.salary_max.toLocaleString('fr-FR')} ${cur}`;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Offre
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl, paddingHorizontal: Spacing.lg }}>
        {fromDemo ? <DemoContentBanner /> : null}
        <Text style={styles.title}>{job.title}</Text>
        {job.company ? <Text style={styles.company}>{job.company}</Text> : null}
        <View style={styles.row}>
          {job.type ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[job.type] ?? job.type}</Text>
            </View>
          ) : null}
          {job.remote ? (
            <View style={[styles.badge, styles.badgeRemote]}>
              <Text style={styles.badgeTextRemote}>Télétravail</Text>
            </View>
          ) : null}
        </View>
        {(job.city || job.location) ? (
          <Text style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />{' '}
            {job.location ?? job.city}
          </Text>
        ) : null}
        <Text style={styles.salary}>{salary}</Text>
        {job.description ? <Text style={styles.desc}>{job.description}</Text> : null}
        <TouchableOpacity style={styles.cta} onPress={onApply}>
          <Text style={styles.ctaText}>Postuler</Text>
        </TouchableOpacity>
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
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: '800', marginTop: Spacing.md },
  company: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  badge: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.xs },
  badgeRemote: { backgroundColor: Colors.success + '22' },
  badgeTextRemote: { color: Colors.success, fontWeight: '700', fontSize: FontSizes.xs },
  meta: { color: Colors.textSecondary, marginTop: Spacing.md },
  salary: { color: Colors.text, fontWeight: '800', marginTop: Spacing.lg, fontSize: FontSizes.lg },
  desc: { color: Colors.textSecondary, marginTop: Spacing.lg, lineHeight: 22 },
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
