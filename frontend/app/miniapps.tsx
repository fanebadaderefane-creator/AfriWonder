import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.xl * 2 - Spacing.md) / 2;

const CATEGORIES = ['Tous', 'finance', 'sante', 'education', 'commerce', 'jeux', 'outils', 'services', 'social'];

type MiniAppItem = {
  id: string;
  name: string;
  category?: string | null;
  rating?: number | null;
  installs_count?: number | null;
  icon_url?: string | null;
  description?: string | null;
};

export default function MiniAppsScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<MiniAppItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/mini-apps', { params: { limit: 50, status: 'published' } });
        const data = res.data?.data ?? res.data;
        setApps(Array.isArray(data?.miniApps) ? data.miniApps : Array.isArray(data?.apps) ? data.apps : []);
      } catch {
        Alert.alert('Mini-Apps', 'Impossible de charger les mini-apps.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    const category = CATEGORIES[activeCategory];
    return apps.filter((app) => {
      const matchesCategory = category === 'Tous' || String(app.category || '').toLowerCase() === category;
      const matchesSearch = !query || [app.name, app.description, app.category].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      );
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, apps, search]);

  const installMiniApp = async (appId: string) => {
    try {
      await apiClient.post(`/mini-apps/${appId}/install`, {});
      Alert.alert('Mini-Apps', 'Mini-app installée avec succès.');
    } catch {
      Alert.alert('Mini-Apps', "Impossible d'installer cette mini-app.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Mini-Apps</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Chercher une mini-app..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity key={cat} style={[styles.categoryChip, activeCategory === i && styles.categoryChipActive]} onPress={() => setActiveCategory(i)}>
            <Text style={[styles.categoryText, activeCategory === i && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {filteredApps.map((app) => (
            <TouchableOpacity key={app.id} style={styles.appCard}>
              <View style={[styles.appIcon, { backgroundColor: Colors.primary }]}>
                <Ionicons name="apps" size={28} color="#FFF" />
              </View>
              <Text style={styles.appName}>{app.name}</Text>
              <View style={styles.appMeta}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.appRating}>{Number(app.rating ?? 0).toFixed(1)}</Text>
              </View>
              <Text style={styles.appInstalls}>{(app.installs_count ?? 0).toLocaleString()} installations</Text>
              <TouchableOpacity style={styles.installBtn} onPress={() => void installMiniApp(app.id)}>
                <Text style={styles.installBtnText}>Installer</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
        {filteredApps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune mini-app publiée pour cette recherche.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.md },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  categories: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, maxHeight: 40 },
  categoryChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, marginRight: Spacing.sm },
  categoryChipActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  categoryTextActive: { color: Colors.text, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  appCard: { width: CARD_SIZE, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' },
  appIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  appName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  appMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  appRating: { color: Colors.text, fontSize: FontSizes.xs },
  appInstalls: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  installBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  installBtnText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
