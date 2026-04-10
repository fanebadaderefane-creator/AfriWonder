import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

const POSTS = [
  { id: 'p1', author: 'Moussa Keita', avatar: 'https://picsum.photos/50/50?random=130', time: 'Il y a 2h', text: 'Quelqu\'un a des recommandations pour un bon framework mobile en 2025?', likes: 45, comments: 12 },
  { id: 'p2', author: 'Aminata Diallo', avatar: 'https://picsum.photos/50/50?random=131', time: 'Il y a 5h', text: 'Je viens de lancer mon nouveau site web! Jetez un coup d\'oeil et donnez-moi vos retours.', likes: 89, comments: 23 },
  { id: 'p3', author: 'Ibrahim Traore', avatar: 'https://picsum.photos/50/50?random=132', time: 'Hier', text: 'Meetup developpeurs ce samedi a Bamako. Qui est interesse?', likes: 156, comments: 67 },
];

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Developpeurs Mali</Text>
        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Community Info */}
        <View style={styles.infoCard}>
          <Image source={{ uri: 'https://picsum.photos/400/150?random=135' }} style={styles.coverImage} />
          <View style={styles.infoContent}>
            <Text style={styles.communityName}>Developpeurs Mali</Text>
            <Text style={styles.communityDesc}>Communaute des developpeurs maliens. Entraide, partage de connaissances et networking.</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>3.2K</Text><Text style={styles.statLabel}>Membres</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>156</Text><Text style={styles.statLabel}>Posts/semaine</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>12</Text><Text style={styles.statLabel}>En ligne</Text></View>
            </View>
            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Membre</Text>
              <Ionicons name="checkmark" size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts */}
        <Text style={styles.sectionTitle}>Publications</Text>
        {POSTS.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
              <View style={styles.postAuthorInfo}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              <TouchableOpacity><Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.postText}>{post.text}</Text>
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.postActionText}>{post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.postActionText}>{post.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  infoCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.xxl },
  coverImage: { width: '100%', height: 120 },
  infoContent: { padding: Spacing.lg },
  communityName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginBottom: 4 },
  communityDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.md, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm },
  joinButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  postCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAuthorInfo: { flex: 1, marginLeft: Spacing.md },
  postAuthor: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  postTime: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  postText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 22, marginBottom: Spacing.md },
  postActions: { flexDirection: 'row', gap: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postActionText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
