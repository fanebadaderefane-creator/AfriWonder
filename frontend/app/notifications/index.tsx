import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import notificationService from '../../src/services/notificationService';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: Record<string, string>;
  reference_type?: string | null;
  reference_id?: string | null;
  sender_avatar?: string | null;
}

const NOTIF_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  like: { name: 'heart', color: '#FF4757' },
  comment: { name: 'chatbubble', color: '#3B82F6' },
  follow: { name: 'person-add', color: '#10B981' },
  mention: { name: 'at', color: '#8B5CF6' },
  message: { name: 'chatbubble-ellipses', color: '#1DC3E2' },
  message_new: { name: 'chatbubble-ellipses', color: '#1DC3E2' },
  payment: { name: 'wallet', color: '#10B981' },
  order: { name: 'cart', color: '#F59E0B' },
  live: { name: 'radio', color: '#EF4444' },
  live_started: { name: 'radio', color: '#EF4444' },
  gift: { name: 'gift', color: '#FFD700' },
  tip: { name: 'gift', color: '#FF6B00' },
  withdrawal: { name: 'cash', color: '#10B981' },
  moderation: { name: 'shield', color: '#EF4444' },
  system: { name: 'information-circle', color: '#6B7280' },
  call_incoming: { name: 'call', color: '#10B981' },
  call_missed: { name: 'call', color: '#EF4444' },
  achievement: { name: 'trophy', color: '#FFD700' },
  subscription: { name: 'star', color: '#A855F7' },
};

const FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'social', label: 'Social' },
  { id: 'messages', label: 'Messages' },
  { id: 'finance', label: 'Finance' },
  { id: 'live', label: 'Live' },
  { id: 'system', label: 'Système' },
] as const;

const SOCIAL_TYPES = ['like', 'comment', 'follow', 'mention', 'achievement', 'new_wonder'];
const MESSAGE_TYPES = ['message', 'message_new', 'call_incoming', 'call_missed'];
const FINANCE_TYPES = ['payment', 'order', 'gift', 'tip', 'withdrawal', 'subscription'];
const LIVE_TYPES = ['live', 'live_started'];

function buildNavData(raw: {
  type?: string;
  reference_type?: string | null;
  reference_id?: string | null;
  from_user_id?: string | null;
}): Record<string, string> {
  const d: Record<string, string> = {};
  const rt = String(raw.reference_type || '').toLowerCase();
  const rid = String(raw.reference_id || '');
  if (rt.includes('video') || rt === 'video') d.videoId = rid;
  if (rt.includes('conversation') || rt.includes('message') || rt === 'conversation') d.conversationId = rid;
  if (rt.includes('order')) d.orderId = rid;
  if (rt.includes('user') && rid) d.userId = rid;
  if (raw.type === 'follow' && raw.from_user_id) d.userId = raw.from_user_id;
  return d;
}

