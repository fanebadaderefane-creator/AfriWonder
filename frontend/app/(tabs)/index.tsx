import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Types
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
}

interface Comment {
  id: string;
  text: string;
  likes: number;
  isLiked: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  createdAt: string;
}

// Mock video data (fallback)
const MOCK_VIDEOS: Video[] = [
  {
    id: '1',
    title: 'Danse traditionnelle malienne',
    description: 'Magnifique danse au coucher du soleil #Mali #Culture #Danse',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=1',
    duration: 45,
    views: 125000,
    likes: 8500,
    comments: 342,
    shares: 89,
    isLiked: false,
    isSaved: false,
    hashtags: ['Mali', 'Culture', 'Danse'],
    user: {
      id: 'u1',
      firstName: 'Aminata',
      lastName: 'Diallo',
      avatar: 'https://i.pravatar.cc/150?img=1',
      isFollowing: false,
    },
  },
  {
    id: '2',
    title: 'Street food Dakar',
    description: 'Les meilleurs thieboudienne de Dakar! #Senegal #Food #Dakar',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=2',
    duration: 60,
    views: 89000,
    likes: 6200,
    comments: 178,
    shares: 45,
    isLiked: true,
    isSaved: false,
    hashtags: ['Senegal', 'Food', 'Dakar'],
    user: {
      id: 'u2',
      firstName: 'Moussa',
      lastName: 'Ndiaye',
      avatar: 'https://i.pravatar.cc/150?img=2',
      isFollowing: true,
    },
  },
  {
    id: '3',
    title: 'Mode africaine',
    description: 'Nouvelle collection Bogolan #CoteDIvoire #Fashion #Bogolan',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=3',
    duration: 30,
    views: 234000,
    likes: 18900,
    comments: 892,
    shares: 234,
    isLiked: false,
    isSaved: true,
    hashtags: ['CoteDIvoire', 'Fashion', 'Bogolan'],
    user: {
      id: 'u3',
      firstName: 'Awa',
      lastName: 'Kone',
      avatar: 'https://i.pravatar.cc/150?img=3',
      isFollowing: false,
    },
  },
];

