import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';

type PublicUser = {
  id: string;
  username?: string;
  full_name?: string | null;
  profile_image?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  isFollowing?: boolean;
  _count?: { videos?: number; follows?: number; following?: number };
};

type VideoThumb = { id: string; thumbnail_url?: string; title?: string };

export default function PublicUserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = (Array.isArray(id) ? id[0] : id) || '';
  const { user: me, isAuthenticated } = useAuthStore();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [videos, setVideos] = useState<VideoThumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setErr('Profil introuvable');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const [uRes, vRes] = await Promise.all([
        apiClient.get(`/users/${userId}`),
        apiClient.get(`/videos`, { params: { creator_id: userId, page: 1, limit: 60 } }),
      ]);
      const u = uRes.data?.data ?? uRes.data;
      setProfile(u || null);
      const vData = vRes.data?.data ?? vRes.data;
      setVideos(Array.isArray(vData?.videos) ? vData.videos : []);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      const msg = ax.response?.data?.error?.message || 'Impossible de charger ce profil';
      setErr(String(msg));
      setProfile(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isSelf = Boolean(me?.id && userId && me.id === userId);

  const toggleFollow = async () => {
    if (!isAuthenticated || !profile || isSelf) return;
    setFollowBusy(true);
    try {
      const res = await apiClient.post(`/users/${profile.id}/follow`, {});
      const d = res.data?.data ?? res.data;
      if (d?.requestPending) {
        Alert.alert('Compte privé', 'Demande de suivi envoyée.');
        return;
      }
      const next = Boolean(d?.following);
      setProfile((p) => (p ? { ...p, isFollowing: next } : p));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      Alert.alert('Erreur', String(ax.response?.data?.error?.message || 'Action impossible').slice(0, 200));
    } finally {
      setFollowBusy(false);
    }
  };

  const nameParts = (profile?.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || profile?.username || '';
  const lastName = nameParts.slice(1).join(' ');

  const horizontalInset = Spacing.sm * 2;
  const colGap = 2;
  const contentW = windowWidth - horizontalInset;
  const cellW = Math.max(1, Math.floor((contentW - colGap * 2) / 3));
  const cellH = Math.round(cellW * (16 / 9));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Profil
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} size="large" />
      ) : err || !profile ? (
        <View style={styles.centered}>
          <Text style={styles.errText}>{err || 'Profil introuvable'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.hero}>
            <CreatorAvatar
              uri={profile.profile_image}
              username={profile.username}
              firstName={firstName}
              lastName={lastName}
              size={96}
              bordered={false}
            />
            <Text style={styles.displayName}>{profile.full_name?.trim() || profile.username || 'Créateur'}</Text>
            {profile.username ? (
              <Text style={styles.handle}>@{profile.username.replace(/^@+/, '')}</Text>
            ) : null}
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            <View style={styles.statsRow}>
              <Text style={styles.stat}>
                <Text style={styles.statNum}>{profile._count?.videos ?? videos.length}</Text> vidéos
              </Text>
              <Text style={styles.stat}>
                <Text style={styles.statNum}>{profile._count?.follows ?? '—'}</Text> abonnés
              </Text>
            </View>

            {isSelf ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Mon profil</Text>
              </TouchableOpacity>
            ) : isAuthenticated ? (
              <TouchableOpacity
                style={[styles.primaryBtn, profile.isFollowing && styles.primaryBtnOutline]}
                onPress={() => void toggleFollow()}
                disabled={followBusy}
                activeOpacity={0.85}
              >
                {followBusy ? (
                  <ActivityIndicator color={profile.isFollowing ? Colors.primary : '#FFF'} />
                ) : (
                  <Text style={[styles.primaryBtnText, profile.isFollowing && styles.primaryBtnTextOutline]}>
                    {profile.isFollowing ? 'Abonné' : 'Suivre'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Vidéos</Text>
          {videos.length === 0 ? (
            <Text style={styles.emptyVideos}>Aucune vidéo publique pour l’instant.</Text>
          ) : (
            <View style={[styles.grid, { paddingHorizontal: Spacing.sm }]}>
              {videos.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.thumbCell,
                    {
                      width: cellW,
                      height: cellH,
                      marginBottom: colGap,
                      marginRight: index % 3 === 2 ? 0 : colGap,
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
                  activeOpacity={0.88}
                >
                  <Image
                    source={{ uri: item.thumbnail_url || '' }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.md },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  retryBtnText: { color: '#FFF', fontWeight: '700' },
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: Spacing.lg },
  displayName: { marginTop: 16, color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800', textAlign: 'center' },
  handle: { marginTop: 4, color: Colors.textMuted, fontSize: FontSizes.md },
  bio: { marginTop: 12, color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  stat: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  statNum: { color: Colors.text, fontWeight: '800' },
  primaryBtn: {
    marginTop: 20,
    minWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
  primaryBtnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.primary },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  primaryBtnTextOutline: { color: Colors.primary },
  sectionTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md, paddingHorizontal: Spacing.md, marginBottom: 8 },
  emptyVideos: { color: Colors.textMuted, paddingHorizontal: Spacing.lg, fontSize: FontSizes.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  thumbCell: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#222' },
  thumb: { width: '100%', height: '100%' },
});
