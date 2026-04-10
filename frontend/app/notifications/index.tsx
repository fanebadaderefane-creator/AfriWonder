import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'like',
    title: 'Aminata a aime votre video',
    subtitle: 'Danse traditionnelle malienne',
    avatar: 'https://i.pravatar.cc/150?img=1',
    time: '2 min',
    read: false,
  },
  {
    id: 'n2',
    type: 'follow',
    title: 'Moussa vous suit maintenant',
    subtitle: 'Suivez-le aussi pour decouvrir son contenu',
    avatar: 'https://i.pravatar.cc/150?img=2',
    time: '15 min',
    read: false,
  },
  {
    id: 'n3',
    type: 'comment',
    title: 'Awa a commente votre video',
    subtitle: '"Magnifique!"',
    avatar: 'https://i.pravatar.cc/150?img=3',
    time: '1h',
    read: false,
  },
  {
    id: 'n4',
    type: 'order',
    title: 'Commande expediee',
    subtitle: 'Votre Robe Bogolan est en route',
    avatar: 'https://i.pravatar.cc/150?img=50',
    time: '3h',
    read: true,
  },
  {
    id: 'n5',
    type: 'live',
    title: 'Ibrahim est en live',
    subtitle: 'Musique Live - Rejoignez maintenant!',
    avatar: 'https://i.pravatar.cc/150?img=4',
    time: '5h',
    read: true,
  },
  {
    id: 'n6',
    type: 'promo',
    title: 'Offre speciale!',
    subtitle: '-30% sur la mode africaine ce weekend',
    avatar: 'https://i.pravatar.cc/150?img=50',
    time: '1j',
    read: true,
  },
  {
    id: 'n7',
    type: 'payment',
    title: 'Paiement recu',
    subtitle: '15 000 FCFA de Aminata Diallo',
    avatar: 'https://i.pravatar.cc/150?img=1',
    time: '2j',
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like': return { name: 'heart', color: Colors.like };
    case 'follow': return { name: 'person-add', color: Colors.info };
    case 'comment': return { name: 'chatbubble', color: Colors.success };
    case 'order': return { name: 'cube', color: Colors.primary };
    case 'live': return { name: 'radio', color: Colors.live };
    case 'promo': return { name: 'pricetag', color: Colors.accent };
    case 'payment': return { name: 'wallet', color: Colors.success };
    default: return { name: 'notifications', color: Colors.textSecondary };
  }
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const renderNotification = ({ item }: { item: typeof NOTIFICATIONS[0] }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity style={[styles.notifItem, !item.read && styles.notifUnread]}>
        <View style={styles.notifLeft}>
          <Image source={{ uri: item.avatar }} style={styles.notifAvatar} />
          <View style={[styles.notifIconBadge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name as any} size={12} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
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
        <TouchableOpacity>
          <Text style={styles.markAll}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.notifList}
      />
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
