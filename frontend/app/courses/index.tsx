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
import coursesApi, { Course } from '../../src/api/coursesApi';

const CATEGORIES = ['Tous', 'Tech', 'Business', 'Langue', 'Art', 'Santé'];

export default function CoursesScreen() {
  if (!featureFlags.courses) {
    return (
      <ComingSoonScreen
        title="Formations"
        description="Le catalogue de formations en ligne sera bientôt disponible."
        icon="school-outline"
      />
    );
  }
  return <CoursesContent />;
}

function CoursesContent() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof coursesApi.list>[0] = { page: 1, limit: 30 };
      if (activeCategory > 0) params.category = CATEGORIES[activeCategory].toLowerCase();
      const list = await coursesApi.list(params);
      setCourses(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les formations.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

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
        <Text style={styles.headerTitle}>Formations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === idx && styles.tabActive]}
            onPress={() => setActiveCategory(idx)}
          >
            <Text style={[styles.tabText, activeCategory === idx && styles.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Formations indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="school-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune formation</Text>
          <Text style={styles.emptyText}>
            Aucune formation publiée dans cette catégorie pour l'instant.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => router.push(`/courses/${course.id}` as any)}
            >
              {course.thumbnail_url ? (
                <Image source={{ uri: course.thumbnail_url }} style={styles.courseImage} />
              ) : (
                <View style={[styles.courseImage, styles.courseImageFallback]}>
                  <Ionicons name="image-outline" size={32} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                {course.instructor?.full_name ? (
                  <Text style={styles.courseInstructor}>{course.instructor.full_name}</Text>
                ) : null}
                <View style={styles.courseMeta}>
                  {course.rating ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.metaText}>{course.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  {course.total_students ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="people" size={12} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{course.total_students}</Text>
                    </View>
                  ) : null}
                  {course.duration_hours ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={12} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{course.duration_hours}h</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.courseFooter}>
                  <Text style={styles.coursePrice}>
                    {course.price === 0 ? 'Gratuit' : `${course.price.toLocaleString()} ${course.currency ?? 'FCFA'}`}
                  </Text>
                  {course.level ? <Text style={styles.courseLevel}>{course.level}</Text> : null}
                </View>
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
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
  courseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  courseImage: { width: 100, height: 100, borderRadius: BorderRadius.md, backgroundColor: Colors.card },
  courseImageFallback: { alignItems: 'center', justifyContent: 'center' },
  courseInfo: { flex: 1 },
  courseTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  courseInstructor: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  courseMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  coursePrice: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  courseLevel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontStyle: 'italic' },
});
