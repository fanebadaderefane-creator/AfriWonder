import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated, AppState, Alert, Pressable, type NativeSyntheticEvent, type NativeScrollEvent, type LayoutChangeEvent } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ShareSheet from '../../src/components/ShareSheet';
import ReportModal from '../../src/components/ReportModal';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

/** Base hauteur tab bar, alignée sur `app/(tabs)/_layout.tsx` (`height: 65 + insets.bottom`). */
const TAB_BAR_LAYOUT_HEIGHT = 65;

interface VideoUser {
  id: string;
  firstName: string;
  lastName: string;
  /** URL absolue ou vide → initiales affichées */
  avatar: string;
  username?: string;
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
  isSponsored?: boolean;
}

interface Comment {
  id: string;
  text: string;
  likes: number;
  isLiked: boolean;
  user: { id: string; firstName: string; lastName: string; avatar: string };
  createdAt: string;
  /** URL du vocal (API `audio_url`) */
  audioUrl?: string | null;
}

async function appendCommentVoiceToFormData(formData: FormData, uri: string) {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const mime = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/webm';
    formData.append('file', new File([blob], 'voice.webm', { type: mime }));
    return;
  }
  formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
}

// Fallback vide - les videos sont chargees depuis l'API
const FALLBACK_VIDEOS: Video[] = [];

