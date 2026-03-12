/**
 * ProfileUserScreen — Profil d'un autre utilisateur (aligné PWA Profile.jsx quand !isOwnProfile)
 * Bannière, avatar, nom, @username, bio, stats, boutons Wonder / Message, grille de vidéos publiées.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const NUM_COLUMNS = 3;
const PAD = 12;
const GAP = 4;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - PAD * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_ASPECT = 9 / 16;

function formatCount(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num ?? 0);
}

export default function ProfileUserScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user: currentUser } = useAuth();
  const userId = route.params?.userId;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, wonderers: 0 });
  const [videos, setVideos] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wonderLoading, setWonderLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.users.getById(userId);
      setProfile(data);
      if (data?.isFollowing !== undefined) setIsFollowing(!!data.isFollowing);
    } catch {
      setProfile(null);
    }
  }, [userId]);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.users.getStats(userId);
      const st = data?.stats ?? data;
      setStats({
        followers: st?.followers ?? 0,
        following: st?.following ?? 0,
        wonderers: st?.wonderers ?? st?.followers ?? 0,
      });
    } catch {
      try {
        const [followersRes, followingRes] = await Promise.all([
          api.users.getFollowers(userId).catch(() => ({ followers: [] })),
          api.users.getFollowing(userId).catch(() => ({ following: [] })),
        ]);
        setStats({
          followers: Array.isArray(followersRes?.followers) ? followersRes.followers.length : 0,
          following: Array.isArray(followingRes?.following) ? followingRes.following.length : 0,
          wonderers: Array.isArray(followersRes?.followers) ? followersRes.followers.length : 0,
        });
      } catch {
        setStats({ followers: 0, following: 0, wonderers: 0 });
      }
    }
  }, [userId]);

  const loadVideos = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await api.videos.list({ creator_id: userId, page: 1, limit: 30 });
      const list = result?.videos ?? (Array.isArray(result) ? result : []);
      const published = list.filter((v) => (v.creator_id || v.creator?.id) === userId && v.visibility !== 'prive');
      setVideos(published);
    } catch {
      setVideos([]);
    }
  }, [userId]);

  const syncFollowing = useCallback(async () => {
    if (!currentUser?.id || !userId) return;
    try {
      const result = await api.users.getFollowing(currentUser.id);
      const following = result?.following ?? (Array.isArray(result) ? result : []);
      const inList = following.some(
        (f) => (typeof f === 'string' ? f === userId : f.following_id === userId || f.id === userId)
      );
      setIsFollowing(inList);
    } catch {
      setIsFollowing(false);
    }
  }, [currentUser?.id, userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadProfile(), loadStats(), loadVideos()])
      .then(() => syncFollowing())
      .finally(() => setLoading(false));
  }, [userId, loadProfile, loadStats, loadVideos, syncFollowing]);

  const handleWonder = useCallback(async () => {
    if (!userId || wonderLoading) return;
    setWonderLoading(true);
    try {
      const result = await api.users.toggleWonder(userId);
      const inWonder = result?.data?.inWonder ?? result?.inWonder ?? !isFollowing;
      setIsFollowing(inWonder);
    } catch {
      // keep previous state
    } finally {
      setWonderLoading(false);
    }
  }, [userId, isFollowing, wonderLoading]);

  const openChat = useCallback(() => {
    navigation.navigate('Chat', { userId });
  }, [navigation, userId]);

  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Utilisateur introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Impossible de charger le profil</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile.full_name || profile.first_name || profile.username || profile.email || 'Utilisateur';
  const username = profile.username || profile.email?.split('@')[0] || '';
  const totalLikes = videos.reduce((acc, v) => acc + (v.likes ?? v.likes_count ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cover} />
        <View style={styles.headerContent}>
          <View style={styles.avatarWrap}>
            {profile.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {username ? <Text style={styles.handle}>@{username}</Text> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(stats.following)}</Text>
              <Text style={styles.statLabel}>Dans leur Wonder</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(stats.wonderers || stats.followers)}</Text>
              <Text style={styles.statLabel}>Wonderers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(totalLikes)}</Text>
              <Text style={styles.statLabel}>J'aime</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(videos.length)}</Text>
              <Text style={styles.statLabel}>Vidéos</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btnWonder, isFollowing && styles.btnWonderActive]}
              onPress={handleWonder}
              disabled={wonderLoading}
            >
              {wonderLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? '#374151' : '#FFF'} />
              ) : (
                <Text style={[styles.btnWonderText, isFollowing && styles.btnWonderTextActive]}>
                  {isFollowing ? 'Dans son Wonder' : 'Wonder'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnMessage} onPress={openChat}>
              <Ionicons name="chatbubble-outline" size={20} color="#374151" />
              <Text style={styles.btnMessageText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vidéos</Text>
        {videos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="videocam-outline" size={40} color="#4B5563" />
            <Text style={styles.emptyText}>Aucune vidéo publique</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {videos.map((video) => {
              const thumb = video.thumbnail_url || video.video_url;
              return (
                <TouchableOpacity
                  key={video.id}
                  style={[styles.card, { width: CARD_WIDTH, height: CARD_WIDTH / CARD_ASPECT }]}
                  onPress={() => navigation.navigate('VideoView', { videoId: video.id })}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardPlaceholder}>
                      <Ionicons name="videocam-outline" size={24} color="#4B5563" />
                    </View>
                  )}
                  <View style={styles.cardStats}>
                    <Ionicons name="play" size={10} color="#FFF" />
                    <Text style={styles.cardStatsText}>{formatCount(video.views ?? video.views_count ?? 0)}</Text>
                    <Ionicons name="heart-outline" size={10} color="#FFF" style={styles.cardStatIcon} />
                    <Text style={styles.cardStatsText}>{formatCount(video.likes ?? video.likes_count ?? 0)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#F97373', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  cover: { height: 80, backgroundColor: '#2563EB' },
  headerContent: { paddingHorizontal: PAD, marginTop: -40, paddingBottom: 16 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#1F2937' },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  name: { fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  handle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  bio: { fontSize: 14, color: '#D1D5DB', marginTop: 8, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1F2937',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#F9FAFB' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnWonder: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWonderActive: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  btnWonderText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  btnWonderTextActive: { color: '#9CA3AF' },
  btnMessage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  btnMessageText: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F9FAFB', paddingHorizontal: PAD, marginTop: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PAD, gap: GAP },
  card: { borderRadius: 4, overflow: 'hidden' },
  cardThumb: { ...StyleSheet.absoluteFillObject },
  cardPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  cardStats: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStatsText: { fontSize: 10, color: '#FFF', marginLeft: 2 },
  cardStatIcon: { marginLeft: 8 },
  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  bottomSpacer: { height: 24 },
});
