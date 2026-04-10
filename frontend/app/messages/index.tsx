import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Aminata Diallo',
    avatar: 'https://i.pravatar.cc/150?img=1',
    lastMessage: 'Salut! Tu as vu ma nouvelle video?',
    time: '2 min',
    unread: 3,
    online: true,
  },
  {
    id: 'c2',
    name: 'Moussa Ndiaye',
    avatar: 'https://i.pravatar.cc/150?img=2',
    lastMessage: 'Merci pour la commande!',
    time: '15 min',
    unread: 1,
    online: true,
  },
  {
    id: 'c3',
    name: 'Awa Kone',
    avatar: 'https://i.pravatar.cc/150?img=3',
    lastMessage: 'Le colis est en route',
    time: '1h',
    unread: 0,
    online: false,
  },
  {
    id: 'c4',
    name: 'Ibrahim Toure',
    avatar: 'https://i.pravatar.cc/150?img=4',
    lastMessage: 'On se retrouve demain?',
    time: '3h',
    unread: 0,
    online: false,
  },
  {
    id: 'c5',
    name: 'Fatoumata Diarra',
    avatar: 'https://i.pravatar.cc/150?img=9',
    lastMessage: 'J\'adore ta collection!',
    time: 'Hier',
    unread: 0,
    online: true,
  },
  {
    id: 'c6',
    name: 'Support AfriWonder',
    avatar: 'https://i.pravatar.cc/150?img=50',
    lastMessage: 'Bienvenue sur AfriWonder! N\'hesitez pas...',
    time: '2j',
    unread: 0,
    online: true,
  },
];

export default function MessagesListScreen() {
  const insets = useSafeAreaInsets();

  const renderConversation = ({ item }: { item: typeof CONVERSATIONS[0] }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push(`/messages/${item.id}`)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={[styles.conversationTime, item.unread > 0 && styles.timeUnread]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Online Users */}
      <View style={styles.onlineSection}>
        <FlatList
          data={CONVERSATIONS.filter(c => c.online)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `online-${item.id}`}
          contentContainerStyle={styles.onlineList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.onlineUser} onPress={() => router.push(`/messages/${item.id}`)}>
              <View style={styles.onlineAvatarContainer}>
                <Image source={{ uri: item.avatar }} style={styles.onlineAvatar} />
                <View style={styles.onlineIndicator} />
              </View>
              <Text style={styles.onlineName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Conversations */}
      <FlatList
        data={CONVERSATIONS}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conversationsList}
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
  onlineSection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
  },
  onlineList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  onlineUser: {
    alignItems: 'center',
    width: 60,
  },
  onlineAvatarContainer: {
    position: 'relative',
  },
  onlineAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  onlineName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  conversationsList: {
    paddingTop: Spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  conversationTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  timeUnread: {
    color: Colors.primary,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
});
