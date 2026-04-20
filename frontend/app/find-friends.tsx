import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Facebook from 'expo-auth-session/providers/facebook';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';
import { SmartThumbnail } from '../src/components/SmartThumbnail';
import { extractOAuthAccessToken } from '../src/utils/extractOAuthAccessToken';

/**
 * Écran « Find friends ».
 *
 * Déclencheurs par méthode :
 *  - Connect Now    → `/connect-now` (géolocalisation + `/api/friends/presence`, `/nearby`).
 *  - Use QR code    → `/profile-qr` (onglets My code / Scan, caméra).
 *  - Invite friends → `Share.share` / `navigator.share` / clipboard.
 *  - Find contacts  → `/sync-contacts` (hash SHA-256 + `/api/friends/contacts/sync`).
 *  - Find Facebook  → ouvre la page de connexion Facebook (OAuth natif non requis ici).
 *
 * Section suggestions :
 *  - `GET /api/me/friends-suggestions` (preview_videos, mutual_count, is_new_content).
 *  - Follow back → `POST /users/:id/follow` → "Following" (gris) → vérifie mutual via
 *    `GET /api/friends/mutual?ids=…` → bascule "Friends" si réciproque.
 *  - Remove     → `POST /api/me/friends-suggestions/:id/dismiss` (retire 24 h).
 *  - Menu "…"   → Modal avec Not interested / Block (`/api/friends/:id/block`) /
 *    Report (`/api/friends/:id/report`).
 */

const TEXT_MAIN = '#000000';
const TEXT_MUTED = 'rgba(0,0,0,0.60)';
const DIVIDER = 'rgba(0,0,0,0.10)';
const CHIP_BG = '#F1F1F2';
const LIVE_PINK = '#FF2D55';

type PreviewVideo = {
  id: string;
  thumbnail_url: string | null;
  video_url: string | null;
  media_type: string | null;
  created_at: string;
};

type Suggestion = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_verified: boolean;
  followers_count: number;
  mutual_count: number;
  is_following_me?: boolean;
  is_new_content: boolean;
  source?: 'contacts' | 'mutual' | 'algo';
  preview_videos: PreviewVideo[];
};

type FollowState = 'idle' | 'following' | 'friends' | 'removed';

type Method = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
};

const METHODS: Method[] = [
  {
    id: 'connect-now',
    title: 'Connect Now',
    subtitle: 'Find friends around you.',
    icon: 'radio-outline',
    bg: '#7B4DFF',
  },
  {
    id: 'qr',
    title: 'Use QR code',
    subtitle: "Show or scan each other's QR codes.",
    icon: 'qr-code-outline',
    bg: '#FF642E',
  },
  {
    id: 'invite',
    title: 'Invite friends',
    subtitle: 'Share your profile to connect.',
    icon: 'share-social-outline',
    bg: '#F9C512',
  },
  {
    id: 'contacts',
    title: 'Find contacts',
    subtitle: 'Sync or find contacts.',
    icon: 'call-outline',
    bg: '#25D366',
  },
  {
    id: 'facebook',
    title: 'Find Facebook friends',
    subtitle: 'Sync or find Facebook friends.',
    icon: 'logo-facebook',
    bg: '#1877F2',
  },
];

