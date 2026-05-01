import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import coursesApi from '../../src/api/coursesApi';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { useAuthStore } from '../../src/store/authStore';

type Lesson = {
  id: string;
  title: string;
  duration_minutes?: number | null;
  order?: number;
};

type CourseDetail = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  price: number;
  currency?: string | null;
  duration_hours?: number | null;
  rating?: number | null;
  students_count?: number | null;
  instructor_name?: string | null;
  instructor_avatar?: string | null;
  lessons?: Lesson[];
};

function formatDurationMin(m?: number | null): string {
  if (m == null || m <= 0) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const user = useAuthStore((s) => s.user);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentProgress, setEnrollmentProgress] = useState<number | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) {
      setError('Cours introuvable.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const c = (await coursesApi.get(courseId)) as CourseDetail;
      setCourse(c);
      if (user) {
        try {
          const er = await apiClient.get(`/courses/${encodeURIComponent(courseId)}/enrollment`);
          const en = er.data?.data ?? er.data;
          const p = typeof en?.progress === 'number' ? en.progress : null;
          setEnrollmentProgress(p);
        } catch {
          setEnrollmentProgress(null);
        }
      } else {
        setEnrollmentProgress(null);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger ce cours.';
      setError(msg);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const lessons = [...(course?.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const thumb = toAbsoluteMediaUrl(course?.thumbnail_url || course?.instructor_avatar || '').trim();
  const avatar = toAbsoluteMediaUrl(course?.instructor_avatar || '').trim();
  const progressPct =
    enrollmentProgress != null ? Math.min(100, Math.max(0, Math.round(enrollmentProgress))) : null;

  const runEnroll = async (phoneArg?: string) => {
    if (!courseId || !user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour vous inscrire à ce cours.');
      return;
    }
    setEnrolling(true);
    try {
      const result = await coursesApi.enroll(courseId, phoneArg?.trim() || undefined);
      const paymentUrl = (result as { paymentUrl?: string })?.paymentUrl;
      if (paymentUrl) {
        await WebBrowser.openAuthSessionAsync(paymentUrl, 'afriwonder://courses/return');
      } else {
        Alert.alert('Inscription', 'Vous êtes inscrit à ce cours.');
      }
      setPayOpen(false);
      setPhone('');
      void load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Inscription impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setEnrolling(false);
    }
  };

  const onPressEnroll = () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour vous inscrire à ce cours.');
      return;
    }
    if (enrollmentProgress != null) {
      Alert.alert('Déjà inscrit', 'Vous suivez déjà ce cours.');
      return;
    }
    const price = Number(course?.price ?? 0);
    if (price <= 0) {
      void runEnroll();
    } else {
      setPayOpen(true);
    }
  };

  const confirmPaidEnroll = () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      Alert.alert('Téléphone invalide', 'Renseignez un numéro Orange Money valide (avec indicatif).');
      return;
    }
    void runEnroll(cleaned);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détail du cours</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Cours introuvable.'}</Text>
          <TouchableOpacity style={styles.enrollButton} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.enrollButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currency = course.currency?.trim() || 'XOF';
  const priceLabel =
    Number(course.price) <= 0 ? 'Gratuit' : `${Number(course.price).toLocaleString('fr-FR')} ${currency}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail du cours</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView key={courseId} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.courseImage} />
        ) : (
          <View style={[styles.courseImage, styles.courseImagePh]}>
            <Ionicons name="school" size={48} color={Colors.primary} />
          </View>
        )}
        <Text style={styles.courseTitle}>{course.title}</Text>
        <View style={styles.instructorRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.instructorAvatar} />
          ) : (
            <View style={[styles.instructorAvatar, styles.instructorAvatarPh]}>
              <Ionicons name="person" size={18} color={Colors.textSecondary} />
            </View>
          )}
          <Text style={styles.instructorName}>{course.instructor_name?.trim() || 'Formateur'}</Text>
          {course.rating != null && course.rating > 0 ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={Colors.accent} />
              <Text style={styles.ratingText}>{Number(course.rating).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={18} color={Colors.primary} />
            <Text style={styles.statText}>
              {(course.students_count ?? 0).toLocaleString('fr-FR')} étudiants
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time" size={18} color={Colors.primary} />
            <Text style={styles.statText}>
              {course.duration_hours != null && course.duration_hours > 0
                ? `${course.duration_hours} h`
                : '—'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="document-text" size={18} color={Colors.primary} />
            <Text style={styles.statText}>{lessons.length} leçons</Text>
          </View>
        </View>

        {course.description ? (
          <Text style={styles.description}>{course.description}</Text>
        ) : null}

        {progressPct != null ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progression</Text>
              <Text style={styles.progressPercent}>{progressPct}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Leçons</Text>
        {lessons.length === 0 ? (
          <Text style={styles.noLessons}>Aucune leçon publiée pour cette formation.</Text>
        ) : (
          lessons.map((mod, index) => (
            <View key={mod.id} style={styles.moduleCard}>
              <View style={styles.moduleNumber}>
                <Text style={styles.moduleNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleDuration}>{formatDurationMin(mod.duration_minutes)}</Text>
              </View>
              <Ionicons name="play-circle" size={24} color={Colors.primary} />
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.enrollButton, enrolling && { opacity: 0.7 }]}
          disabled={enrolling || enrollmentProgress != null}
          onPress={onPressEnroll}
        >
          {enrolling ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.enrollButtonText}>
              {enrollmentProgress != null ? 'Déjà inscrit' : `S'inscrire — ${priceLabel}`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={payOpen} animationType="slide" transparent onRequestClose={() => setPayOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.paySheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.payTitle}>Paiement Orange Money</Text>
            <Text style={styles.payHint}>Numéro du compte à débiter (indicatif inclus).</Text>
            <TextInput
              style={styles.payInput}
              placeholder="+225..."
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.enrollButton} onPress={confirmPaidEnroll} disabled={enrolling}>
              {enrolling ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.enrollButtonText}>Payer et s&apos;inscrire</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelPay} onPress={() => setPayOpen(false)}>
              <Text style={styles.cancelPayText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  courseImage: { width: '100%', height: 180, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  courseImagePh: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  courseTitle: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', marginBottom: Spacing.md },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  instructorAvatar: { width: 36, height: 36, borderRadius: 18 },
  instructorAvatarPh: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  instructorName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.accent, fontSize: FontSizes.md, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  statText: { color: Colors.textSecondary, fontSize: FontSizes.sm, flexShrink: 1 },
  description: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22, marginBottom: Spacing.xxl },
  progressCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.xxl },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  progressPercent: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  noLessons: { color: Colors.textSecondary, marginBottom: Spacing.lg },
  moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  moduleNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: 'bold' },
  moduleInfo: { flex: 1 },
  moduleTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  moduleDuration: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  enrollButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  enrollButtonText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  payTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.sm },
  payHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  payInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, marginBottom: Spacing.lg },
  cancelPay: { alignItems: 'center', marginTop: Spacing.md },
  cancelPayText: { color: Colors.textSecondary, fontSize: FontSizes.md },
});
