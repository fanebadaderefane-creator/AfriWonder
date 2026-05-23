import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';
import { featureFlags } from '../../src/config/featureFlags';
import { DemoContentBanner } from '../../src/components/common/DemoContentBanner';
import { getDemoCommunityDetail, isAfriWonderDemoId } from '../../src/demo/superAppDemoSeed';

type CommunityDetail = {
  id: string;
  name?: string | null;
  description?: string | null;
  banner?: string | null;
  avatar?: string | null;
  category?: string | null;
  members_count?: number;
  is_member?: boolean;
  members?: {
    id?: string;
    role?: string;
    user?: {
      id?: string;
      username?: string | null;
      profile_image?: string | null;
    } | null;
  }[];
};

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [fromDemo, setFromDemo] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setFromDemo(false);
        const res = await apiClient.get(`/communities/${id}`);
        const data = res.data?.data ?? res.data;
        setCommunity(data ?? null);
      } catch {
        const demo = featureFlags.superAppDemoContent ? getDemoCommunityDetail(String(id)) : null;
        if (demo) {
          setCommunity(demo as CommunityDetail);
          setFromDemo(true);
        } else {
          Alert.alert('Communauté', 'Impossible de charger cette communauté.');
          setCommunity(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleMembership = async () => {
    if (!community?.id) return;
    if (isAfriWonderDemoId(community.id)) {
      Alert.alert('Communauté', 'Cette action n’est pas disponible pour cette communauté.');
      return;
    }
    try {
      if (community.is_member) {
        await apiClient.post(`/communities/${community.id}/leave`, {});
      } else {
        await apiClient.post(`/communities/${community.id}/join`, {});
      }
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              is_member: !prev.is_member,
              members_count: Math.max(0, (prev.members_count ?? 0) + (prev.is_member ? -1 : 1)),
            }
          : prev
      );
    } catch {
      Alert.alert('Communauté', 'Action impossible. Réessayez.');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{community?.name || 'Communauté'}</Text>
        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {fromDemo ? <DemoContentBanner /> : null}
        <View style={styles.infoCard}>
          <ImageOrPlaceholder
            uri={toAbsoluteMediaUrl(String(community?.banner || community?.avatar || '').trim())}
            style={styles.coverImage}
            icon="image"
            iconSize={36}
          />
          <View style={styles.infoContent}>
            <Text style={styles.communityName}>{community?.name || 'Communauté'}</Text>
            <Text style={styles.communityDesc}>{community?.description || 'Description indisponible.'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{(community?.members_count ?? 0).toLocaleString()}</Text><Text style={styles.statLabel}>Membres</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{community?.category || 'Général'}</Text><Text style={styles.statLabel}>Catégorie</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{community?.is_member ? 'Oui' : 'Non'}</Text><Text style={styles.statLabel}>Membre</Text></View>
            </View>
            <TouchableOpacity style={styles.joinButton} onPress={() => void toggleMembership()}>
              <Text style={styles.joinButtonText}>{community?.is_member ? 'Quitter' : 'Rejoindre'}</Text>
              <Ionicons name={community?.is_member ? 'checkmark' : 'add'} size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Membres</Text>
        {(community?.members || []).length === 0 ? (
          <View style={styles.postCard}>
            <Text style={styles.postText}>Aucun membre à afficher.</Text>
          </View>
        ) : (community?.members || []).map((member, index) => (
          <View key={`${member.id ?? 'member'}-${index}`} style={styles.postCard}>
            <View style={styles.postHeader}>
              <ImageOrPlaceholder
                uri={toAbsoluteMediaUrl(String(member.user?.profile_image || '').trim())}
                style={styles.postAvatar}
                icon="person"
                iconSize={20}
              />
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{member.user?.username || 'Utilisateur'}</Text>
                <Text style={styles.postTime}>{member.role || 'member'}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  infoCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xxl },
  coverImage: { width: '100%', height: 120 },
  infoContent: { padding: Spacing.lg },
  communityName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginBottom: 4 },
  communityDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.md, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm },
  joinButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  postCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAuthorInfo: { flex: 1, marginLeft: Spacing.md },
  postAuthor: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  postTime: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  postText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 22, marginBottom: Spacing.md },
  postActions: { flexDirection: 'row', gap: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postActionText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
