import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface VideoUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  isFollowing: boolean;
}

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  hashtags: string[];
  user: VideoUser;
  music: string;
}

interface Comment {
  id: string;
  text: string;
  likes: number;
  isLiked: boolean;
  user: { id: string; firstName: string; lastName: string; avatar: string };
  createdAt: string;
}

const MOCK_VIDEOS: Video[] = [
  {
    id: '1', title: 'Danse traditionnelle malienne',
    description: 'Magnifique danse au coucher du soleil sur le fleuve Niger',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=1',
    duration: 45, views: 125000, likes: 8500, comments: 342, shares: 89,
    isLiked: false, isSaved: false, hashtags: ['Mali', 'Culture', 'Danse'],
    user: { id: 'u1', firstName: 'Aminata', lastName: 'Diallo', avatar: 'https://i.pravatar.cc/150?img=1', isFollowing: false },
    music: 'Salif Keita - Africa',
  },
  {
    id: '2', title: 'Street food Dakar',
    description: 'Les meilleurs thieboudienne de Dakar! Venez gouter',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=2',
    duration: 60, views: 89000, likes: 6200, comments: 178, shares: 45,
    isLiked: true, isSaved: false, hashtags: ['Senegal', 'Food', 'Dakar'],
    user: { id: 'u2', firstName: 'Moussa', lastName: 'Ndiaye', avatar: 'https://i.pravatar.cc/150?img=2', isFollowing: true },
    music: 'Youssou N\'Dour - 7 Seconds',
  },
  {
    id: '3', title: 'Mode africaine',
    description: 'Nouvelle collection Bogolan 2025, faite main a Bamako',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=3',
    duration: 30, views: 234000, likes: 18900, comments: 892, shares: 234,
    isLiked: false, isSaved: true, hashtags: ['CoteDIvoire', 'Fashion', 'Bogolan'],
    user: { id: 'u3', firstName: 'Awa', lastName: 'Kone', avatar: 'https://i.pravatar.cc/150?img=3', isFollowing: false },
    music: 'Tiken Jah Fakoly - Africa',
  },
  {
    id: '4', title: 'Recette Mafe',
    description: 'Comment preparer le meilleur mafe malien etape par etape',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=4',
    duration: 90, views: 456000, likes: 32100, comments: 1200, shares: 567,
    isLiked: false, isSaved: false, hashtags: ['Cuisine', 'Mafe', 'Recette'],
    user: { id: 'u4', firstName: 'Fatoumata', lastName: 'Traore', avatar: 'https://i.pravatar.cc/150?img=9', isFollowing: false },
    music: 'Son original - Fatoumata',
  },
  {
    id: '5', title: 'Bamako Night Life',
    description: 'Les meilleurs spots nocturnes de Bamako, capitale du Mali',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=5',
    duration: 40, views: 67000, likes: 4500, comments: 230, shares: 78,
    isLiked: true, isSaved: false, hashtags: ['Bamako', 'NightLife', 'Vibes'],
    user: { id: 'u5', firstName: 'Ibrahim', lastName: 'Sangare', avatar: 'https://i.pravatar.cc/150?img=4', isFollowing: true },
    music: 'Sidiki Diabate - Fais moi confiance',
  },
  {
    id: '6', title: 'Artisanat malien',
    description: 'L\'art du tissage bogolan, un savoir-faire ancestral malien',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=6',
    duration: 55, views: 178000, likes: 12800, comments: 456, shares: 189,
    isLiked: false, isSaved: false, hashtags: ['Artisanat', 'Bogolan', 'Culture'],
    user: { id: 'u6', firstName: 'Mariam', lastName: 'Coulibaly', avatar: 'https://i.pravatar.cc/150?img=5', isFollowing: false },
    music: 'Amadou & Mariam - Sabali',
  },
  {
    id: '7', title: 'Football au Mali',
    description: 'Les Aigles du Mali, match epique au stade du 26 Mars',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=7',
    duration: 35, views: 320000, likes: 25600, comments: 2100, shares: 890,
    isLiked: false, isSaved: false, hashtags: ['Football', 'Mali', 'Aigles'],
    user: { id: 'u7', firstName: 'Boubacar', lastName: 'Keita', avatar: 'https://i.pravatar.cc/150?img=7', isFollowing: true },
    music: 'Commentaire sportif - RFM',
  },
  {
    id: '8', title: 'Teinture Bazin',
    description: 'Le processus magique de teinture du Bazin riche malien',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=8',
    duration: 70, views: 95000, likes: 7800, comments: 345, shares: 123,
    isLiked: false, isSaved: false, hashtags: ['Bazin', 'Teinture', 'Mode'],
    user: { id: 'u8', firstName: 'Kadiatou', lastName: 'Diarra', avatar: 'https://i.pravatar.cc/150?img=6', isFollowing: false },
    music: 'Oumou Sangare - Moussolou',
  },
];

