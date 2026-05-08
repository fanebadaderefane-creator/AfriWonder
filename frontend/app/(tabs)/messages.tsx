import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import socketService from '../../src/services/socketService';
import { useAppTheme } from '../../src/theme/ThemeContext';
import type { AppPalette } from '../../src/theme/themePalettes';
import { safeRouterPush } from '../../src/utils/safeRouter';

/**
 * Inbox = écran d'entrée de l'onglet « Inbox » (accents alignés marque AfriWonder / orange).
 *
 *  - En haut : grand bloc « Messages » qui mène à `/messages` (UI WhatsApp existante).
 *  - Filtres horizontaux : All activity / Likes & saves / Comments & mentions /
 *    Dans ton Wonder / Du AfriWonder.
 *  - Liste de notifications regroupées par section (Today / Yesterday / This week /
 *    Older) consommée depuis `GET /api/notifications`.
 *  - Tap sur une ligne : marque lue (`PUT /:id/read`) puis navigue vers
 *    `/watch/[id]`, `/user/[id]`, `/messages/[id]` selon `reference_type`.
 *  - Bouton « Tout marquer lu » via `PUT /api/notifications/read-all`.
 *
 *  La messagerie (DM) reste intégralement dispo via `/messages` — ne pas dupliquer ici.
 */

const INK_LIGHT = '#161616';
const MUTED_LIGHT = '#8C8C8C';
const DIVIDER_LIGHT = 'rgba(0,0,0,0.07)';
const INK_DARK = '#F5F5F5';
const MUTED_DARK = '#A0A0A0';
const DIVIDER_DARK = 'rgba(255,255,255,0.08)';

type FilterId = 'all' | 'likes' | 'comments' | 'followers' | 'system';

const FILTERS: { id: FilterId; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'all', label: 'All activity', icon: 'sparkles-outline' },
  { id: 'likes', label: 'Likes', icon: 'heart-outline' },
  { id: 'comments', label: 'Comments', icon: 'chatbubble-outline' },
  { id: 'followers', label: 'Dans ton Wonder', icon: 'person-add-outline' },
  { id: 'system', label: 'From AfriWonder', icon: 'megaphone-outline' },
];

type ApiNotification = {
  id: string;
  type: string;
  title?: string | null;
  message?: string | null;
  is_read?: boolean;
  read?: boolean;
  created_at: string;
  data?: Record<string, unknown> | null;
  reference_type?: string | null;
  reference_id?: string | null;
  sender_avatar?: string | null;
  from_user_id?: string | null;
};

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  avatar?: string | null;
  thumbnail?: string | null;
  /** Cible de navigation prête à l'emploi pour `router.push()`. */
  goTo: () => void;
};

const LIKE_TYPES = new Set(['like', 'save', 'video_like', 'reaction', 'gift', 'tip']);
const COMMENT_TYPES = new Set(['comment', 'mention', 'reply']);
const FOLLOW_TYPES = new Set(['follow', 'new_follower', 'follow_request', 'new_wonder']);
const SYSTEM_TYPES = new Set([
  'system',
  'achievement',
  'subscription',
  'order',
  'payment',
  'live',
  'live_started',
  'moderation',
  'withdrawal',
]);

function classify(type: string): FilterId {
  const t = String(type || '').toLowerCase();
  if (LIKE_TYPES.has(t)) return 'likes';
  if (COMMENT_TYPES.has(t)) return 'comments';
  if (FOLLOW_TYPES.has(t)) return 'followers';
  if (SYSTEM_TYPES.has(t)) return 'system';
  return 'system';
}

function notifIcon(
  type: string,
  colors: AppPalette,
): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  const t = type.toLowerCase();
  if (LIKE_TYPES.has(t)) return { name: 'heart', color: colors.like };
  if (t === 'comment' || t === 'reply') return { name: 'chatbubble', color: colors.info };
  if (t === 'mention') return { name: 'at', color: colors.primaryLight };
  if (FOLLOW_TYPES.has(t)) return { name: 'person-add', color: colors.primary };
  if (t === 'live' || t === 'live_started') return { name: 'radio', color: colors.live };
  if (t === 'gift' || t === 'tip') return { name: 'gift', color: colors.accent };
  if (t === 'achievement') return { name: 'trophy', color: colors.accent };
  if (t === 'order' || t === 'payment') return { name: 'cart', color: colors.warning };
  return { name: 'notifications', color: colors.textMuted };
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function bucketOf(date: Date): 'today' | 'yesterday' | 'week' | 'older' {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  const start7 = startToday - 6 * 86_400_000;
  const t = date.getTime();
  if (t >= startToday) return 'today';
  if (t >= startYesterday) return 'yesterday';
  if (t >= start7) return 'week';
  return 'older';
}

