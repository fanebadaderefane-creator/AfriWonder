import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { toAbsoluteMediaUrl } from '../../utils/absoluteMediaUrl';

/**
 * Barre « Following Stories » style TikTok.
 *  - Élément 1 : Create (avatar de l'utilisateur connecté + badge + bleu).
 *  - Éléments suivants : créateurs suivis triés live > non vu > vu > rien.
 *  - LIVE → bord dégradé rouge/rose + badge LIVE.
 *  - Story non vue → bord dégradé cyan→bleu.
 *  - Story vue → bord gris.
 *  - Cache « vu » 24 h via AsyncStorage (clé `afw_seen_story_v1`).
 */

type FeedBarItem = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_self: boolean;
  has_story: boolean;
  has_unseen_story: boolean;
  is_live: boolean;
  live_id: string | null;
  story_ids: string[];
  sort_rank: number;
};

const SEEN_CACHE_KEY = 'afw_seen_story_v1';
const SEEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 h

type SeenCache = Record<string, number>;

async function loadSeenCache(): Promise<SeenCache> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenCache;
    const now = Date.now();
    const cleaned: SeenCache = {};
    for (const [k, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && now - ts < SEEN_TTL_MS) cleaned[k] = ts;
    }
    return cleaned;
  } catch {
    return {};
  }
}

async function markStoriesSeen(storyIds: string[]): Promise<void> {
  if (storyIds.length === 0) return;
  try {
    const cache = await loadSeenCache();
    const now = Date.now();
    for (const id of storyIds) cache[id] = now;
    await AsyncStorage.setItem(SEEN_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function displayLabel(item: FeedBarItem): string {
  if (item.is_self) return 'Create';
  const full = (item.full_name || '').trim();
  if (full) return full;
  const un = (item.username || '').trim();
  if (un) return un.replace(/^@+/, '');
  return 'Utilisateur';
}

function avatarUrl(item: FeedBarItem): string {
  const abs = toAbsoluteMediaUrl((item.profile_image || '').trim());
  if (abs) return abs;
  const label = displayLabel(item);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=FF6B00&color=fff&size=128&bold=true`;
}

export function FollowingStoriesBar() {
  const authUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<FeedBarItem[]>([]);
  const [seen, setSeen] = useState<SeenCache>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    try {
      const [res, cache] = await Promise.all([
        apiClient.get('/stories/feed-bar'),
        loadSeenCache(),
      ]);
      const data = res.data?.data ?? res.data;
      const raw = Array.isArray(data?.items) ? (data.items as FeedBarItem[]) : [];
      if (!mounted.current) return;
      setSeen(cache);
      setItems(raw);
    } catch {
      if (mounted.current) setItems([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  /** Re-trie côté client en tenant compte du cache « vu » local. */
  const sortedItems = useMemo(() => {
    return items
      .map((it) => {
        const storiesUnseen = it.story_ids.some((sid) => !seen[sid]);
        const hasUnseen = it.has_story && storiesUnseen;
        const sortRank = it.is_live ? 0 : hasUnseen ? 1 : it.has_story ? 2 : 3;
        return { ...it, has_unseen_story: hasUnseen, sort_rank: sortRank };
      })
      .sort((a, b) => {
        if (a.is_self && !b.is_self) return -1;
        if (!a.is_self && b.is_self) return 1;
        return a.sort_rank - b.sort_rank;
      });
  }, [items, seen]);

  const openItem = useCallback(
    async (item: FeedBarItem) => {
      if (item.is_self) {
        router.push('/stories');
        return;
      }
      if (item.is_live && item.live_id) {
        router.push({ pathname: '/live/[id]', params: { id: item.live_id } } as never);
        return;
      }
      if (item.has_story) {
        router.push({
          pathname: '/stories',
          params: { userId: item.id },
        } as never);
        await markStoriesSeen(item.story_ids);
        setSeen((prev) => {
          const next = { ...prev };
          const now = Date.now();
          for (const id of item.story_ids) next[id] = now;
          return next;
        });
        return;
      }
      router.push({ pathname: '/user/[id]', params: { id: item.id } } as never);
    },
    [],
  );

  if (!token || sortedItems.length === 0) return null;

  const selfEntry = sortedItems.find((i) => i.is_self);
  const hasSelf = Boolean(selfEntry) || Boolean(authUser);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {hasSelf ? (
          <CreateItem
            avatar={
              selfEntry
                ? avatarUrl(selfEntry)
                : avatarUrl({
                    id: authUser?.id || 'me',
                    username: authUser?.username || null,
                    full_name: authUser?.full_name || null,
                    profile_image: authUser?.profile_image || authUser?.avatar || null,
                    is_self: true,
                    has_story: false,
                    has_unseen_story: false,
                    is_live: false,
                    live_id: null,
                    story_ids: [],
                    sort_rank: 3,
                  })
            }
            onPress={() => router.push('/create')}
          />
        ) : null}
        {sortedItems
          .filter((it) => !it.is_self)
          .map((it) => (
            <StoryItem key={it.id} item={it} avatar={avatarUrl(it)} label={displayLabel(it)} onPress={() => void openItem(it)} />
          ))}
      </ScrollView>
    </View>
  );
}

function CreateItem({ avatar, onPress }: { avatar: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.item} onPress={onPress} accessibilityLabel="Publier une story">
      <View style={styles.ringWrap}>
        <View style={[styles.ring, styles.ringIdle]}>
          <View style={styles.avatarInner}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </View>
        </View>
        <View style={styles.createBadge}>
          <Ionicons name="add" size={14} color="#FFF" />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.label}>
        Create
      </Text>
    </TouchableOpacity>
  );
}

function StoryItem({
  item,
  avatar,
  label,
  onPress,
}: {
  item: FeedBarItem;
  avatar: string;
  label: string;
  onPress: () => void;
}) {
  const ringColors: [string, string] =
    item.is_live
      ? ['#FF2D55', '#FF1764']
      : item.has_unseen_story
        ? ['#00F2EA', '#2B8CFF']
        : ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.20)'];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.item}
      onPress={onPress}
      accessibilityLabel={
        item.is_live ? `${label} en direct` : item.has_story ? `Story de ${label}` : `Profil ${label}`
      }
    >
      <View style={styles.ringWrap}>
        <LinearGradient colors={ringColors} style={styles.ring}>
          <View style={styles.avatarInner}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </View>
        </LinearGradient>
        {item.is_live ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 8,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  item: { alignItems: 'center', width: 72 },
  ringWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ring: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIdle: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#000',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  createBadge: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2B8CFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FF2D55',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  liveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  label: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.90)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 68,
  },
});

export default FollowingStoriesBar;
