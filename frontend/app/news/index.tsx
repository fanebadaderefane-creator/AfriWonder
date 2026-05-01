import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import newsApi, { NewsArticle } from '../../src/api/newsApi';

const CATEGORIES = ['Tous', 'Sports', 'Tech', 'Culture', 'Economie', 'Politique'];

function formatRelative(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'À l\'instant';
    if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)}min`;
    if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 172800) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function NewsScreen() {
  if (!featureFlags.news) {
    return (
      <ComingSoonScreen
        title="Actualités"
        description="Le fil d'actualités sera bientôt disponible."
        icon="newspaper-outline"
      />
    );
  }
  return <NewsContent />;
}

function NewsContent() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof newsApi.list>[0] = { page: 1, limit: 30 };
      if (activeCategory > 0) {
        params.category = CATEGORIES[activeCategory].toLowerCase();
      }
      const list = await newsApi.list(params);
      setArticles(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les actualités.';
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

  const featured = useMemo(
    () => articles.find((a) => a.is_featured || a.is_breaking) ?? articles[0],
    [articles]
  );
  const others = useMemo(
    () => (featured ? articles.filter((a) => a.id !== featured.id) : articles),
    [articles, featured]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Actualités</Text>
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
          <Text style={styles.errorTitle}>Actualités indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="newspaper-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune actualité</Text>
          <Text style={styles.emptyText}>
            Aucun article publié dans cette catégorie pour le moment.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {featured ? (
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => router.push(`/news/${featured.id}` as any)}
            >
              {featured.cover_image || featured.image_url ? (
                <Image source={{ uri: featured.cover_image ?? featured.image_url }} style={styles.featuredImage} />
              ) : (
                <View style={[styles.featuredImage, styles.featuredImageFallback]}>
                  <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
                </View>
              )}
              {featured.is_breaking ? (
                <View style={styles.breakingBadge}>
                  <Text style={styles.breakingText}>EN DIRECT</Text>
                </View>
              ) : null}
              <View style={styles.featuredOverlay}>
                <Text style={styles.featuredCategory}>{featured.category ?? 'Actualité'}</Text>
                <Text style={styles.featuredTitle} numberOfLines={3}>{featured.title}</Text>
                <Text style={styles.featuredMeta}>
                  {(featured.source_name ?? featured.author?.display_name ?? 'AfriWonder')} · {formatRelative(featured.published_at ?? featured.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {others.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => router.push(`/news/${article.id}` as any)}
            >
              {article.cover_image || article.image_url ? (
                <Image source={{ uri: article.cover_image ?? article.image_url }} style={styles.articleImage} />
              ) : (
                <View style={[styles.articleImage, styles.articleImageFallback]}>
                  <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.articleInfo}>
                <Text style={styles.articleCategory}>{article.category ?? 'Actualité'}</Text>
                <Text style={styles.articleTitle} numberOfLines={3}>{article.title}</Text>
                <Text style={styles.articleMeta}>
                  {(article.source_name ?? article.author?.display_name ?? 'AfriWonder')} · {formatRelative(article.published_at ?? article.created_at)}
                </Text>
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
  featuredCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  featuredImage: { width: '100%', height: 200, backgroundColor: Colors.card },
  featuredImageFallback: { alignItems: 'center', justifyContent: 'center' },
  breakingBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  breakingText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  featuredOverlay: { padding: Spacing.lg },
  featuredCategory: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600', textTransform: 'uppercase' },
  featuredTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: 4 },
  featuredMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 6 },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  articleImage: { width: 92, height: 92, borderRadius: BorderRadius.sm, backgroundColor: Colors.card },
  articleImageFallback: { alignItems: 'center', justifyContent: 'center' },
  articleInfo: { flex: 1 },
  articleCategory: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600', textTransform: 'uppercase' },
  articleTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: 4 },
  articleMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 6 },
});