interface VideoItemProps {
  video: Video;
  isActive: boolean;
  /** Hauteur d’une page du feed (doit matcher snapToInterval / getItemLayout). */
  slideHeight?: number;
  onLike: () => void;
  onDoubleTapLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onFollow: () => void;
  onReport: () => void;
  onOpenProfile: () => void;
  onOpenSound: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({
  video, isActive, slideHeight, onLike, onDoubleTapLike, onComment, onShare, onSave, onFollow, onReport, onOpenProfile, onOpenSound,
}) => {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const discAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isActiveRef = useRef(isActive);
  const wasActiveRef = useRef(isActive);

  // Keep ref in sync
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const player = useVideoPlayer(video.videoUrl, (p) => {
    p.loop = true;
    p.muted = !isActiveRef.current;
    if (isActiveRef.current) {
      p.play();
    }
  });

  // Nouvelle slide active : reprendre la lecture auto (comportement type TikTok)
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setIsPaused(false);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  // Pause + sourdine immédiates hors carte active (évite audio « fantôme » sur web / expo-video)
  useLayoutEffect(() => {
    if (!player || isActive) return;
    try {
      player.pause();
      player.muted = true;
    } catch {}
  }, [isActive, player]);

  // Lecture / pause + mute utilisateur sur la carte active
  useEffect(() => {
    if (!player || !isActive) return;
    try {
      player.muted = isMuted;
      if (!isPaused) {
        void Promise.resolve().then(() => {
          try {
            player.play();
          } catch (e) {
            console.log('Player play error:', e);
          }
        });
      } else {
        player.pause();
      }
    } catch (e) {
      console.log('Player play/pause error:', e);
    }
  }, [isActive, isPaused, isMuted, player]);

  // CRITICAL: Cleanup on unmount — pause video to stop background audio
  useEffect(() => {
    return () => {
      try { player?.pause(); } catch {}
    };
  }, [player]);

  // Rotating disc animation
  useEffect(() => {
    if (isActive && !isPaused) {
      const rotate = Animated.loop(
        Animated.timing(discAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      discAnim.setValue(0);
    }
  }, [isActive, isPaused]);

  const discRotation = discAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const creatorHandle = (() => {
    const u = (video.user.username || '').trim().replace(/^@+/, '');
    if (u) return `@${u}`;
    const slug = `${(video.user.firstName || '').trim()}${(video.user.lastName || '').trim()}`.replace(/\s+/g, '').slice(0, 14).toLowerCase();
    return slug ? `@${slug}` : '@créateur';
  })();

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
      // Single tap - toggle pause (only for active video)
      if (isActive) {
        setIsPaused(prev => !prev);
      }
    }
    lastTap.current = now;
  };

  const itemHeight = slideHeight ?? Math.max(200, height - TAB_BAR_LAYOUT_HEIGHT - insets.bottom);

  return (
    <View style={[styles.videoContainer, { height: itemHeight }]}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoWrapper}>
          <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />

          {/* Pause icon */}
          {isPaused && isActive && (
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
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

      {/* Sponsored badge */}
      {video.isSponsored && (
        <View style={styles.sponsoredBadge}>
          <Ionicons name="megaphone" size={12} color="#FFF" />
          <Text style={styles.sponsoredText}>Sponsorise</Text>
        </View>
      )}

      {/* Right side actions */}
      <View style={[styles.actions, { bottom: 100 }]} pointerEvents="box-none">
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <CreatorAvatar
            uri={video.user.avatar}
            username={video.user.username}
            firstName={video.user.firstName}
            lastName={video.user.lastName}
            size={48}
            onPress={video.user.id ? onOpenProfile : undefined}
          />
          {!video.user.isFollowing && (
            <TouchableOpacity style={styles.followBadge} onPress={onFollow}>
              <Ionicons name="add" size={12} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

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

        {/* Tip / Soutenir */}
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          router.push({ pathname: '/tip', params: { creatorId: video.user.id, creatorName: video.user.firstName, videoId: video.id } } as any);
        }}>
          <Ionicons name="gift" size={28} color="#FF6B00" />
          <Text style={styles.actionText}>Soutenir</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="arrow-redo" size={28} color="#FFF" />
          <Text style={styles.actionText}>{formatNumber(video.shares)}</Text>
        </TouchableOpacity>

        {/* More / Report */}
        <TouchableOpacity style={styles.actionButton} onPress={onReport}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Disque son — même destination que la ligne « Son » sous la vidéo */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenSound}
          accessibilityRole="button"
          accessibilityLabel="Voir les vidéos avec ce son"
        >
          <Animated.View style={[styles.musicDisc, { transform: [{ rotate: discRotation }] }]}>
            <View style={styles.musicDiscImage}>
              <CreatorAvatar
                uri={video.user.avatar}
                username={video.user.username}
                firstName={video.user.firstName}
                lastName={video.user.lastName}
                size={28}
                bordered={false}
              />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={[styles.bottomInfo, { bottom: 16 }]}>
        <View style={styles.userRow}>
          <TouchableOpacity onPress={video.user.id ? onOpenProfile : undefined} activeOpacity={0.85} disabled={!video.user.id}>
            <Text style={styles.username}>{creatorHandle}</Text>
          </TouchableOpacity>
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
        <View style={styles.viewsRow} accessibilityLabel={`${formatNumber(video.views)} vues`}>
          <Ionicons name="eye-outline" size={15} color="rgba(255,255,255,0.92)" />
          <Text style={styles.viewsText}>
            {formatNumber(video.views)} vues
          </Text>
        </View>
        {/* Son — cliquable (liste des vidéos partageant ce titre audio) */}
        <TouchableOpacity
          style={styles.musicRow}
          onPress={onOpenSound}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 4, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Son : ${video.music}. Ouvrir les vidéos utilisant ce son`}
        >
          <Ionicons name="musical-notes" size={14} color="#FFF" />
          <Text style={styles.musicText} numberOfLines={1}>{video.music}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.55)" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Comments Modal
const CommentsModal: React.FC<{ visible: boolean; onClose: () => void; videoId: string; commentsCount: number }> = ({ visible, onClose, videoId, commentsCount }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalComments, setTotalComments] = useState(commentsCount);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const recordingRef = useRef<Awaited<ReturnType<typeof Audio.Recording.createAsync>>['recording'] | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

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
    return diffD < 30 ? `${diffD}j` : `${Math.floor(diffD / 30)} mois`;
  };

  useEffect(() => {
    if (visible) loadComments();
  }, [visible, videoId]);

  useEffect(() => {
    if (visible) return;
    (async () => {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch { /* ignore */ }
        recordingRef.current = null;
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      setRecordSeconds(0);
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch { /* ignore */ }
        soundRef.current = null;
      }
      setPlayingCommentId(null);
    })();
  }, [visible]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/videos/${videoId}/comments`);
      const data = response.data?.data || response.data;
      const backendComments = data?.comments || [];
      if (backendComments.length > 0) {
        const transformed: Comment[] = backendComments.map((c: any) => {
          const nameParts = (c.user_name || c.user?.full_name || '').split(' ');
          return {
            id: c.id,
            text: c.content || '',
            likes: c.likes_count || 0,
            isLiked: false,
            user: {
              id: c.user_id || c.user?.id || '',
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              avatar: c.user_avatar || c.user?.profile_image || 'https://i.pravatar.cc/150?img=50',
            },
            createdAt: formatTimeAgo(c.created_at),
            audioUrl: c.audio_url || null,
          };
        });
        setComments(transformed);
        setTotalComments(data?.pagination?.total || backendComments.length);
      } else {
        setComments([]);
        setTotalComments(0);
      }
    } catch {
      setComments([
        { id: '1', text: 'Super video!', likes: 24, isLiked: false, user: { id: 'u1', firstName: 'Aminata', lastName: 'D', avatar: 'https://i.pravatar.cc/150?img=1' }, createdAt: '2h' },
      ]);
    } finally { setLoading(false); }
  };

  const recordStartedAtRef = useRef(0);

  const toggleVoiceRecording = async () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour commenter.');
      return;
    }
    if (sendingVoice) return;

    if (isRecordingVoice) {
      const rec = recordingRef.current;
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      setRecordSeconds(0);
      if (!rec) return;
      try {
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        recordingRef.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const sec = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
        if (!uri || sec < 1) {
          Alert.alert('Trop court', 'Enregistrez au moins 1 seconde de vocal.');
          return;
        }
        setSendingVoice(true);
        const formData = new FormData();
        await appendCommentVoiceToFormData(formData, uri);
        const uploadRes = await apiClient.post('/upload/audio', formData, {
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        const ud = uploadRes.data?.data;
        const audioUrl = ud?.file_url || ud?.url;
        if (!audioUrl) throw new Error('URL audio manquante');
        const caption = newComment.trim();
        const optimistic: Comment = {
          id: `tmp-v-${Date.now()}`,
          text: caption || '🎤',
          likes: 0,
          isLiked: false,
          user: {
            id: user?.id || 'me',
            firstName: user?.firstName || user?.full_name?.split(' ')[0] || 'Moi',
            lastName: user?.lastName || '',
            avatar: user?.avatar || user?.profile_image || 'https://i.pravatar.cc/150?img=10',
          },
          createdAt: 'A l\'instant',
          audioUrl,
        };
        setComments((prev) => [optimistic, ...prev]);
        setTotalComments((prev) => prev + 1);
        const response = await apiClient.post(`/videos/${videoId}/comment`, {
          content: caption || '🎤',
          audio_url: audioUrl,
        });
        const data = response.data?.data || response.data;
        if (data?.id) {
          setComments((prev) => prev.map((c) => (c.id === optimistic.id ? { ...c, id: data.id, audioUrl: data.audio_url || audioUrl } : c)));
        }
        setNewComment('');
      } catch {
        Alert.alert('Erreur', 'Impossible d\'envoyer le commentaire vocal.');
        setComments((prev) => prev.filter((c) => !String(c.id).startsWith('tmp-v-')));
        setTotalComments((prev) => Math.max(0, prev - 1));
      } finally {
        setSendingVoice(false);
      }
      return;
    }

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone', 'Autorisez le micro pour enregistrer un commentaire vocal.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordStartedAtRef.current = Date.now();
      setRecordSeconds(0);
      setIsRecordingVoice(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.');
    }
  };

  const togglePlayCommentAudio = async (c: Comment) => {
    if (!c.audioUrl) return;
    try {
      if (playingCommentId === c.id) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlayingCommentId(null);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: c.audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingCommentId(null);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        }
      );
      soundRef.current = sound;
      setPlayingCommentId(c.id);
    } catch {
      Alert.alert('Lecture', 'Impossible de lire ce vocal.');
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    const commentText = newComment.trim();
    setNewComment('');

    // Optimistic add
    const optimistic: Comment = {
      id: Date.now().toString(),
      text: commentText,
      likes: 0,
      isLiked: false,
      user: {
        id: user?.id || 'me',
        firstName: user?.firstName || user?.full_name?.split(' ')[0] || 'Moi',
        lastName: user?.lastName || '',
        avatar: user?.avatar || user?.profile_image || 'https://i.pravatar.cc/150?img=10',
      },
      createdAt: 'A l\'instant',
    };
    setComments(prev => [optimistic, ...prev]);
    setTotalComments(prev => prev + 1);

    try {
      const response = await apiClient.post(`/videos/${videoId}/comment`, { content: commentText });
      const data = response.data?.data || response.data;
      if (data?.id) {
        // Replace optimistic with real
        setComments(prev => prev.map(c => c.id === optimistic.id ? { ...c, id: data.id } : c));
      }
    } catch {
      // Remove optimistic on failure
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      setTotalComments(prev => prev - 1);
    }
  };

  const userAvatar = user?.avatar || user?.profile_image || 'https://i.pravatar.cc/150?img=10';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.commentsContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.commentsHeader}>
            <View style={styles.shareHandle} />
            <Text style={styles.commentsTitle}>{totalComments} commentaires</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ padding: 40 }} /> : (
            <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
              {comments.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, marginTop: 8 }}>Soyez le premier a commenter</Text>
                </View>
              ) : comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: c.user.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUser}>{c.user.firstName} {c.user.lastName}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    {c.audioUrl ? (
                      <TouchableOpacity
                        style={styles.commentVoiceBtn}
                        onPress={() => void togglePlayCommentAudio(c)}
                        accessibilityRole="button"
                        accessibilityLabel={playingCommentId === c.id ? 'Pause vocal' : 'Lire le vocal'}
                      >
                        <Ionicons name={playingCommentId === c.id ? 'pause' : 'play'} size={16} color={Colors.primary} />
                        <Text style={styles.commentVoiceLabel}>Commentaire vocal</Text>
                      </TouchableOpacity>
                    ) : null}
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
            <Image source={{ uri: userAvatar }} style={styles.commentInputAvatar} />
            {isRecordingVoice ? (
              <View style={styles.commentRecordingBar}>
                <View style={styles.commentRecordingDot} />
                <Text style={styles.commentRecordingText}>
                  Enregistrement… {recordSeconds}s — touchez le micro pour envoyer
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.commentTextInput}
                placeholder="Ajouter un commentaire ou un vocal…"
                placeholderTextColor={Colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                editable={!sendingVoice}
              />
            )}
            <TouchableOpacity
              style={[styles.commentMicBtn, sendingVoice && { opacity: 0.5 }]}
              onPress={() => void toggleVoiceRecording()}
              disabled={sendingVoice}
              accessibilityLabel={isRecordingVoice ? 'Arrêter et envoyer le vocal' : 'Enregistrer un commentaire vocal'}
            >
              {sendingVoice ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name={isRecordingVoice ? 'stop-circle' : 'mic'} size={24} color={isRecordingVoice ? '#E53935' : Colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commentSendBtn, (!newComment.trim() || isRecordingVoice || sendingVoice) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!newComment.trim() || isRecordingVoice || sendingVoice}
            >
              <Ionicons name="send" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default function FeedScreen() {
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'foryou'>('foryou');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: 'video', id: '' });
  const [shareData, setShareData] = useState({ title: '', message: '', url: '' });
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedVideoComments, setSelectedVideoComments] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Message sous l’état vide : erreur réseau ou rappel fil découverte (vidéos courtes). */
  const [feedEmptyMessage, setFeedEmptyMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();

  const videosRef = useRef<Video[]>([]);
  useEffect(() => { videosRef.current = videos; }, [videos]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppState(next));
    return () => sub.remove();
  }, []);

  const playbackAllowed = isScreenFocused && appState === 'active';

  /** Hauteur réelle du viewport liste (sinon snap / offset ≠ hauteur des cellules → index bloqué sur 0). */
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const feedItemHeight = useMemo(() => {
    if (listViewportHeight > 0) return listViewportHeight;
    return Math.max(200, height - TAB_BAR_LAYOUT_HEIGHT - insets.bottom);
  }, [listViewportHeight, height, insets.bottom]);

  const feedItemHeightRef = useRef(feedItemHeight);
  useEffect(() => {
    feedItemHeightRef.current = feedItemHeight;
  }, [feedItemHeight]);

  const lastScrollOffsetYRef = useRef(0);
  const scrollSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current);
    };
  }, []);

  /** Index dérivé du scroll (une page = hauteur mesurée du FlatList). */
  const syncIndexFromScrollOffset = useCallback((offsetY: number) => {
    const h = feedItemHeightRef.current;
    const list = videosRef.current;
    if (list.length === 0 || h <= 0) return;
    const idx = Math.min(list.length - 1, Math.max(0, Math.round(offsetY / h)));
    setCurrentIndex(idx);
  }, []);

  const scheduleSyncFromScrollOffset = useCallback((y: number) => {
    lastScrollOffsetYRef.current = y;
    if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current);
    scrollSyncTimeoutRef.current = setTimeout(() => {
      scrollSyncTimeoutRef.current = null;
      syncIndexFromScrollOffset(lastScrollOffsetYRef.current);
    }, 72);
  }, [syncIndexFromScrollOffset]);

  const onFeedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      lastScrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
      scheduleSyncFromScrollOffset(e.nativeEvent.contentOffset.y);
    },
    [scheduleSyncFromScrollOffset]
  );

  const onFeedScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
        scrollSyncTimeoutRef.current = null;
      }
      syncIndexFromScrollOffset(e.nativeEvent.contentOffset.y);
    },
    [syncIndexFromScrollOffset]
  );

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0) setListViewportHeight((prev) => (prev === h ? prev : h));
  }, []);

  /** Feuille d’action (Modal) : fiable sur web — `Alert.alert` à plusieurs boutons est souvent inerte. */
  const [soundMenuVideo, setSoundMenuVideo] = useState<Video | null>(null);
  const closeSoundMenu = useCallback(() => setSoundMenuVideo(null), []);
  const openSoundMenu = useCallback((item: Video) => setSoundMenuVideo(item), []);

  const activeVideoId = videos[currentIndex]?.id ?? '';

  const getItemLayout = useCallback(
    (_data: ArrayLike<Video> | null | undefined, index: number) => ({
      length: feedItemHeight,
      offset: feedItemHeight * index,
      index,
    }),
    [feedItemHeight]
  );

  const lastViewedVideoIdRef = useRef<string | null>(null);
  useEffect(() => {
    lastViewedVideoIdRef.current = null;
  }, [activeTab]);

  useEffect(() => {
    const v = videos[currentIndex];
    if (!v) return;
    if (lastViewedVideoIdRef.current === v.id) return;
    lastViewedVideoIdRef.current = v.id;
    apiClient.post(`/videos/${v.id}/view`).catch(() => {});
  }, [currentIndex, videos]);

  /** Extrait les vidéos du feed combiné PWA (`/api/feed` → `items[].type === 'video'`). */
  const extractVideosFromFeedItems = (items: unknown[]): any[] => {
    if (!Array.isArray(items)) return [];
    const out: any[] = [];
    for (const it of items) {
      const row = it as { type?: string; video?: any };
      if (row?.type === 'video' && row.video && typeof row.video === 'object') {
        out.push(row.video);
      }
    }
    return out;
  };

  const transformVideo = (v: any): Video => {
    const nameParts = (v.creator_name || v.creator?.full_name || '').split(' ');
    const playUrl = v.video_url || v.hls_url || v.low_quality_playback_url || v.low_quality_url || '';
    return {
      id: v.id,
      title: v.title || '',
      description: v.description || '',
      videoUrl: playUrl,
      thumbnailUrl: v.thumbnail_url || v.video_url || playUrl || '',
      duration: v.duration || 0,
      views: Number(v.views ?? v.view_count ?? v.views_count) || 0,
      likes: v.likes || 0,
      comments: v.comments_count || 0,
      shares: v.shares || 0,
      isLiked: false,
      isSaved: false,
      hashtags: v.hashtags || [],
      user: {
        id: v.creator_id || v.creator?.id || '',
        firstName: nameParts[0] || 'Utilisateur',
        lastName: nameParts.slice(1).join(' ') || '',
        avatar: toAbsoluteMediaUrl((v.creator_avatar || v.creator?.profile_image || '').trim()).trim(),
        username: (v.creator?.username || v.creator_username || '').trim(),
        isFollowing: Boolean(v.creator?.is_following ?? v.is_following),
      },
      music: v.music_title || 'Son original',
      isSponsored: v.is_sponsored || v.isSponsored || false,
    };
  };

  const loadFeed = async (pageNum: number = 1, reset: boolean = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      setFeedEmptyMessage(null);
      let backendVideos: any[] = [];
      let pagination: { totalPages?: number } | undefined;

      if (activeTab === 'foryou') {
        const params: Record<string, string | number> = { page: pageNum, limit: 10 };
        if (reset && pageNum === 1) {
          params._ = Date.now();
        }
        const response = await apiClient.get('/feed', { params });
        const pkg = response.data?.data || response.data;
        const items = pkg?.items || [];
        backendVideos = extractVideosFromFeedItems(items);
        pagination = pkg?.pagination;
      } else {
        const response = await apiClient.get(`/videos?page=${pageNum}&limit=10`);
        const data = response.data?.data || response.data;
        backendVideos = data?.videos || [];
        pagination = data?.pagination;
      }

      if (backendVideos.length > 0) {
        const transformed = backendVideos.map(transformVideo);
        if (reset) {
          setVideos(transformed);
          setCurrentIndex(0);
        } else {
          setVideos(prev => [...prev, ...transformed]);
        }
        setPage(pageNum);
        setHasMore(pagination?.totalPages != null ? pageNum < (pagination.totalPages as number) : backendVideos.length >= 10);
      } else if (reset) {
        setVideos(FALLBACK_VIDEOS);
        setHasMore(false);
        setFeedEmptyMessage(
          activeTab === 'foryou'
            ? 'Aucune vidéo dans le fil « Pour toi ». Vérifiez le backend ou publiez du contenu.'
            : 'Aucune vidéo à afficher pour les abonnements (liste générique comme sur la PWA). Suivez des créateurs pour enrichir ce fil.'
        );
      }
    } catch (err) {
      console.log('Feed vidéo indisponible', err);
      if (reset) {
        setVideos(FALLBACK_VIDEOS);
        const msg = (err as any)?.response?.data?.error?.message || (err as any)?.message;
        setFeedEmptyMessage(
          msg
            ? `Impossible de charger les vidéos : ${String(msg).slice(0, 120)}`
            : 'Impossible de joindre l’API (vérifiez que le serveur tourne et l’URL dans la config Expo). Après une migration base, exécutez aussi prisma migrate deploy.'
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentIndex(0);
    void loadFeed(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger le fil au changement d’onglet (Pour toi / Abonnés)
  }, [activeTab]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadFeed(page + 1, false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(1, true).finally(() => setRefreshing(false));
  }, []);

  const handleLike = async (videoId: string) => {
    // Optimistic update
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 } : v));
    try {
      const response = await apiClient.post(`/videos/${videoId}/like`);
      const data = response.data?.data || response.data;
      // Sync with server state
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked: data.liked } : v));
    } catch { /* keep optimistic state */ }
  };

  const handleDoubleTapLike = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video && !video.isLiked) {
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked: true, likes: v.likes + 1 } : v));
      try { await apiClient.post(`/videos/${videoId}/like`); } catch {}
    }
  };

  const handleSave = (videoId: string) => {
    // Local only - no backend endpoint
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved: !v.isSaved } : v));
  };

  const handleFollow = async (userId: string) => {
    // Optimistic update
    setVideos(prev => prev.map(v => v.user.id === userId ? { ...v, user: { ...v.user, isFollowing: !v.user.isFollowing } } : v));
    try {
      const response = await apiClient.post(`/users/${userId}/follow`);
      const data = response.data?.data || response.data;
      setVideos(prev => prev.map(v => v.user.id === userId ? { ...v, user: { ...v.user, isFollowing: data.following } } : v));
    } catch { /* keep optimistic state */ }
  };

  const handleShare = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    setShareData({
      title: video?.title || 'Vidéo AfriWonder',
      message: video?.description || 'Regarde cette vidéo sur AfriWonder !',
      url: `https://afriwonder.onrender.com/video/${videoId}`,
    });
    setShareVisible(true);
    try { await apiClient.post(`/videos/${videoId}/share`); } catch {}
  };

  const handleReport = (videoId: string) => {
    setReportTarget({ type: 'video', id: videoId });
    setReportVisible(true);
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
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.headerSearchBtn}>
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
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            <View style={styles.headerNotifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/live')}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={videos}
        onLayout={onListLayout}
        renderItem={({ item }) => (
          <VideoItem
            video={item}
            slideHeight={feedItemHeight}
            isActive={playbackAllowed && item.id === activeVideoId}
            onLike={() => handleLike(item.id)}
            onDoubleTapLike={() => handleDoubleTapLike(item.id)}
            onComment={() => openComments(item.id, item.comments)}
            onShare={() => handleShare(item.id)}
            onSave={() => handleSave(item.id)}
            onFollow={() => handleFollow(item.user.id)}
            onReport={() => handleReport(item.id)}
            onOpenProfile={() => {
              if (!item.user.id) return;
              router.push({ pathname: '/user/[id]', params: { id: item.user.id } });
            }}
            onOpenSound={() => openSoundMenu(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={feedItemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onScroll={onFeedScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onFeedScrollEnd}
        onScrollEndDrag={onFeedScrollEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== 'web'}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={loading ? null : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: height - 100, paddingHorizontal: 28 }}>
            <Ionicons name="videocam-outline" size={60} color="rgba(255,255,255,0.3)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 16, textAlign: 'center' }}>Aucune vidéo disponible</Text>
            {feedEmptyMessage ? (
              <Text style={{ color: 'rgba(255,255,255,0.35)', marginTop: 12, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{feedEmptyMessage}</Text>
            ) : null}
            <TouchableOpacity style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 24 }} onPress={() => loadFeed(1, true)} activeOpacity={0.85}>
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={Colors.primary} /></View>}

      <CommentsModal visible={commentsVisible} onClose={() => setCommentsVisible(false)} videoId={selectedVideoId} commentsCount={selectedVideoComments} />
      <ShareSheet visible={shareVisible} onClose={() => setShareVisible(false)} title={shareData.title} message={shareData.message} url={shareData.url} />
      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} targetType={reportTarget.type} targetId={reportTarget.id} useModerationEndpoint />

      <Modal visible={soundMenuVideo != null} transparent animationType="fade" onRequestClose={closeSoundMenu}>
        <Pressable style={styles.soundModalBackdrop} onPress={closeSoundMenu}>
          <View style={[styles.soundModalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <Text style={styles.soundModalTitle}>Son</Text>
            <Text style={styles.soundModalSubtitle} numberOfLines={3}>
              {soundMenuVideo ? (soundMenuVideo.music || 'Son original').trim() : ''}
            </Text>
            <TouchableOpacity
              style={styles.soundModalBtnPrimary}
              activeOpacity={0.88}
              onPress={() => {
                const v = soundMenuVideo;
                if (!v) return;
                const music = (v.music || 'Son original').trim().slice(0, 200);
                closeSoundMenu();
                router.push({ pathname: '/sound-feed', params: { title: music } });
              }}
            >
              <Ionicons name="albums-outline" size={20} color="#FFF" />
              <Text style={styles.soundModalBtnPrimaryText}>Voir les vidéos avec ce son</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.soundModalBtnPrimary, { marginTop: 10, backgroundColor: isAuthenticated ? Colors.primary : 'rgba(255,255,255,0.2)' }]}
              activeOpacity={0.88}
              onPress={() => {
                const v = soundMenuVideo;
                if (!v) return;
                const music = (v.music || 'Son original').trim().slice(0, 200);
                closeSoundMenu();
                if (!isAuthenticated) {
                  router.push('/(auth)/login');
                  return;
                }
                router.push({
                  pathname: '/(tabs)/create',
                  params: { useSoundTitle: music, useSoundFromVideoId: v.id },
                } as any);
              }}
            >
              <Ionicons name="add-circle-outline" size={22} color="#FFF" />
              <Text style={styles.soundModalBtnPrimaryText}>{isAuthenticated ? 'Utiliser ce son' : 'Se connecter pour utiliser ce son'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.soundModalCancel} onPress={closeSoundMenu} accessibilityLabel="Fermer">
              <Text style={styles.soundModalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  headerRight: { position: 'absolute', right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 5 },
  headerNotifDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF3D00', borderWidth: 1, borderColor: '#000' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000', marginRight: 4 },
  liveText: { color: '#FF4444', fontSize: FontSizes.xs, fontWeight: 'bold' },
  videoContainer: { width, position: 'relative', backgroundColor: '#000' },
  videoWrapper: { flex: 1 },
  video: { width: '100%', height: '100%' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  heartAnimation: { position: 'absolute', alignSelf: 'center', top: '35%' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 },
  sponsoredBadge: { position: 'absolute', top: 70, left: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,107,0,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.pill },
  sponsoredText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  actions: { position: 'absolute', right: 10, alignItems: 'center', gap: 16, zIndex: 20, elevation: 20 },
  soundModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  soundModalSheet: {
    backgroundColor: '#1a1a24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  soundModalTitle: { color: 'rgba(255,255,255,0.55)', fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  soundModalSubtitle: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '700', marginTop: 6, marginBottom: Spacing.lg },
  soundModalBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  soundModalBtnPrimaryText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
  soundModalCancel: { alignItems: 'center', paddingVertical: 16 },
  soundModalCancelText: { color: 'rgba(255,255,255,0.65)', fontSize: FontSizes.md, fontWeight: '600' },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFF' },
  followBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000' },
  actionButton: { alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 2, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  musicDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 6, borderColor: '#333', marginTop: 8, overflow: 'hidden' },
  musicDiscImage: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, overflow: 'hidden' },
  bottomInfo: { position: 'absolute', left: Spacing.lg, right: 70, zIndex: 20, elevation: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  username: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  followBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },
  followBtnText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  followingTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  followingTagText: { color: '#FFF', fontSize: FontSizes.xs },
  description: { color: '#FFF', fontSize: FontSizes.md, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  hashtag: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  viewsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { color: '#FFF', fontSize: FontSizes.sm, flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  shareHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
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
  commentRecordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, minHeight: 40 },
  commentRecordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935', marginRight: Spacing.sm },
  commentRecordingText: { flex: 1, color: Colors.text, fontSize: FontSizes.sm },
  commentMicBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  commentVoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,107,0,0.12)' },
  commentVoiceLabel: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
});