function bucketLabel(b: 'today' | 'yesterday' | 'week' | 'older'): string {
  if (b === 'today') return 'Today';
  if (b === 'yesterday') return 'Yesterday';
  if (b === 'week') return 'This week';
  return 'Earlier';
}

function buildNavigation(api: ApiNotification): () => void {
  const refType = String(api.reference_type || '').toLowerCase();
  const refId = String(api.reference_id || '');
  const dataRecord =
    typeof api.data === 'object' && api.data !== null ? (api.data as Record<string, unknown>) : {};
  const dataValue = (key: string): string | undefined => {
    const v = dataRecord[key];
    return typeof v === 'string' ? v : undefined;
  };
  /** Résolution du "qui" (sender) — accepte tous les noms de champs vus en base. */
  const fromUser =
    api.from_user_id ||
    dataValue('from_user_id') ||
    dataValue('userId') ||
    dataValue('fromUserId') ||
    dataValue('callerId') ||
    dataValue('senderId') ||
    dataValue('actorId');

  return () => {
    if (refType === 'video' && refId) {
      safeRouterPush({ pathname: '/watch/[id]', params: { id: refId } });
      return;
    }
    if ((refType === 'conversation' || refType === 'message') && refId) {
      safeRouterPush({ pathname: '/messages/[id]', params: { id: refId } });
      return;
    }
    /** Notifs d'appel : l'id de conversation ≠ userId — résoudre le fil via l'API comme depuis un profil. */
    if (refType === 'direct_call') {
      if (fromUser) {
        void (async () => {
          try {
            const res = await apiClient.get(`/messages/conversation/${encodeURIComponent(String(fromUser))}`);
            const pkg = res.data?.data ?? res.data;
            const convId = pkg?.id;
            if (convId) {
              safeRouterPush({
                pathname: '/messages/[id]',
                params: { id: String(convId), otherUserId: String(fromUser) },
              });
              return;
            }
          } catch {
            /* ignore */
          }
          safeRouterPush('/messages');
        })();
        return;
      }
      safeRouterPush('/messages');
      return;
    }
    if (refType === 'user' && refId) {
      safeRouterPush({ pathname: '/user/[id]', params: { id: refId } });
      return;
    }
    if (refType === 'order' && refId) {
      safeRouterPush('/orders');
      return;
    }
    if (refType === 'live' && refId) {
      safeRouterPush({ pathname: '/live/[id]', params: { id: refId } });
      return;
    }
    /** Fallback ultime : profil de l'expéditeur si on l'a, sinon page Inbox courante. */
    if (fromUser) {
      safeRouterPush({ pathname: '/user/[id]', params: { id: String(fromUser) } });
      return;
    }
  };
}

function fallbackTitle(type: string, message: string): string {
  if (message?.trim()) return '';
  const t = type.toLowerCase();
  if (LIKE_TYPES.has(t)) return 'New like';
  if (t === 'comment') return 'New comment';
  if (t === 'mention') return 'You were mentioned';
  if (FOLLOW_TYPES.has(t)) return 'Nouveau Wonder';
  if (t === 'live' || t === 'live_started') return 'A creator is live';
  return 'New notification';
}

