import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import mobileApiClient from '../src/api/mobileClient';

const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  follow: { icon: 'person-add', color: '#4ECDC4' },
  like: { icon: 'heart', color: '#E91E63' },
  comment: { icon: 'chatbubble', color: '#3498DB' },
  tip: { icon: 'gift', color: '#FF6B00' },
  message: { icon: 'mail', color: '#9B59B6' },
  live: { icon: 'radio', color: '#E91E63' },
  system: { icon: 'notifications', color: Colors.primary },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res = await mobileApiClient.get('/mobile/notifications');
      const data = res.data?.data;
      setNotifications(data?.notifications || []);
      setUnread(data?.unread_count || 0);
    } catch {
      // Show empty state
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }, []);

  const markAllRead = async () => {
    try {
      await mobileApiClient.post('/mobile/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diff < 1) return 'Maintenant';
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}j`;
  };

  const renderNotif = ({ item }: any) => {
    const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.system;
    return (
      <TouchableOpacity style={[styles.notifRow, !item.is_read && styles.notifUnread]}>
        <View style={[styles.notifIcon, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications {unread > 0 ? `(${unread})` : ''}</Text>
        {unread > 0 && <TouchableOpacity onPress={markAllRead}><Text style={styles.markRead}>Tout lire</Text></TouchableOpacity>}
      </View>

      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={notifications}
          renderItem={renderNotif}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={60} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>Vos notifications apparaîtront ici</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  markRead: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  notifUnread: { backgroundColor: 'rgba(139,92,246,0.05)' },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  notifBody: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 1 },
  notifTime: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  emptyState: { alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