interface VideoItemProps {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onDoubleTapLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onFollow: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({
  video, isActive, onLike, onDoubleTapLike, onComment, onShare, onSave, onFollow,
}) => {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const discAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  const player = useVideoPlayer(video.videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    if (isActive) p.play(); else p.pause();
  });

  useEffect(() => {
    if (player) { isActive ? player.play() : player.pause(); }
  }, [isActive, player]);

  useEffect(() => { if (player) player.muted = isMuted; }, [isMuted, player]);

  // Rotating disc animation
  useEffect(() => {
    if (isActive) {
      const rotate = Animated.loop(
        Animated.timing(discAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
      );
      rotate.start();
      return () => rotate.stop();
    }
  }, [isActive]);

  const discRotation = discAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - like animation
      onDoubleTapLike();
      setShowHeart(true);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
        Animated.timing(heartAnim, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
      ]).start(() => setShowHeart(false));
    } else {
      // Single tap - toggle play
      if (player) {
        if (isPlaying) player.pause(); else player.play();
        setIsPlaying(!isPlaying);
      }
    }
    lastTap.current = now;
  };

  const itemHeight = height - 60 - insets.bottom;

  return (
    <View style={[styles.videoContainer, { height: itemHeight }]}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoWrapper}>
          <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />

          {/* Pause icon */}
          {!isPlaying && (
            <View style={styles.pauseOverlay}>
              <View style={styles.pauseCircle}>
                <Ionicons name="play" size={40} color="#FFF" />
              </View>
            </View>
          )}

          {/* Double-tap heart animation */}
          {showHeart && (
            <Animated.View style={[styles.heartAnimation, {
              transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.3] }) }],
              opacity: heartAnim,
            }]}>
              <Ionicons name="heart" size={100} color={Colors.like} />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Gradient overlays */}
      <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

      {/* Right side actions */}
      <View style={[styles.actions, { bottom: 100 }]}>
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer}>
          <Image source={{ uri: video.user.avatar }} style={styles.avatar} />
          {!video.user.isFollowing && (
            <TouchableOpacity style={styles.followBadge} onPress={onFollow}>
              <Ionicons name="add" size={12} color="#FFF" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons name={video.isLiked ? 'heart' : 'heart-outline'} size={32} color={video.isLiked ? Colors.like : '#FFF'} />
          <Text style={styles.actionText}>{formatNumber(video.likes)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.comments)}</Text>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Ionicons name={video.isSaved ? 'bookmark' : 'bookmark-outline'} size={28} color={video.isSaved ? Colors.accent : '#FFF'} />
          <Text style={styles.actionText}>{video.isSaved ? 'Sauve' : 'Sauver'}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="arrow-redo" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.shares)}</Text>
        </TouchableOpacity>

        {/* Rotating disc */}
        <Animated.View style={[styles.musicDisc, { transform: [{ rotate: discRotation }] }]}>
          <Image source={{ uri: video.user.avatar }} style={styles.musicDiscImage} />
        </Animated.View>
      </View>

      {/* Bottom info */}
      <View style={[styles.bottomInfo, { bottom: 16 }]}>
        <View style={styles.userRow}>
          <Text style={styles.username}>@{video.user.firstName.toLowerCase()}{video.user.lastName.toLowerCase()}</Text>
          {video.user.isFollowing ? (
            <View style={styles.followingTag}><Text style={styles.followingTagText}>Abonne</Text></View>
          ) : (
            <TouchableOpacity style={styles.followBtn} onPress={onFollow}>
              <Text style={styles.followBtnText}>Suivre</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
        <View style={styles.hashtagsRow}>
          {video.hashtags.map((tag, i) => (
            <TouchableOpacity key={i}><Text style={styles.hashtag}>#{tag} </Text></TouchableOpacity>
          ))}
        </View>
        {/* Music ticker */}
        <View style={styles.musicRow}>
          <Ionicons name="musical-notes" size={14} color="#FFF" />
          <Text style={styles.musicText} numberOfLines={1}>{video.music}</Text>
        </View>
      </View>
    </View>
  );
};

