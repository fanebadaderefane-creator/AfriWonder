import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const iconMap = {
  like: { icon: 'heart', color: '#EF4444' },
  comment: { icon: 'chatbubble-ellipses', color: '#3B82F6' },
  follow: { icon: 'person-add', color: '#8B5CF6' },
  mention: { icon: 'at', color: '#3B82F6' },
  tip: { icon: 'cash', color: '#EAB308' },
  order: { icon: 'bag', color: '#22C55E' },
  message: { icon: 'chatbubble', color: '#6366F1' },
  live: { icon: 'radio', color: '#EC4899' },
  system: { icon: 'notifications', color: '#6B7280' },
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 2) return 'Hier';
    return `Il y a ${diffDays} j`;
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await api.notifications.list({ limit: 50 });
      setNotifications(Array.isArray(list) ? list : []);
    } catch (_) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {}
    finally {
      setMarkingAll(false);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const grouped = notifications.reduce((acc, n) => {
    const d = n.created_at || n.created_date;
    let key = "Plus ancien";
    if (d) {
      const date = new Date(d);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) key = "Aujourd'hui";
      else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) key = 'Hier';
      }
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  const sections = Object.entries(grouped);
  const listData = sections.flatMap(([group, items]) => [
    { key: `h-${group}`, isHeader: true, label: group },
    ...items.map((n) => ({ ...n, key: String(n.id ?? n.created_at ?? Math.random()), isHeader: false })),
  ]);

  const renderNotificationRow = (item) => {
    const config = iconMap[item.type] || iconMap.system;
    return (
      <TouchableOpacity
        style={[styles.notifRow, !item.is_read && styles.notifRowUnread]}
        activeOpacity={0.8}
      >
        <View style={styles.notifLeft}>
          {item.from_user_avatar ? (
            <Image source={{ uri: item.from_user_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>
                {(item.from_user_name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.iconBadge, { backgroundColor: config.color + '30' }]}>
            <Ionicons name={config.icon} size={14} color={config.color} />
          </View>
        </View>
        <View style={styles.notifBody}>
          <Text style={styles.notifText}>
            <Text style={styles.notifBold}>{item.from_user_name || 'Utilisateur'}</Text>
            {' '}{item.message || item.body || item.text || 'Notification'}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.created_at || item.created_date)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Connectez-vous pour voir vos notifications.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#3B82F6" />
                  <Text style={styles.markAllText}>Tout lire</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={64} color="#4B5563" />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>Vos notifications apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={({ item }) =>
            item.isHeader ? (
              <Text style={styles.groupLabel}>{item.label}</Text>
            ) : (
              renderNotificationRow(item)
            )
          }
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  notifRowUnread: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  notifLeft: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  notifBold: {
    fontWeight: '600',
    color: '#F9FAFB',
  },
  notifTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
});
