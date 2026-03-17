import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CATEGORIES, MOCK_FEATURED, MOCK_TRENDING } from '../data/newsMock';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCategoryLabel(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c?.label || id;
}

export default function NewsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [language, setLanguage] = useState('fr');
  const [useFeed, setUseFeed] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [breaking, setBreaking] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let listRes = {};
      let feedRes = { articles: [] };
      let breakingRes = [];
      let trendingRes = [];

      if (useFeed) {
        feedRes = await api.news.getFeed(page, 20).catch(() => ({ articles: [] }));
        const items = feedRes?.articles ?? [];
        if (items.length) {
          setArticles(items);
          setFeatured(items[0] || null);
          setTrending(items.slice(1, 5));
        } else {
          setFeatured(MOCK_FEATURED);
          setTrending(MOCK_TRENDING);
          setArticles([MOCK_FEATURED, ...MOCK_TRENDING]);
        }
      } else {
        listRes = await api.news.list({ page, limit: 20, category: selectedCategory !== 'all' ? selectedCategory : undefined, search: searchQuery.trim() || undefined }).catch(() => ({}));
        breakingRes = await api.news.getBreaking().catch(() => []);
        trendingRes = await api.news.getTrending(10).catch(() => []);
        const list = listRes?.articles ?? [];
        if (list.length) {
          setArticles(list);
          setFeatured(list[0] || MOCK_FEATURED);
          setTrending(Array.isArray(trendingRes) && trendingRes.length > 0 ? trendingRes : MOCK_TRENDING);
          setBreaking(Array.isArray(breakingRes) ? breakingRes : []);
        } else {
          setFeatured(MOCK_FEATURED);
          setTrending(MOCK_TRENDING);
          setArticles([MOCK_FEATURED, ...MOCK_TRENDING]);
          setBreaking([]);
        }
      }
      setHasMore((listRes?.pagination?.totalPages ?? 1) > page);
    } catch {
      setFeatured(MOCK_FEATURED);
      setTrending(MOCK_TRENDING);
      setArticles([MOCK_FEATURED, ...MOCK_TRENDING]);
      setBreaking([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, searchQuery, useFeed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openArticle = (article) => {
    navigation.navigate('ArticleDetails', { id: article.id, slug: article.slug });
  };

  const filteredArticles = searchQuery.trim()
    ? articles.filter((a) => (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : selectedCategory === 'all'
      ? articles
      : articles.filter((a) => (a.category || '') === selectedCategory);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#1e40af" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Actualités</Text>
          <Text style={styles.subtitle}>Restez informé</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, !useFeed && styles.tabActive]}
          onPress={() => setUseFeed(false)}
        >
          <Text style={[styles.tabText, !useFeed && styles.tabTextActive]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, useFeed && styles.tabActive]}
          onPress={() => setUseFeed(true)}
        >
          <Text style={[styles.tabText, useFeed && styles.tabTextActive]}>Pour vous</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentSize.height - layoutMeasurement.height - contentOffset.y < 100 && hasMore && !loading) {
            setPage((p) => p + 1);
          }
        }}
        scrollEventThrottle={400}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryChip, selectedCategory === c.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === c.id && styles.categoryChipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && page === 1 ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          <>
            {featured && (
              <TouchableOpacity style={styles.featuredCard} onPress={() => openArticle(featured)} activeOpacity={0.9}>
                <Image source={{ uri: featured.featured_image || featured.image }} style={styles.featuredImage} />
                <View style={styles.featuredOverlay}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getCategoryLabel(featured.category)}</Text>
                  </View>
                  <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                  <Text style={styles.featuredMeta}>
                    {featured.author_name || featured.author?.full_name || 'AfriWonder'} · {formatDate(featured.published_at || featured.created_at)}
                  </Text>
                  {(featured.views != null) && <Text style={styles.featuredViews}>{featured.views} vues</Text>}
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Tendances</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingRow}>
              {trending.map((art) => (
                <TouchableOpacity key={art.id} style={styles.trendingCard} onPress={() => openArticle(art)}>
                  <Image source={{ uri: art.featured_image || art.image }} style={styles.trendingImage} />
                  <View style={styles.trendingBadge}>
                    <Text style={styles.trendingBadgeText}>{getCategoryLabel(art.category)}</Text>
                  </View>
                  <Text style={styles.trendingTitle} numberOfLines={2}>{art.title}</Text>
                  <Text style={styles.trendingExcerpt} numberOfLines={2}>{art.excerpt || art.description}</Text>
                  <Text style={styles.trendingMeta}>{formatDate(art.published_at || art.created_at)} · {(art.views ?? 0).toLocaleString('fr-FR')} vues</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Articles</Text>
            {filteredArticles.length === 0 ? (
              <Text style={styles.empty}>Aucun article trouvé.</Text>
            ) : (
              filteredArticles.map((art) => (
                <TouchableOpacity key={art.id} style={styles.articleRow} onPress={() => openArticle(art)}>
                  <Image source={{ uri: art.featured_image || art.image }} style={styles.articleThumb} />
                  <View style={styles.articleBody}>
                    <Text style={styles.articleTitle} numberOfLines={2}>{art.title}</Text>
                    <Text style={styles.articleMeta}>
                      {getCategoryLabel(art.category)} · {formatDate(art.published_at || art.created_at)}
                    </Text>
                    {(art.views != null) && <Text style={styles.articleViews}>{art.views} vues</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))
            )}
            {loading && page > 1 && <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />}
            {hasMore && !loading && filteredArticles.length > 0 && (
              <TouchableOpacity style={styles.loadMore} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.loadMoreText}>Charger plus</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 12 },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: '#0f172a' },
  tabsRow: { flexDirection: 'row', marginTop: 12, paddingHorizontal: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, borderRadius: 20 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#64748b' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  categoriesRow: { paddingVertical: 12, paddingLeft: 16 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
  categoryChipActive: { backgroundColor: '#2563eb' },
  categoryChipText: { fontSize: 13, color: '#475569' },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  loader: { marginVertical: 24 },
  featuredCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1e293b' },
  featuredImage: { width: '100%', height: 200 },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  featuredMeta: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  featuredViews: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginHorizontal: 16, marginBottom: 10 },
  trendingRow: { paddingLeft: 16, marginBottom: 20 },
  trendingCard: { width: 220, marginRight: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  trendingImage: { width: '100%', height: 120 },
  trendingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#2563eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendingBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  trendingTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', padding: 10 },
  trendingExcerpt: { fontSize: 12, color: '#64748b', paddingHorizontal: 10 },
  trendingMeta: { fontSize: 11, color: '#94a3b8', padding: 10, paddingTop: 4 },
  articleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  articleThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e2e8f0' },
  articleBody: { flex: 1, marginLeft: 12 },
  articleTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  articleMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  articleViews: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  empty: { color: '#64748b', textAlign: 'center', marginVertical: 24 },
  loadMore: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: '#2563eb', fontWeight: '600' },
});
