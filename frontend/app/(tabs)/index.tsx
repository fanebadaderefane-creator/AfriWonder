import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Mock video data (simulating AfriWonder API)
const MOCK_VIDEOS = [
  {
    id: '1',
    title: 'Danse traditionnelle malienne',
    description: 'Magnifique danse au coucher du soleil #Mali #Culture #Danse',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=1',
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
    description: 'Les meilleurs thieboudienne de Dakar! \ud83c\udf5a #Senegal #Food #Dakar',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=2',
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
    description: 'Nouvelle collection Bogolan \ud83c\udf1f #CoteDIvoire #Fashion #Bogolan',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/400/800?random=3',
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
      lastName: 'Kon\u00e9',
      avatar: 'https://i.pravatar.cc/150?img=3',
      isFollowing: false,
    },
  },
];

interface VideoItemProps {
  video: typeof MOCK_VIDEOS[0];
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

  React.useEffect(() => {
    if (player) {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, player]);

  React.useEffect(() => {
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
              <Text style={styles.followingText}>Abonn\u00e9</Text>
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

export default function FeedScreen() {
  const [videos, setVideos] = useState(MOCK_VIDEOS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

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
  };

  const handleSave = (videoId: string) => {
    setVideos(prev => prev.map(v => 
      v.id === videoId 
        ? { ...v, isSaved: !v.isSaved }
        : v
    ));
  };

  const handleFollow = (userId: string) => {
    setVideos(prev => prev.map(v => 
      v.user.id === userId 
        ? { ...v, user: { ...v.user, isFollowing: !v.user.isFollowing } }
        : v
    ));
  };

  const renderVideo = ({ item, index }: { item: typeof MOCK_VIDEOS[0]; index: number }) => (
    <VideoItem
      video={item}
      isActive={index === currentIndex}
      onLike={() => handleLike(item.id)}
      onComment={() => console.log('Comment', item.id)}
      onShare={() => console.log('Share', item.id)}
      onSave={() => handleSave(item.id)}
      onFollow={() => handleFollow(item.user.id)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity style={styles.headerTab}>
          <Text style={styles.headerTabText}>Abonnés</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerTab, styles.headerTabActive]}>
          <Text style={[styles.headerTabText, styles.headerTabTextActive]}>Pour toi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.liveButton}>
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
});