// Share Modal
const ShareModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const options = [
    { icon: 'paper-plane', label: 'Message', color: Colors.primary },
    { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
    { icon: 'logo-facebook', label: 'Facebook', color: '#1877F2' },
    { icon: 'logo-instagram', label: 'Instagram', color: '#E4405F' },
    { icon: 'copy', label: 'Copier lien', color: Colors.textSecondary },
    { icon: 'download', label: 'Telecharger', color: Colors.info },
    { icon: 'flag', label: 'Signaler', color: Colors.error },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.shareContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.shareHandle} />
          <Text style={styles.shareTitle}>Partager</Text>
          <View style={styles.shareGrid}>
            {options.map((opt, i) => (
              <TouchableOpacity key={i} style={styles.shareOption}>
                <View style={[styles.shareIcon, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon as any} size={24} color="#FFF" />
                </View>
                <Text style={styles.shareLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Comments Modal
const CommentsModal: React.FC<{ visible: boolean; onClose: () => void; videoId: string; commentsCount: number }> = ({ visible, onClose, videoId, commentsCount }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadComments();
  }, [visible, videoId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/videos/${videoId}/comments`);
      setComments(response.data.comments || []);
    } catch {
      setComments([
        { id: '1', text: 'Super video! C\'est magnifique', likes: 24, isLiked: false, user: { id: 'u1', firstName: 'Aminata', lastName: 'D', avatar: 'https://i.pravatar.cc/150?img=1' }, createdAt: '2h' },
        { id: '2', text: 'J\'adore la musique!', likes: 12, isLiked: true, user: { id: 'u2', firstName: 'Moussa', lastName: 'N', avatar: 'https://i.pravatar.cc/150?img=2' }, createdAt: '3h' },
        { id: '3', text: 'Magnifique, le Mali est beau', likes: 45, isLiked: false, user: { id: 'u3', firstName: 'Awa', lastName: 'K', avatar: 'https://i.pravatar.cc/150?img=3' }, createdAt: '5h' },
        { id: '4', text: 'Comment faire pareil? Tutoriel svp!', likes: 8, isLiked: false, user: { id: 'u4', firstName: 'Ibrahim', lastName: 'T', avatar: 'https://i.pravatar.cc/150?img=4' }, createdAt: '1j' },
        { id: '5', text: 'Partage en Cote d\'Ivoire aussi', likes: 5, isLiked: false, user: { id: 'u5', firstName: 'Fanta', lastName: 'C', avatar: 'https://i.pravatar.cc/150?img=5' }, createdAt: '1j' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSend = () => {
    if (!newComment.trim()) return;
    const mock: Comment = { id: Date.now().toString(), text: newComment, likes: 0, isLiked: false, user: { id: 'me', firstName: 'Moi', lastName: '', avatar: 'https://i.pravatar.cc/150?img=10' }, createdAt: 'A l\'instant' };
    setComments([mock, ...comments]);
    setNewComment('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.commentsContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.commentsHeader}>
            <View style={styles.shareHandle} />
            <Text style={styles.commentsTitle}>{commentsCount} commentaires</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ padding: 40 }} /> : (
            <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
              {comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: c.user.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUser}>{c.user.firstName} {c.user.lastName}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentTime}>{c.createdAt}</Text>
                      <TouchableOpacity style={styles.commentReply}><Text style={styles.commentReplyText}>Repondre</Text></TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.commentLikeBtn}>
                    <Ionicons name={c.isLiked ? 'heart' : 'heart-outline'} size={14} color={c.isLiked ? Colors.like : Colors.textSecondary} />
                    <Text style={styles.commentLikeCount}>{c.likes}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.commentInput}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?img=10' }} style={styles.commentInputAvatar} />
            <TextInput style={styles.commentTextInput} placeholder="Ajouter un commentaire..." placeholderTextColor={Colors.textMuted} value={newComment} onChangeText={setNewComment} multiline />
            <TouchableOpacity style={[styles.commentSendBtn, !newComment.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!newComment.trim()}>
              <Ionicons name="send" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default function FeedScreen() {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'following' | 'foryou'>('foryou');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedVideoComments, setSelectedVideoComments] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/videos?page=1&limit=10');
      const data = response.data?.data || response.data;
      const backendVideos = data?.videos || [];
      if (backendVideos.length > 0) {
        const transformed: Video[] = backendVideos.map((v: any) => {
          const nameParts = (v.creator_name || '').split(' ');
          return {
            id: v.id,
            title: v.title || '',
            description: v.description || '',
            videoUrl: v.video_url || '',
            thumbnailUrl: v.thumbnail_url || v.video_url || '',
            duration: v.duration || 0,
            views: v.views || 0,
            likes: v.likes || 0,
            comments: v.comments_count || 0,
            shares: v.shares || 0,
            isLiked: false,
            isSaved: false,
            hashtags: v.hashtags || [],
            user: {
              id: v.creator_id || '',
              firstName: nameParts[0] || 'Utilisateur',
              lastName: nameParts.slice(1).join(' ') || '',
              avatar: v.creator_avatar || 'https://i.pravatar.cc/150?img=1',
              isFollowing: false,
            },
            music: v.music_title || 'Son original',
          };
        });
        setVideos(transformed);
      }
    } catch (err) { console.log('Using mock videos', err); }
    finally { setLoading(false); }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }, []);

  const handleLike = (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 } : v));
  };

  const handleDoubleTapLike = (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId && !v.isLiked ? { ...v, isLiked: true, likes: v.likes + 1 } : v));
  };

  const handleSave = (videoId: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved: !v.isSaved } : v));
  };

  const handleFollow = (userId: string) => {
    setVideos(prev => prev.map(v => v.user.id === userId ? { ...v, user: { ...v.user, isFollowing: !v.user.isFollowing } } : v));
  };

  const openComments = (videoId: string, count: number) => {
    setSelectedVideoId(videoId);
    setSelectedVideoComments(count);
    setCommentsVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.push('/discover')} style={styles.headerSearchBtn}>
          <Ionicons name="search" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTabs}>
          <TouchableOpacity style={[styles.headerTab, activeTab === 'following' && styles.headerTabActive]} onPress={() => setActiveTab('following')}>
            <Text style={[styles.headerTabText, activeTab === 'following' && styles.headerTabTextActive]}>Abonnes</Text>
          </TouchableOpacity>
          <View style={styles.headerDivider} />
          <TouchableOpacity style={[styles.headerTab, activeTab === 'foryou' && styles.headerTabActive]} onPress={() => setActiveTab('foryou')}>
            <Text style={[styles.headerTabText, activeTab === 'foryou' && styles.headerTabTextActive]}>Pour toi</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.headerLiveBtn} onPress={() => router.push('/live')}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        renderItem={({ item, index }) => (
          <VideoItem
            video={item}
            isActive={index === currentIndex}
            onLike={() => handleLike(item.id)}
            onDoubleTapLike={() => handleDoubleTapLike(item.id)}
            onComment={() => openComments(item.id, item.comments)}
            onShare={() => setShareVisible(true)}
            onSave={() => handleSave(item.id)}
            onFollow={() => handleFollow(item.user.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - 60 - insets.bottom}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={Colors.primary} /></View>}

      <CommentsModal visible={commentsVisible} onClose={() => setCommentsVisible(false)} videoId={selectedVideoId} commentsCount={selectedVideoComments} />
      <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, zIndex: 100 },
  headerSearchBtn: { position: 'absolute', left: Spacing.lg, top: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTabs: { flexDirection: 'row', alignItems: 'center' },
  headerDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: Spacing.sm },
  headerTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTabActive: { },
  headerTabText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.lg, fontWeight: '600' },
  headerTabTextActive: { color: '#FFF', fontWeight: 'bold' },
  headerLiveBtn: { position: 'absolute', right: Spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.25)', paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.pill },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live || '#FF0000', marginRight: 4 },
  liveText: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: 'bold' },
  videoContainer: { width, position: 'relative', backgroundColor: '#000' },
  videoWrapper: { flex: 1 },
  video: { width: '100%', height: '100%' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  heartAnimation: { position: 'absolute', alignSelf: 'center', top: '35%' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 },
  actions: { position: 'absolute', right: 10, alignItems: 'center', gap: 16 },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFF' },
  followBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000' },
  actionButton: { alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 2, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  musicDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 6, borderColor: '#333', marginTop: 8 },
  musicDiscImage: { width: '100%', height: '100%', borderRadius: 14 },
  bottomInfo: { position: 'absolute', left: Spacing.lg, right: 70 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  username: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  followBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },
  followBtnText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  followingTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  followingTagText: { color: '#FFF', fontSize: FontSizes.xs },
  description: { color: '#FFF', fontSize: FontSizes.md, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  hashtag: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { color: '#FFF', fontSize: FontSizes.sm, flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  shareContainer: { backgroundColor: Colors.surface || '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: Spacing.md },
  shareHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  shareTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.lg },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, justifyContent: 'flex-start' },
  shareOption: { alignItems: 'center', width: (width - Spacing.xl * 2) / 4, marginBottom: Spacing.lg },
  shareIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  shareLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  commentsContainer: { backgroundColor: Colors.surface || '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.7, minHeight: height * 0.5 },
  commentsHeader: { alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  commentsTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600', marginTop: Spacing.sm },
  commentsList: { flex: 1, paddingHorizontal: Spacing.lg },
  commentItem: { flexDirection: 'row', paddingVertical: Spacing.md, gap: Spacing.md },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentContent: { flex: 1 },
  commentUser: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: 2 },
  commentText: { color: Colors.text, fontSize: FontSizes.md, marginBottom: 4 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  commentTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  commentReply: {},
  commentReplyText: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: '600' },
  commentLikeBtn: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  commentLikeCount: { color: Colors.textSecondary, fontSize: 10 },
  commentInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  commentInputAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentTextInput: { flex: 1, backgroundColor: Colors.card || Colors.background, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, color: Colors.text, fontSize: FontSizes.md, maxHeight: 80 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