function mapApiItem(n: any): Notification {
  const read = Boolean(n.read ?? n.is_read);
  const mergedData = {
    ...buildNavData({
      type: n.type,
      reference_type: n.reference_type,
      reference_id: n.reference_id,
      from_user_id: n.from_user_id,
    }),
    ...(typeof n.data === 'object' && n.data !== null ? n.data : {}),
  };
  return {
    id: String(n.id),
    type: String(n.type || 'system'),
    title: String(n.title || ''),
    message: String(n.message || n.body || ''),
    read,
    created_at: typeof n.created_at === 'string' ? n.created_at : new Date(n.created_at).toISOString(),
    data: mergedData,
    reference_type: n.reference_type,
    reference_id: n.reference_id,
    sender_avatar: n.sender_avatar || n.from_user_avatar || n.data?.senderAvatar || null,
  };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketService.connect(accessToken);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    const handler = (payload: any) => {
      const n = payload?.notification ?? payload;
      if (!n) return;
      const row = mapApiItem({
        id: n.id || `rt-${Date.now()}`,
        type: n.type || 'system',
        title: n.title || '',
        message: n.message || n.body || '',
        is_read: false,
        created_at: n.created_at || new Date().toISOString(),
        data: n.data,
        reference_type: n.reference_type,
        reference_id: n.reference_id,
        from_user_id: n.from_user_id,
        sender_avatar: n.sender_avatar,
      });
      setNotifications((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
      void notificationService.scheduleLocal(row.title || 'AfriWonder', row.message || '', row.data);
    };

    const unsub1 = socketService.on('notification', handler);
    const unsub2 = socketService.on('new_notification', handler);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const loadNotifications = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiClient.get('/notifications', { params: { page: pageNum, limit: 30 } });
      const d = res.data?.data ?? res.data;
      const items = (d?.notifications ?? d?.items ?? []) as any[];
      const mapped: Notification[] = items.map(mapApiItem);
      if (reset) {
        setNotifications(mapped);
      } else {
        setNotifications((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const extra = mapped.filter((m) => !ids.has(m.id));
          return [...prev, ...extra];
        });
      }
      setHasMore(mapped.length >= 30);
      setPage(pageNum);
    } catch {
      if (reset) setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications(1, true);
  }, [loadNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadNotifications(1, true).finally(() => setRefreshing(false));
  }, [loadNotifications]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) void loadNotifications(page + 1, false);
  }, [hasMore, loading, loadingMore, page, loadNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiClient.put(`/notifications/${id}/read`, {});
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationService.setBadgeCount(0);
    try {
      await apiClient.put('/notifications/read-all', {});
    } catch {
      /* ignore */
    }
  };

  const handleNotifPress = (n: Notification) => {
    if (!n.read) void markAsRead(n.id);
    const data = n.data || {};
    switch (n.type) {
      case 'message':
      case 'message_new':
        if (data.conversationId) router.push({ pathname: '/messages/[id]', params: { id: data.conversationId } });
        break;
      case 'like':
      case 'comment':
      case 'mention':
        if (data.videoId) router.push({ pathname: '/watch/[id]', params: { id: data.videoId } });
        break;
      case 'follow':
      case 'new_wonder':
        if (data.userId) router.push({ pathname: '/user/[id]', params: { id: data.userId } });
        break;
      case 'live':
      case 'live_started':
        router.push('/(tabs)');
        break;
      case 'order':
        if (data.orderId) router.push({ pathname: '/orders/[id]', params: { id: data.orderId } });
        break;
      case 'payment':
      case 'withdrawal':
      case 'tip':
      case 'gift':
        router.push('/wallet');
        break;
      case 'call_incoming':
      case 'call_missed':
        router.push('/messages');
        break;
      case 'subscription':
        router.push('/creator/revenue-share' as never);
        break;
      default:
        break;
    }
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'social') return SOCIAL_TYPES.includes(n.type);
      if (filter === 'messages') return MESSAGE_TYPES.includes(n.type);
      if (filter === 'finance') return FINANCE_TYPES.includes(n.type);
      if (filter === 'live') return LIVE_TYPES.includes(n.type);
      if (filter === 'system') return n.type === 'system' || n.type === 'moderation';
      return true;
    });
  }, [notifications, filter]);

  const iconFor = (type: string) => NOTIF_ICONS[type] || NOTIF_ICONS.system;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => void markAllRead()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        renderItem={({ item: n }) => {
          const ic = iconFor(n.type);
          return (
            <TouchableOpacity
              style={[styles.notifItem, !n.read && styles.notifItemUnread]}
              onPress={() => handleNotifPress(n)}
            >
              {n.sender_avatar ? (
                <Image source={{ uri: n.sender_avatar }} style={styles.notifAvatar} />
              ) : (
                <View style={[styles.notifIcon, { backgroundColor: `${ic.color}33` }]}>
                  <Ionicons name={ic.name} size={20} color={ic.color} />
                </View>
              )}
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.notifMessage} numberOfLines={2}>
                  {n.message}
                </Text>
                <Text style={styles.notifTime}>{formatTime(n.created_at)}</Text>
              </View>
              {!n.read ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={50} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,107,0,0.12)',
  },
  markAllText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifItemUnread: { backgroundColor: 'rgba(255,107,0,0.04)' },
  notifAvatar: { width: 44, height: 44, borderRadius: 22 },
  notifIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  notifMessage: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2, lineHeight: 18 },
  notifTime: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.md },
});