interface VideoItemProps {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onFollow: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ 
  video, 
  isActive, 
  onLike, 
  onComment, 
  onShare, 
  onSave, 
  onFollow 
}) => {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const player = useVideoPlayer(video.videoUrl, player => {
    player.loop = true;
    player.muted = isMuted;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  });

  useEffect(() => {
    if (player) {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, player]);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const togglePlay = () => {
    if (player) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <View style={[styles.videoContainer, { height: height - 60 - insets.bottom }]}>
      <TouchableOpacity activeOpacity={1} onPress={togglePlay} style={styles.videoWrapper}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
        
        {!isPlaying && (
          <View style={styles.pauseOverlay}>
            <Ionicons name="play" size={80} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </TouchableOpacity>

      {/* Right side actions */}
      <View style={[styles.actions, { bottom: 120 }]}>
        {/* User avatar */}
        <TouchableOpacity style={styles.avatarContainer}>
          <Image source={{ uri: video.user.avatar }} style={styles.avatar} />
          {!video.user.isFollowing && (
            <TouchableOpacity style={styles.followBadge} onPress={onFollow}>
              <Ionicons name="add" size={14} color={Colors.text} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons 
            name={video.isLiked ? "heart" : "heart-outline"} 
            size={32} 
            color={video.isLiked ? Colors.like : Colors.text} 
          />
          <Text style={styles.actionText}>{formatNumber(video.likes)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-ellipses" size={30} color={Colors.text} />
          <Text style={styles.actionText}>{formatNumber(video.comments)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="arrow-redo" size={30} color={Colors.text} />
          <Text style={styles.actionText}>{formatNumber(video.shares)}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionButton} onPress={onSave}>
          <Ionicons 
            name={video.isSaved ? "bookmark" : "bookmark-outline"} 
            size={28} 
            color={video.isSaved ? Colors.accent : Colors.text} 
          />
        </TouchableOpacity>

        {/* Mute toggle */}
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsMuted(!isMuted)}>
          <Ionicons 
            name={isMuted ? "volume-mute" : "volume-high"} 
            size={26} 
            color={Colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={[styles.bottomInfo, { bottom: 20 }]}>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{video.user.firstName.toLowerCase()}{video.user.lastName.toLowerCase()}</Text>
          {video.user.isFollowing && (
            <View style={styles.followingBadge}>
              <Text style={styles.followingText}>Abonne</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
        <View style={styles.hashtags}>
          {video.hashtags.map((tag, index) => (
            <TouchableOpacity key={index}>
              <Text style={styles.hashtag}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// Comments Modal Component
interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentsCount: number;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ visible, onClose, videoId, commentsCount }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, videoId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/videos/${videoId}/comments`);
      setComments(response.data.comments || []);
    } catch (error) {
      // Use mock comments
      setComments([
        { id: '1', text: 'Super video! 🔥', likes: 24, isLiked: false, user: { id: 'u1', firstName: 'Aminata', lastName: 'D', avatar: 'https://i.pravatar.cc/150?img=1' }, createdAt: new Date().toISOString() },
        { id: '2', text: 'Jadore la danse!', likes: 12, isLiked: true, user: { id: 'u2', firstName: 'Moussa', lastName: 'N', avatar: 'https://i.pravatar.cc/150?img=2' }, createdAt: new Date().toISOString() },
        { id: '3', text: 'Magnifique 👏', likes: 8, isLiked: false, user: { id: 'u3', firstName: 'Awa', lastName: 'K', avatar: 'https://i.pravatar.cc/150?img=3' }, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    if (!isAuthenticated) {
      onClose();
      router.push('/(auth)/login');
      return;
    }

    setSending(true);
    try {
      const response = await apiClient.post(`/videos/${videoId}/comment`, { text: newComment });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      // Add mock comment
      const mockComment: Comment = {
        id: Date.now().toString(),
        text: newComment,
        likes: 0,
        isLiked: false,
        user: { id: 'me', firstName: 'Moi', lastName: '', avatar: 'https://i.pravatar.cc/150?img=10' },
        createdAt: new Date().toISOString(),
      };
      setComments([mockComment, ...comments]);
      setNewComment('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.commentsContainer, { paddingBottom: insets.bottom }]}
        >
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>{commentsCount} commentaires</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Image source={{ uri: comment.user.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUser}>{comment.user.firstName} {comment.user.lastName}</Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <View style={styles.commentActions}>
                      <TouchableOpacity style={styles.commentLike}>
                        <Ionicons 
                          name={comment.isLiked ? "heart" : "heart-outline"} 
                          size={16} 
                          color={comment.isLiked ? Colors.like : Colors.textSecondary} 
                        />
                        <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentTime}>2h</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentTextInput}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor={Colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Ionicons name="send" size={20} color={Colors.text} />
              )}
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
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedVideoComments, setSelectedVideoComments] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/videos/feed?page=1&limit=10');
      if (response.data.videos && response.data.videos.length > 0) {
        setVideos(response.data.videos);
      }
    } catch (error) {
      console.log('Using mock videos');
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
  };

  const handleLike = (videoId: string) => {
    setVideos(prev => prev.map(v => 
      v.id === videoId 
        ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 }
        : v
    ));
    apiClient.post(`/videos/${videoId}/like`).catch(() => {});
  };

  const handleSave = (videoId: string) => {
    setVideos(prev => prev.map(v => 
      v.id === videoId 
        ? { ...v, isSaved: !v.isSaved }
        : v
    ));
    apiClient.post(`/videos/${videoId}/save`).catch(() => {});
  };

  const handleFollow = (userId: string) => {
    setVideos(prev => prev.map(v => 
      v.user.id === userId 
        ? { ...v, user: { ...v.user, isFollowing: !v.user.isFollowing } }
        : v
    ));
  };

  const handleOpenComments = (videoId: string, commentsCount: number) => {
    setSelectedVideoId(videoId);
    setSelectedVideoComments(commentsCount);
    setCommentsVisible(true);
  };

  const renderVideo = ({ item, index }: { item: Video; index: number }) => (
    <VideoItem
      video={item}
      isActive={index === currentIndex}
      onLike={() => handleLike(item.id)}
      onComment={() => handleOpenComments(item.id, item.comments)}
      onShare={() => console.log('Share', item.id)}
      onSave={() => handleSave(item.id)}
      onFollow={() => handleFollow(item.user.id)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity 
          style={[styles.headerTab, activeTab === 'following' && styles.headerTabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.headerTabText, activeTab === 'following' && styles.headerTabTextActive]}>Abonnes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerTab, activeTab === 'foryou' && styles.headerTabActive]}
          onPress={() => setActiveTab('foryou')}
        >
          <Text style={[styles.headerTabText, activeTab === 'foryou' && styles.headerTabTextActive]}>Pour toi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.liveButton} onPress={() => router.push('/live')}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - 60 - insets.bottom}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        videoId={selectedVideoId}
        commentsCount={selectedVideoComments}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    zIndex: 100,
  },
  headerTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.text,
  },
  headerTabText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  headerTabTextActive: {
    color: Colors.text,
  },
  liveButton: {
    position: 'absolute',
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginRight: Spacing.xs,
  },
  liveText: {
    color: Colors.live,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  videoContainer: {
    width,
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actions: {
    position: 'absolute',
    right: Spacing.md,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.text,
  },
  followBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    left: Spacing.md,
    right: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  username: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  followingBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  followingText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  description: {
    color: Colors.text,
    fontSize: FontSizes.md,
    marginBottom: Spacing.sm,
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  hashtag: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Comments Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: height * 0.7,
    minHeight: height * 0.5,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  loader: {
    padding: Spacing.xxl,
  },
  commentsList: {
    flex: 1,
    padding: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  commentTime: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