function mapNotification(api: ApiNotification): Notif {
  const dataRecord =
    typeof api.data === 'object' && api.data !== null ? (api.data as Record<string, unknown>) : {};
  const dataValue = (key: string): string | undefined => {
    const v = dataRecord[key];
    return typeof v === 'string' ? v : undefined;
  };
  const message = String(api.message || api.title || '').trim();
  const title = (api.title || '').trim() || fallbackTitle(api.type, message);
  return {
    id: String(api.id),
    type: api.type,
    title,
    message,
    read: Boolean(api.read ?? api.is_read),
    createdAt: new Date(api.created_at),
    avatar: api.sender_avatar ? toAbsoluteMediaUrl(api.sender_avatar) : null,
    thumbnail:
      dataValue('thumbnail_url') ||
      dataValue('video_thumbnail') ||
      dataValue('thumbnail') ||
      null,
    goTo: buildNavigation(api),
  };
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useAppTheme();
  const ink = mode === 'light' ? INK_LIGHT : INK_DARK;
  const muted = mode === 'light' ? MUTED_LIGHT : MUTED_DARK;
  const divider = mode === 'light' ? DIVIDER_LIGHT : DIVIDER_DARK;
  const unreadRowTint =
    mode === 'light' ? 'rgba(230, 90, 0, 0.09)' : 'rgba(255, 107, 0, 0.14)';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [filter, setFilter] = useState<FilterId>('all');
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestMessage, setLatestMessage] = useState<{ name?: string; preview?: string; avatar?: string | null } | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications', { params: { page: 1, limit: 50 } });
      const data = res.data?.data ?? res.data;
      const list: ApiNotification[] = Array.isArray(data?.notifications)
        ? (data.notifications as ApiNotification[])
        : [];
      setItems(list.map(mapNotification));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessagesPreview = useCallback(async () => {
    try {
      const res = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 5 } });
      const data = res.data?.data ?? res.data;
      const convos: {
        unread_count?: number;
        last_message_text?: string;
        is_group?: boolean;
        group_name?: string;
        group_avatar?: string;
        other?: { full_name?: string; username?: string; profile_image?: string };
      }[] = Array.isArray(data?.conversations) ? data.conversations : [];
      const total = convos.reduce((acc, c) => acc + (Number(c.unread_count) || 0), 0);
      setUnreadMessages(total);
      const top = convos.find((c) => (c.last_message_text || '').trim().length > 0) || convos[0];
      if (top) {
        const name = top.is_group
          ? top.group_name || 'Group'
          : top.other?.full_name || top.other?.username || 'Direct message';
        const avatar = top.is_group ? top.group_avatar : top.other?.profile_image;
        setLatestMessage({
          name,
          preview: top.last_message_text || '',
          avatar: avatar ? toAbsoluteMediaUrl(avatar) : null,
        });
      } else {
        setLatestMessage(null);
      }
    } catch {
      setUnreadMessages(0);
      setLatestMessage(null);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    void loadMessagesPreview();
  }, [loadNotifications, loadMessagesPreview]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
      void loadMessagesPreview();
    }, [loadNotifications, loadMessagesPreview]),
  );

  /** Temps réel : rafraîchit la liste à chaque nouvelle notif/message socket. */
  useEffect(() => {
    if (!isAuthenticated) return;
    const offNotif = socketService.on('new_notification', () => void loadNotifications());
    const offNotifAlt = socketService.on('notification', () => void loadNotifications());
    const offMessage = socketService.on('new_message', () => void loadMessagesPreview());
    return () => {
      offNotif();
      offNotifAlt();
      offMessage();
    };
  }, [isAuthenticated, loadNotifications, loadMessagesPreview]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.all([loadNotifications(), loadMessagesPreview()]);
  }, [loadNotifications, loadMessagesPreview]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((n) => classify(n.type) === filter);
  }, [items, filter]);

  const buckets = useMemo(() => {
    const map: Record<'today' | 'yesterday' | 'week' | 'older', Notif[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };
    for (const n of filtered) {
      map[bucketOf(n.createdAt)].push(n);
    }
    return map;
  }, [filtered]);

  const totalUnread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiClient.put('/notifications/read-all', {});
    } catch {
      /* best effort */
    }
  }, []);

  const onTapNotif = useCallback(async (n: Notif) => {
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      try {
        await apiClient.put(`/notifications/${n.id}/read`, {});
      } catch {
        /* best effort */
      }
    }
    n.goTo();
  }, []);

  if (!isAuthenticated) {
    return (
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
        ]}
      >
        <Ionicons name="notifications-outline" size={56} color={muted} />
        <Text style={[styles.emptyTitle, { color: ink }]}>Sign in to view your inbox</Text>
        <Text style={[styles.emptySub, { color: muted }]}>Likes, comments and messages appear here.</Text>
        <TouchableOpacity
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInBtnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: divider }]}>
        <Text style={[styles.headerTitle, { color: ink }]}>Inbox</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {totalUnread > 0 ? (
            <TouchableOpacity onPress={() => void markAllRead()} style={styles.headerBtn} accessibilityLabel="Mark all read">
              <Ionicons name="checkmark-done-outline" size={22} color={ink} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => router.push('/settings/notifications' as never)}
            style={styles.headerBtn}
            accessibilityLabel="Notification settings"
          >
            <Ionicons name="settings-outline" size={20} color={ink} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <TouchableOpacity
          style={[styles.messagesCard, { backgroundColor: colors.card }]}
          activeOpacity={0.85}
          onPress={() => router.push('/messages')}
        >
          <View style={[styles.messagesIconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="paper-plane" size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.messagesTitleRow}>
              <Text style={[styles.messagesTitle, { color: ink }]}>Messages</Text>
              {unreadMessages > 0 ? (
                <View style={[styles.unreadPill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadPillText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.messagesPreview, { color: muted }]} numberOfLines={1}>
              {latestMessage?.preview
                ? `${latestMessage.name || ''} · ${latestMessage.preview}`
                : 'Tap to start chatting'}
            </Text>
          </View>
          {latestMessage?.avatar ? (
            <Image source={{ uri: latestMessage.avatar }} style={styles.messagesPreviewAvatar} />
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={muted} />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface },
                  active && { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons name={f.icon} size={14} color={active ? '#FFF' : ink} />
                <Text style={[styles.filterText, { color: ink }, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={56} color={muted} />
            <Text style={[styles.emptyTitle, { color: ink }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: muted }]}>
              {filter === 'all'
                ? 'Likes, comments, mentions and follows will appear in your Inbox.'
                : 'No notifications match this filter.'}
            </Text>
          </View>
        ) : (
          (['today', 'yesterday', 'week', 'older'] as const).map((b) =>
            buckets[b].length === 0 ? null : (
              <View key={b} style={{ marginTop: 14 }}>
                <Text style={[styles.sectionLabel, { color: muted }]}>{bucketLabel(b)}</Text>
                {buckets[b].map((n) => {
                  const ic = notifIcon(n.type, colors);
                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => void onTapNotif(n)}
                      activeOpacity={0.7}
                      style={[
                        styles.notifRow,
                        { borderBottomColor: divider },
                        !n.read && { backgroundColor: unreadRowTint },
                      ]}
                    >
                      <View style={styles.notifAvatarWrap}>
                        {n.avatar ? (
                          <Image source={{ uri: n.avatar }} style={[styles.notifAvatar, { backgroundColor: colors.border }]} />
                        ) : (
                          <View style={[styles.notifAvatar, styles.notifAvatarFallback, { backgroundColor: colors.border }]}>
                            <Ionicons name="person" size={20} color={colors.textSecondary} />
                          </View>
                        )}
                        <View style={[styles.notifIconBadge, { backgroundColor: ic.color, borderColor: colors.background }]}>
                          <Ionicons name={ic.name} size={11} color="#FFF" />
                        </View>
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        {n.title ? (
                          <Text style={[styles.notifTitle, { color: ink }]} numberOfLines={1}>
                            {n.title}
                          </Text>
                        ) : null}
                        <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                          {n.message || 'New activity on your profile'}
                        </Text>
                        <Text style={[styles.notifTime, { color: muted }]}>{formatRelative(n.createdAt)}</Text>
                      </View>

                      {n.thumbnail ? (
                        <Image
                          source={{ uri: toAbsoluteMediaUrl(n.thumbnail) }}
                          style={[styles.notifThumb, { backgroundColor: colors.border }]}
                        />
                      ) : null}
                      {!n.read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  /* Messages card (entrée vers la messagerie WhatsApp-like). */
  messagesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  messagesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  messagesTitle: { fontSize: 16, fontWeight: '800' },
  unreadPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  unreadPillText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  messagesPreview: { fontSize: 13, marginTop: 2 },
  messagesPreviewAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 4 },

  /* Filtres */
  filtersRow: { paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  filterText: { fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#FFF' },

  /* Sections + lignes notif */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifAvatarWrap: { position: 'relative' },
  notifAvatar: { width: 44, height: 44, borderRadius: 22 },
  notifAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  notifIconBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  notifTitle: { fontSize: 14, fontWeight: '700' },
  notifMessage: { fontSize: 14, marginTop: 1 },
  notifTime: { fontSize: 12, marginTop: 4 },
  notifThumb: { width: 44, height: 56, borderRadius: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },

  /* Empty / login */
  emptyWrap: { paddingHorizontal: 24, paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 14 },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 320,
  },
  signInBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
