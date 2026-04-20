import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

type CommunityItem = {
  id: string;
  name: string;
  members_count?: number;
  avatar?: string | null;
  banner?: string | null;
  category?: string | null;
  description?: string | null;
  is_member?: boolean;
};

export default function CommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);

  useEffect(() => {
    void loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/communities', { params: { limit: 50 } });
      const data = res.data?.data ?? res.data;
      setCommunities(Array.isArray(data?.communities) ? data.communities : []);
    } catch {
      Alert.alert('Communautés', 'Impossible de charger les communautés.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((community) =>
      [community.name, community.description, community.category].some((value) =>
        String(value ?? '').toLowerCase().includes(q)
      )
    );
  }, [communities, search]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communautes</Text>
        <TouchableOpacity><Ionicons name="add-circle" size={24} color={Colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Rechercher une communaute..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {filteredCommunities.map((community) => (
          <TouchableOpacity key={community.id} style={styles.communityCard} onPress={() => router.push(`/communities/${community.id}`)}>
            <ImageOrPlaceholder
              uri={toAbsoluteMediaUrl(String(community.banner || community.avatar || '').trim())}
              style={styles.communityImage}
              icon="people"
              iconSize={40}
            />
            <View style={styles.communityOverlay}>
              <View style={styles.categoryBadge}><Text style={styles.categoryText}>{community.category || 'Général'}</Text></View>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.communityDesc}>{community.description || 'Communauté AfriWonder'}</Text>
              <View style={styles.communityMeta}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.communityMembers}>{(community.members_count ?? 0).toLocaleString()} membres</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {filteredCommunities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune communauté trouvée.</Text>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.lg },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  communityCard: { height: 160, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  communityImage: { width: '100%', height: '100%' },
  communityOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: Spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  categoryText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  communityName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  communityDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  communityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  communityMembers: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
