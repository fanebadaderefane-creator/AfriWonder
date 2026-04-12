import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../src/api/client';

const TABS = ['Tous', 'Utilisateurs', 'Vidéos', 'Produits', 'Posts'];
const TAB_TYPES: Record<string, string> = { 'Tous': 'all', 'Utilisateurs': 'users', 'Vidéos': 'videos', 'Produits': 'products', 'Posts': 'posts' };
const TRENDING = ['#AfriWonder', '#Mali', '#Bamako', '#DanseMandingue', '#CuisineMalienne', '#ModaAfricaine', '#MusicAfrique', '#Football'];

function normParam(v: string | string[] | undefined) {
  if (v == null) return '';
  return (Array.isArray(v) ? v[0] : v) || '';
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const paramQ = useMemo(() => normParam(params.q), [params.q]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Tous');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      if (tab === 'Posts') {
        const res = await apiClient.get('/posts', { params: { page: 1, limit: 50 } });
        const inner = res.data?.data || res.data;
        const allPosts = inner?.posts || [];
        const qLower = q.trim().toLowerCase();
        const posts = allPosts.filter((p: any) =>
          String(p.text || '').toLowerCase().includes(qLower) ||
          String(p.user?.username || '').toLowerCase().includes(qLower) ||
          String(p.user?.full_name || '').toLowerCase().includes(qLower)
        );
        setResults({ users: [], videos: [], products: [], posts });
        return;
      }
      const typeParam = TAB_TYPES[tab];
      const res = await apiClient.get('/search', { params: { q: q.trim(), type: typeParam } });
      setResults(res.data?.data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => {
    if (!paramQ) return;
    setQuery(paramQ);
    void search(paramQ);
    // Intentionnel : éviter une boucle quand `search` change d’identité (tab).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramQ]);

  const renderUser = ({ item }: any) => (
    <TouchableOpacity style={styles.userRow}>
      <Image source={{ uri: item.profile_image || `https://i.pravatar.cc/100?u=${item.id}` }} style={styles.userAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.full_name || item.username}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
      <TouchableOpacity style={styles.followSmallBtn}><Text style={styles.followSmallText}>Suivre</Text></TouchableOpacity>
    </TouchableOpacity>
  );

  const renderVideo = ({ item }: any) => (
    <TouchableOpacity style={styles.videoRow}>
      <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.videoThumb} />
      <View style={{ flex: 1 }}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title || 'Vidéo'}</Text>
        <Text style={styles.videoMeta}>{item.creator_name} • {(item.views || 0).toLocaleString()} vues</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: any) => (
    <TouchableOpacity style={styles.videoRow}>
      <Image source={{ uri: item.images?.[0] || '' }} style={styles.videoThumb} />
      <View style={{ flex: 1 }}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.name || 'Produit'}</Text>
        <Text style={[styles.videoMeta, { color: '#FF6B00' }]}>{(item.price || 0).toLocaleString()} FCFA</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: any) => (
    <TouchableOpacity style={styles.videoRow}>
      <Image source={{ uri: item.user?.profile_image || `https://i.pravatar.cc/100?u=${item.user_id || item.id}` }} style={styles.userAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.userName} numberOfLines={1}>{item.user?.full_name || item.user?.username || 'Publication'}</Text>
        <Text style={styles.videoMeta} numberOfLines={2}>{item.text || '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  const hasResults = results && (results.users?.length || results.videos?.length || results.products?.length || results.posts?.length);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Rechercher..." placeholderTextColor={Colors.textMuted} value={query} onChangeText={setQuery} onSubmitEditing={() => search(query)} returnKeyType="search" autoFocus />
          {query ? <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabItemActive]} onPress={() => { setTab(t); if (query) search(query); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : !hasResults ? (
        <View style={styles.trendingSection}>
          <Text style={styles.trendingTitle}>Tendances</Text>
          <View style={styles.trendingTags}>
            {TRENDING.map(tag => (
              <TouchableOpacity key={tag} style={styles.trendingTag} onPress={() => { setQuery(tag); search(tag); }}>
                <Text style={styles.trendingTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={[
            ...(results.users || []).map((u: any) => ({ ...u, _type: 'user' })),
            ...(results.videos || []).map((v: any) => ({ ...v, _type: 'video' })),
            ...(results.products || []).map((p: any) => ({ ...p, _type: 'product' })),
            ...(results.posts || []).map((p: any) => ({ ...p, _type: 'post' })),
          ]}
          renderItem={({ item }) =>
            item._type === 'user' ? renderUser({ item })
              : item._type === 'video' ? renderVideo({ item })
                : item._type === 'post' ? renderPost({ item })
                  : renderProduct({ item })}
          keyExtractor={(item, i) => `${item._type}-${item.id || i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, gap: 8, height: 42 },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 4, marginBottom: Spacing.md },
  tabItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill },
  tabItemActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userName: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  userHandle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  followSmallBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 6, borderRadius: BorderRadius.pill },
  followSmallText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  videoRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  videoThumb: { width: 100, height: 130, borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  videoTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  videoMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  trendingSection: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  trendingTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  trendingTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  trendingTag: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill },
  trendingTagText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '500' },
});