function generatedAvatar(label: string) {
  const safe = (label || '?').trim().slice(0, 48) || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safe)}&background=FF6B00&color=fff&size=128&bold=true`;
}

function displayName(s: Suggestion): string {
  const full = (s.full_name || '').trim();
  if (full) return full;
  const un = (s.username || '').trim();
  if (un) return un.replace(/^@+/, '');
  return 'Utilisateur';
}

const TEST_ACCOUNT_MARKERS = /\b(e2e|test|mock|qa|dummy|sample|autotest|bot)\b/i;
function isLikelyTestAccount(user: { username?: string | null; full_name?: string | null; email?: string | null }): boolean {
  const username = (user.username || '').trim().toLowerCase();
  const fullName = (user.full_name || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  const blob = `${username} ${fullName} ${email}`.trim();
  if (!blob) return false;
  if (TEST_ACCOUNT_MARKERS.test(blob)) return true;
  return (
    username.startsWith('e2e_') ||
    username.startsWith('test_') ||
    username.startsWith('mock_') ||
    email.endsWith('@example.com') ||
    email.endsWith('@test.local')
  );
}

export default function FindFriendsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [follow, setFollow] = useState<Record<string, FollowState>>({});
  const [menuFor, setMenuFor] = useState<Suggestion | null>(null);

  const fbAppId = String(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '').trim();
  const [, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: fbAppId || '000000000000000',
    scopes: ['public_profile', 'email', 'user_friends'],
  });

  const loadPublicFallbackUsers = useCallback(async (limit: number): Promise<Suggestion[]> => {
    const res = await apiClient.get('/users', { params: { page: 1, limit } });
    const data = res.data?.data ?? res.data;
    const users = Array.isArray(data?.users) ? data.users : [];
    return users
      .filter((u: any) => !isLikelyTestAccount(u))
      .filter((u: any) => String(u?.id || '') !== String(user?.id || ''))
      .map((u: any) => ({
        id: String(u.id),
        username: u.username || null,
        full_name: u.full_name || null,
        profile_image: u.profile_image || null,
        is_verified: !!u.is_verified,
        followers_count: Number(u?._count?.follows || 0),
        mutual_count: 0,
        is_new_content: false,
        source: 'algo' as const,
        preview_videos: [],
      })) as Suggestion[];
  }, [user?.id]);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await apiClient.get('/me/friends-suggestions', { params: { limit: 36 } });
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.suggestions) ? (data.suggestions as Suggestion[]) : [];
      if (list.length > 0) {
        setSuggestions(list);
      } else {
        const fallback = await loadPublicFallbackUsers(36);
        setSuggestions(fallback);
      }
    } catch {
      try {
        const fallback = await loadPublicFallbackUsers(36);
        setSuggestions(fallback);
      } catch {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadPublicFallbackUsers]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  /** OAuth Facebook → appelle `/friends/facebook/match` quand le token arrive. */
  useEffect(() => {
    if (fbResponse?.type !== 'success') return;
    const token = extractOAuthAccessToken(fbResponse);
    if (!token) return;
    void (async () => {
      try {
        const res = await apiClient.post('/friends/facebook/match', { access_token: token });
        const data = res.data?.data ?? res.data;
        const count = Array.isArray(data?.matches) ? data.matches.length : 0;
        if (count === 0) {
          Alert.alert('Find Facebook friends', "Aucun de vos amis Facebook n'utilise encore AfriWonder.");
        } else {
          Alert.alert(
            'Find Facebook friends',
            `${count} ami${count > 1 ? 's' : ''} Facebook trouvé${count > 1 ? 's' : ''}. Ils apparaissent dans vos suggestions.`,
          );
        }
        void loadSuggestions();
      } catch {
        Alert.alert('Find Facebook friends', 'Connexion Facebook échouée. Réessayez plus tard.');
      }
    })();
  }, [fbResponse, loadSuggestions]);

  const inviteHandle = (user?.username || '').replace(/^@+/, '');
  const inviteFriends = useCallback(async () => {
    const handle = inviteHandle || 'user';
    const url = `https://afri-wonder.vercel.app/u/${encodeURIComponent(handle)}`;
    const msg = `Rejoignez-moi sur AfriWonder — @${handle}\n${url}`;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'AfriWonder', text: msg, url });
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        await Clipboard.setStringAsync(msg);
        Alert.alert('Invitation', 'Lien copié dans le presse-papiers.');
      } catch {
        Alert.alert('Invitation', msg);
      }
      return;
    }
    try {
      await Share.share({ title: 'AfriWonder', message: msg });
    } catch {
      /* annulé */
    }
  }, [inviteHandle]);

  const handleMethod = useCallback(
    (id: string) => {
      switch (id) {
        case 'connect-now':
          router.push('/connect-now');
          return;
        case 'qr':
          router.push('/profile-qr');
          return;
        case 'invite':
          void inviteFriends();
          return;
        case 'contacts':
          router.push('/sync-contacts');
          return;
        case 'facebook':
          if (!fbAppId) {
            Alert.alert(
              'Find Facebook friends',
              'Configuration Facebook manquante (EXPO_PUBLIC_FACEBOOK_APP_ID).',
            );
            return;
          }
          void fbPrompt();
          return;
      }
    },
    [inviteFriends, fbPrompt, fbAppId],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSuggestions();
  }, [loadSuggestions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return suggestions;
    return suggestions.filter((s) => {
      const name = (s.full_name || '').toLowerCase();
      const un = (s.username || '').toLowerCase();
      return name.includes(q) || un.includes(q);
    });
  }, [query, suggestions]);

  const checkMutualAfterFollow = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get('/friends/mutual', { params: { ids: id } });
      const data = res.data?.data ?? res.data;
      const mutualIds: string[] = Array.isArray(data?.mutual_ids) ? data.mutual_ids : [];
      if (mutualIds.includes(id)) {
        setFollow((f) => ({ ...f, [id]: 'friends' }));
      }
    } catch {
      /* best effort */
    }
  }, []);

  const handleFollow = useCallback(
    async (id: string) => {
      const current = follow[id] || 'idle';
      if (current !== 'idle') return;
      setFollow((f) => ({ ...f, [id]: 'following' }));
      try {
        await apiClient.post(`/users/${id}/follow`);
        await checkMutualAfterFollow(id);
      } catch {
        setFollow((f) => ({ ...f, [id]: 'idle' }));
        Alert.alert('Erreur', 'Impossible de suivre ce compte. Réessayez plus tard.');
      }
    },
    [follow, checkMutualAfterFollow],
  );

  const handleRemove = useCallback(async (id: string) => {
    setFollow((f) => ({ ...f, [id]: 'removed' }));
    try {
      await apiClient.post(`/me/friends-suggestions/${id}/dismiss`);
    } catch {
      /* best effort */
    }
  }, []);

  const handleBlock = useCallback(async (s: Suggestion) => {
    const confirm = async () => {
      try {
        await apiClient.post(`/friends/${s.id}/block`);
        setFollow((f) => ({ ...f, [s.id]: 'removed' }));
      } catch {
        Alert.alert('Erreur', 'Blocage impossible.');
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Bloquer @${(s.username || '').replace(/^@+/, '')} ?`)) {
        await confirm();
      }
      return;
    }
    Alert.alert(
      'Bloquer cet utilisateur ?',
      `Vous ne verrez plus @${(s.username || '').replace(/^@+/, '')} dans votre app.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Bloquer', style: 'destructive', onPress: () => void confirm() },
      ],
    );
  }, []);

  const handleReport = useCallback(async (s: Suggestion) => {
    try {
      await apiClient.post(`/friends/${s.id}/report`, { reason: 'inappropriate_profile' });
      Alert.alert('Merci', "Signalement envoyé. L'équipe Safety l'examinera sous 24 h.");
    } catch {
      Alert.alert('Erreur', 'Signalement impossible.');
    }
  }, []);

  const openUser = useCallback((s: Suggestion) => {
    router.push({ pathname: '/user/[id]', params: { id: s.id } } as never);
  }, []);

  const followLabel = (state: FollowState, s: Suggestion): string => {
    switch (state) {
      case 'friends':
        return 'Friends';
      case 'following':
        return 'Following';
      default:
        return s.is_following_me ? 'Follow back' : 'Follow';
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Retour"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find friends</Text>
        <TouchableOpacity
          onPress={() => router.push('/profile-qr')}
          style={styles.headerBtn}
          accessibilityLabel="Scanner un QR code"
          hitSlop={12}
        >
          <Ionicons name="scan-outline" size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LIVE_PINK} />
        }
      >
        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or username"
            placeholderTextColor={TEXT_MUTED}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => {
              const q = query.trim();
              if (q) router.push({ pathname: '/search', params: { q } } as never);
            }}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Methods */}
        <View style={styles.methodsWrap}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.methodRow}
              activeOpacity={0.7}
              onPress={() => handleMethod(m.id)}
              accessibilityLabel={`${m.title} — ${m.subtitle}`}
            >
              <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={22} color="#FFF" />
              </View>
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>{m.title}</Text>
                <Text style={styles.methodSubtitle}>{m.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.2)" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionSeparator} />

        {/* Suggested accounts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested accounts</Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={() =>
              Alert.alert(
                'Suggestions',
                'Basées sur vos abonnements, vos contacts et vos centres d’intérêt.',
              )
            }
          >
            <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={LIVE_PINK} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {query.trim().length >= 2 ? 'No users found' : 'Invite friends to get started'}
            </Text>
            {query.trim().length < 2 ? (
              <TouchableOpacity style={styles.emptyCta} onPress={() => void inviteFriends()}>
                <Text style={styles.emptyCtaText}>Invite friends</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filtered.map((s) => {
            const state: FollowState = follow[s.id] || 'idle';
            if (state === 'removed') return null;
            return (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity onPress={() => openUser(s)} activeOpacity={0.85}>
                    <Image
                      source={{
                        uri:
                          toAbsoluteMediaUrl(s.profile_image || '').trim() ||
                          generatedAvatar(displayName(s)),
                      }}
                      style={styles.cardAvatar}
                    />
                  </TouchableOpacity>
                  <View style={styles.cardInfo}>
                    <TouchableOpacity onPress={() => openUser(s)} activeOpacity={0.85}>
                      <View style={styles.cardNameRow}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {displayName(s)}
                        </Text>
                        {s.is_verified ? (
                          <Ionicons name="checkmark-circle" size={14} color={LIVE_PINK} />
                        ) : null}
                      </View>
                      <Text style={styles.cardHandle} numberOfLines={1}>
                        @{(s.username || '').replace(/^@+/, '')}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.cardMeta}>
                      <Ionicons
                        name={s.source === 'contacts' ? 'call-outline' : 'people-outline'}
                        size={12}
                        color={s.source === 'contacts' ? '#25D366' : TEXT_MUTED}
                      />
                      <Text
                        style={[
                          styles.cardMetaText,
                          s.source === 'contacts' && { color: '#25D366', fontWeight: '600' },
                        ]}
                      >
                        {s.source === 'contacts'
                          ? 'From your contacts'
                          : s.mutual_count > 0
                            ? `${s.mutual_count} amis en commun`
                            : 'People you may know'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    hitSlop={8}
                    style={styles.cardDots}
                    onPress={() => setMenuFor(s)}
                    accessibilityLabel="Menu"
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                {s.preview_videos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.previewRow}
                  >
                    {s.preview_videos.slice(0, 4).map((v, idx) => {
                      const isNew = s.is_new_content && idx === 0;
                      const thumb = toAbsoluteMediaUrl(v.thumbnail_url || '').trim();
                      const video = toAbsoluteMediaUrl(v.video_url || '').trim();
                      return (
                        <TouchableOpacity
                          key={v.id}
                          activeOpacity={0.85}
                          onPress={() =>
                            router.push({
                              pathname: '/user/[id]',
                              params: { id: s.id, focusVideoId: v.id },
                            } as never)
                          }
                          style={styles.previewItem}
                        >
                          <SmartThumbnail
                            posterUrl={thumb}
                            uri={thumb || video}
                            videoUrl={video}
                            style={styles.previewThumb}
                            tileSize={80}
                            tileHeight={110}
                          />
                          {isNew ? (
                            <View style={styles.previewNewBadge}>
                              <Text style={styles.previewNewText}>New</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    activeOpacity={0.8}
                    onPress={() => handleRemove(s.id)}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.followBtn,
                      (state === 'following' || state === 'friends') && styles.followBtnSecondary,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => void handleFollow(s.id)}
                    disabled={state !== 'idle'}
                  >
                    <Text
                      style={[
                        styles.followBtnText,
                        (state === 'following' || state === 'friends') && styles.followBtnTextSecondary,
                      ]}
                    >
                      {followLabel(state, s)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Menu 3-points */}
      <Modal
        transparent
        animationType="fade"
        visible={menuFor !== null}
        onRequestClose={() => setMenuFor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuFor(null)}>
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => {
              e.stopPropagation();
            }}
          >
            <View style={styles.modalGrab} />
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                if (menuFor) void handleRemove(menuFor.id);
                setMenuFor(null);
              }}
            >
              <Ionicons name="close-circle-outline" size={20} color={TEXT_MAIN} />
              <Text style={styles.modalItemText}>Not interested</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                if (menuFor) void handleBlock(menuFor);
                setMenuFor(null);
              }}
            >
              <Ionicons name="ban-outline" size={20} color={LIVE_PINK} />
              <Text style={[styles.modalItemText, { color: LIVE_PINK }]}>Block</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                if (menuFor) void handleReport(menuFor);
                setMenuFor(null);
              }}
            >
              <Ionicons name="flag-outline" size={20} color={TEXT_MAIN} />
              <Text style={styles.modalItemText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalItem, styles.modalCancel]}
              onPress={() => setMenuFor(null)}
            >
              <Text style={[styles.modalItemText, { fontWeight: '700' }]}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
    backgroundColor: '#FFF',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT_MAIN,
    fontSize: 17,
    fontWeight: '700',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    height: 36,
    borderRadius: 8,
    backgroundColor: CHIP_BG,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_MAIN,
    fontSize: 15,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } : {}),
  },
  methodsWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: { flex: 1, minWidth: 0 },
  methodTitle: { color: TEXT_MAIN, fontSize: 16, fontWeight: '700' },
  methodSubtitle: { color: TEXT_MUTED, fontSize: 13, marginTop: 2 },
  sectionSeparator: { height: 8, backgroundColor: 'transparent' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700' },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700', maxWidth: '82%' },
  cardHandle: { color: TEXT_MUTED, fontSize: 13, marginTop: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { color: TEXT_MUTED, fontSize: 12 },
  cardDots: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  previewRow: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 2,
  },
  previewItem: {
    width: 80,
    height: 110,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: CHIP_BG,
  },
  previewThumb: { width: '100%', height: '100%' },
  previewNewBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: LIVE_PINK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  previewNewText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  removeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: CHIP_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: TEXT_MAIN, fontSize: 14, fontWeight: '700' },
  followBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: LIVE_PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnSecondary: { backgroundColor: CHIP_BG },
  followBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  followBtnTextSecondary: { color: TEXT_MAIN },
  emptyWrap: { paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' },
  emptyTitle: { color: TEXT_MUTED, fontSize: 14, textAlign: 'center' },
  emptyCta: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: LIVE_PINK,
  },
  emptyCtaText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 10,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalItemText: { color: TEXT_MAIN, fontSize: 15 },
  modalCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
    marginTop: 6,
    justifyContent: 'center',
  },
});
