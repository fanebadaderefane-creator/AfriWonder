import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  from_user_name?: string | null;
  from_user_id?: string | null;
  reference_type?: string;
  avatar?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like': return { name: 'heart', color: Colors.like };
    case 'follow': case 'new_wonder': return { name: 'person-add', color: Colors.info };
    case 'comment': return { name: 'chatbubble', color: Colors.success };
    case 'order': return { name: 'cube', color: Colors.primary };
    case 'live': case 'live_started': return { name: 'radio', color: Colors.live || '#FF0000' };
    case 'promo': return { name: 'pricetag', color: Colors.accent };
    case 'payment': return { name: 'wallet', color: Colors.success };
    case 'message_new': return { name: 'chatbubble-ellipses', color: Colors.primary };
    default: return { name: 'notifications', color: Colors.textSecondary };
  }
};

const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'A l\'instant';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}j`;
  return `${Math.floor(diffD / 30)} mois`;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications', { params: { page: 1, limit: 50 } });
      const data = response.data?.data || response.data;
      const backendNotifs = data?.notifications || [];
      setNotifications(backendNotifs.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title || '',
        message: n.message || '',
        is_read: n.is_read,
        created_at: typeof n.created_at === 'string' ? n.created_at : (n.created_at ? new Date(n.created_at).toISOString() : ''),
        from_user_name: n.from_user_name,
        from_user_id: n.from_user_id,
        reference_type: n.reference_type,
        avatar: n.from_user_id ? `https://i.pravatar.cc/150?u=${n.from_user_id}` : undefined,
      })));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  }, []);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await apiClient.put('/notifications/read-all', {}); } catch {}
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity style={[styles.notifItem, !item.is_read && styles.notifUnread]}>
        <View style={styles.notifLeft}>
          <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150?img=50' }} style={styles.notifAvatar} />
          <View style={[styles.notifIconBadge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name as any} size={12} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>{item.message}</Text>
          <Text style={styles.notifTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notifList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  markAll: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  notifList: {
    paddingBottom: Spacing.xxxl,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  notifUnread: {
    backgroundColor: Colors.primary + '08',
  },
  notifLeft: {
    position: 'relative',
  },
  notifAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  notifIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  notifSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  notifTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});
