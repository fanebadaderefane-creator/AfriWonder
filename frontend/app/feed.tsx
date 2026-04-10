import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactionsBar, ReactionType } from '../src/components/Reactions';

const GRID_GAP = 2;

// Stories
const STORIES = [
  { id: 'add', name: 'Votre Story', avatar: 'https://i.pravatar.cc/150?img=10', isAdd: true, hasNew: false, isLive: false },
  { id: 's1', name: 'Aminata', avatar: 'https://i.pravatar.cc/150?img=1', isAdd: false, hasNew: true, isLive: true },
  { id: 's2', name: 'Moussa', avatar: 'https://i.pravatar.cc/150?img=2', isAdd: false, hasNew: true, isLive: false },
  { id: 's3', name: 'Awa', avatar: 'https://i.pravatar.cc/150?img=3', isAdd: false, hasNew: true, isLive: false },
  { id: 's4', name: 'Ibrahim', avatar: 'https://i.pravatar.cc/150?img=4', isAdd: false, hasNew: true, isLive: false },
  { id: 's5', name: 'Fanta', avatar: 'https://i.pravatar.cc/150?img=5', isAdd: false, hasNew: false, isLive: false },
  { id: 's6', name: 'Boubacar', avatar: 'https://i.pravatar.cc/150?img=7', isAdd: false, hasNew: true, isLive: false },
];

interface Post {
  id: string;
  user: { name: string; avatar: string; verified: boolean; };
  timeAgo: string;
  content: string;
  images: string[];
  reactions: Record<string, number>;
  totalReactions: number;
  comments: number;
  shares: number;
  location?: string;
}

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    user: { name: 'Aminata Diallo', avatar: 'https://i.pravatar.cc/150?img=1', verified: true },
    timeAgo: '2h',
    content: 'Magnifique coucher de soleil sur le Niger depuis Bamako 🌅 La beaute de notre terre africaine ne cessera jamais de me surprendre. #Mali #Bamako #AfriWonder',
    images: ['https://picsum.photos/600/400?random=101'],
    reactions: { like: 245, love: 89, wow: 34, haha: 0, sad: 0, angry: 0 },
    totalReactions: 368,
    comments: 47,
    shares: 23,
    location: 'Bamako, Mali',
  },
  {
    id: 'p2',
    user: { name: 'Moussa Konate', avatar: 'https://i.pravatar.cc/150?img=2', verified: false },
    timeAgo: '4h',
    content: 'Nouveau projet en cours ! 🚀 Qui est pret pour la revolution tech en Afrique de l\'Ouest ? On recrute des developpeurs talentueux a Dakar et Abidjan.',
    images: [],
    reactions: { like: 156, love: 45, haha: 12, wow: 67, sad: 0, angry: 0 },
    totalReactions: 280,
    comments: 89,
    shares: 56,
  },
  {
    id: 'p3',
    user: { name: 'Awa Traore', avatar: 'https://i.pravatar.cc/150?img=3', verified: true },
    timeAgo: '6h',
    content: 'Ma nouvelle collection de bazin est disponible ! 👗✨ Commandez maintenant sur AfriWonder Market. Livraison gratuite dans tout le Mali.',
    images: [
      'https://picsum.photos/400/400?random=201',
      'https://picsum.photos/400/400?random=202',
      'https://picsum.photos/400/400?random=203',
      'https://picsum.photos/400/400?random=204',
    ],
    reactions: { like: 512, love: 234, wow: 78, haha: 5, sad: 0, angry: 0 },
    totalReactions: 829,
    comments: 134,
    shares: 89,
    location: 'Marche Rose, Bamako',
  },
  {
    id: 'p4',
    user: { name: 'Ibrahim Coulibaly', avatar: 'https://i.pravatar.cc/150?img=4', verified: false },
    timeAgo: '8h',
    content: 'Match incredible hier soir ! Les Aigles du Mali en route pour la CAN 2025 🦅⚽ Qui etait au stade ? Quelle ambiance !',
    images: ['https://picsum.photos/600/350?random=301'],
    reactions: { like: 890, love: 123, haha: 45, wow: 234, sad: 12, angry: 3 },
    totalReactions: 1307,
    comments: 256,
    shares: 178,
    location: 'Stade du 26 Mars, Bamako',
  },
  {
    id: 'p5',
    user: { name: 'Fanta Keita', avatar: 'https://i.pravatar.cc/150?img=5', verified: true },
    timeAgo: '12h',
    content: 'Recette du jour : Thieboudienne maison 🍚🐟 La recette complete est sur mon profil. N\'oubliez pas de sauvegarder ! #Cuisine #Senegal #Thieb',
    images: [
      'https://picsum.photos/500/400?random=401',
      'https://picsum.photos/500/400?random=402',
    ],
    reactions: { like: 678, love: 345, haha: 23, wow: 56, sad: 0, angry: 0 },
    totalReactions: 1102,
    comments: 89,
    shares: 234,
  },
];

const formatNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [postReactions, setPostReactions] = useState<Record<string, ReactionType>>({});
  const [newPostText, setNewPostText] = useState('');

  const handleReaction = useCallback((postId: string, reaction: ReactionType) => {
    setPostReactions(prev => ({ ...prev, [postId]: reaction }));
  }, []);

  const renderImages = (images: string[], postId: string) => {
    if (images.length === 0) return null;
    const imgWidth = screenWidth;

    if (images.length === 1) {
      return (
        <Image source={{ uri: images[0] }} style={{ width: imgWidth, height: imgWidth * 0.65 }} resizeMode="cover" />
      );
    }

    if (images.length === 2) {
      const half = (imgWidth - GRID_GAP) / 2;
      return (
        <View style={{ width: imgWidth, height: half * 1.2, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: half * 1.2 }}>
            <Image source={{ uri: images[0] }} style={{ width: half, height: half * 1.2 }} resizeMode="cover" />
          </View>
          <View style={{ position: 'absolute', left: half + GRID_GAP, top: 0, width: half, height: half * 1.2 }}>
            <Image source={{ uri: images[1] }} style={{ width: half, height: half * 1.2 }} resizeMode="cover" />
          </View>
        </View>
      );
    }

    // 3+ images: first large, rest in column
    const mainW = imgWidth * 0.65;
    const sideW = imgWidth - mainW - GRID_GAP;
    const mainH = imgWidth * 0.6;
    const sideH = (mainH - GRID_GAP) / 2;
    const remaining = images.length - 3;

    return (
      <View style={{ width: imgWidth, height: mainH, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: mainW, height: mainH }}>
          <Image source={{ uri: images[0] }} style={{ width: mainW, height: mainH }} resizeMode="cover" />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: 0, width: sideW, height: sideH }}>
          <Image source={{ uri: images[1] }} style={{ width: sideW, height: sideH }} resizeMode="cover" />
        </View>
        <View style={{ position: 'absolute', left: mainW + GRID_GAP, top: sideH + GRID_GAP, width: sideW, height: sideH }}>
          <Image source={{ uri: images[2] }} style={{ width: sideW, height: sideH }} resizeMode="cover" />
          {remaining > 0 && (
            <View style={styles.moreOverlay}>
              <Text style={styles.moreText}>+{remaining}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moments</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
          {STORIES.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyItem}>
              {story.isAdd ? (
                <View style={styles.storyAddContainer}>
                  <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  <View style={styles.storyAddBadge}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
              ) : (
                <LinearGradient
                  colors={story.isLive ? ['#FF0000', '#FF4444'] : story.hasNew ? ['#FF6B00', '#FF006E'] : ['#444', '#333']}
                  style={styles.storyRing}
                >
                  <View style={styles.storyRingInner}>
                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  </View>
                  {story.isLive && (
                    <View style={styles.storyLiveBadge}><Text style={styles.storyLiveText}>LIVE</Text></View>
                  )}
                </LinearGradient>
              )}
              <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Post */}
        <View style={styles.createPost}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=10' }} style={styles.createAvatar} />
          <TouchableOpacity style={styles.createInput} onPress={() => Alert.alert('Info', 'Publication bientot disponible')}>
            <Text style={styles.createPlaceholder}>Quoi de neuf ?</Text>
          </TouchableOpacity>
          <View style={styles.createActions}>
            <TouchableOpacity style={styles.createActionBtn}>
              <Ionicons name="image" size={22} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createActionBtn}>
              <Ionicons name="videocam" size={22} color="#FF6B00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts */}
        {MOCK_POSTS.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <TouchableOpacity style={styles.postUserRow}>
                <Image source={{ uri: post.user.avatar }} style={styles.postAvatar} />
                <View>
                  <View style={styles.postNameRow}>
                    <Text style={styles.postName}>{post.user.name}</Text>
                    {post.user.verified && <Ionicons name="checkmark-circle" size={14} color="#3897F0" />}
                  </View>
                  <View style={styles.postMetaRow}>
                    <Text style={styles.postTime}>{post.timeAgo}</Text>
                    {post.location && (
                      <><Text style={styles.postTime}> · </Text>
                      <Ionicons name="location" size={12} color="#888" />
                      <Text style={styles.postLocation}>{post.location}</Text></>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postMenuBtn}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Post Images */}
            {renderImages(post.images, post.id)}

            {/* Reactions */}
            <ReactionsBar
              currentReaction={postReactions[post.id] || null}
              onReact={(reaction) => handleReaction(post.id, reaction)}
              counts={post.reactions}
              totalCount={post.totalReactions}
            />

            {/* Comments & Shares Count */}
            <View style={styles.engagementRow}>
              <Text style={styles.engagementText}>{post.comments} commentaires</Text>
              <Text style={styles.engagementText}>{post.shares} partages</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerRight: { flexDirection: 'row', gap: 4 },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D00', borderWidth: 1.5, borderColor: '#000' },

  // Stories
  storiesContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 12 },
  storyItem: { alignItems: 'center', width: 68 },
  storyAddContainer: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyAddBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  storyRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  storyRingInner: { width: 63, height: 63, borderRadius: 31.5, borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  storyLiveBadge: { position: 'absolute', bottom: -2, alignSelf: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1.5, borderColor: '#000' },
  storyLiveText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  storyName: { color: '#CCC', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Create Post
  createPost: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#222', gap: 10 },
  createAvatar: { width: 40, height: 40, borderRadius: 20 },
  createInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  createPlaceholder: { color: '#666', fontSize: 14 },
  createActions: { flexDirection: 'row', gap: 4 },
  createActionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Post Card
  postCard: { borderBottomWidth: 6, borderBottomColor: '#111', marginBottom: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  postUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postAvatar: { width: 44, height: 44, borderRadius: 22 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  postTime: { color: '#888', fontSize: 12 },
  postLocation: { color: '#888', fontSize: 12, marginLeft: 2 },
  postMenuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  postContent: { color: '#EEE', fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 10 },

  // Multi-image
  moreOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFF', fontSize: 24, fontWeight: '800' },

  // Engagement
  engagementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  engagementText: { color: '#888', fontSize: 12 },
});
