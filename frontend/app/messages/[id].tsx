import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Modal, Alert, Pressable, Animated } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import mobileApiClient from '../../src/api/mobileClient';
import { useAuthStore } from '../../src/store/authStore';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import socketService from '../../src/services/socketService';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice' | 'document' | 'audio';
  imageUri?: string;
  voiceDuration?: string;
  replyTo?: { id: string; name: string; text: string };
  date?: string;
  reactions?: { emoji: string; count: number; myReaction: boolean }[];
  starred?: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  edited?: boolean;
  deleted?: boolean;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id, name: paramName, avatar: paramAvatar } = useLocalSearchParams();
  const conversationId = id as string;
  const { user } = useAuthStore();
  const currentUserId = user?.id || user?._id || '';

  const [contact, setContact] = useState({
    name: (paramName as string) || 'Contact',
    avatar: (paramAvatar as string) || `https://i.pravatar.cc/150?u=${conversationId}`,
    online: false,
    lastSeen: '',
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Context menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  // Forward modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Ephemeral messages
  const [ephemeralMode, setEphemeralMode] = useState<'off' | '24h' | '7d' | '90d'>('off');

  // Typing indicator
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Socket.IO real-time connection
  useEffect(() => {
    const token = user?.token || '';
    if (token) {
      socketService.connect(token);
      socketService.joinConversation(conversationId);
      socketService.markRead(conversationId);
    }

    // Listen for new messages
    const unsubMsg = socketService.on('new_message', (msg: any) => {
      if (msg.conversation_id === conversationId && msg.sender_id !== currentUserId) {
        const newMsg: Message = {
          id: msg.id,
          text: msg.content || '',
          isMine: false,
          time: new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
          type: (msg.type || 'text') as any,
          replyTo: msg.reply_to,
          forwarded: !!msg.forwarded_from,
        };
        setMessages(prev => [...prev, newMsg]);
        socketService.markRead(conversationId);
      }
    });

    // Listen for typing
    const unsubTyping = socketService.on('user_typing', (data: any) => {
      if (data.conversation_id === conversationId) {
        setIsContactTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsContactTyping(false), 3000);
      }
    });

    const unsubStopTyping = socketService.on('user_stop_typing', (data: any) => {
      if (data.conversation_id === conversationId) setIsContactTyping(false);
    });

    // Listen for read receipts
    const unsubRead = socketService.on('messages_read', (data: any) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => prev.map(m => m.isMine ? { ...m, status: 'read' } : m));
      }
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubStopTyping();
      unsubRead();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => { loadMessages(); }, [conversationId]);

  const loadMessages = async () => {
    try {
      const response = await mobileApiClient.get(`/mobile/conversations/${conversationId}/messages`);
      const data = response.data?.data || response.data;
      const backendMsgs = data?.messages || [];
      if (backendMsgs.length > 0) {
        const transformed: Message[] = [];
        let lastDate = '';
        backendMsgs.forEach((m: any) => {
          const msgDate = new Date(m.created_at);
          const dateStr = formatDateLabel(msgDate);
          if (dateStr !== lastDate) {
            transformed.push({ id: `date-${m.id}`, text: '', isMine: false, time: '', status: 'read', type: 'text', date: dateStr });
            lastDate = dateStr;
          }
          transformed.push({
            id: m.id,
            text: m.deleted ? 'Ce message a ete supprime' : (m.content || ''),
            isMine: m.sender_id === currentUserId,
            time: msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            status: m.is_read ? 'read' : 'delivered',
            type: (m.type || 'text') as any,
            replyTo: m.reply_to ? { id: m.reply_to.id, name: m.reply_to.name || '', text: m.reply_to.text || '' } : undefined,
            forwarded: !!m.forwarded_from,
            edited: !!m.edited,
            deleted: !!m.deleted,
          });
        });
        setMessages(transformed);
      } else {
        setMessages([{ id: 'd1', text: '', isMine: false, time: '', status: 'read', type: 'text', date: "Aujourd'hui" }]);
      }
    } catch (err) {
      console.log('Error loading messages:', err);
      setMessages([{ id: 'd1', text: '', isMine: false, time: '', status: 'read', type: 'text', date: "Aujourd'hui" }]);
    } finally { setLoading(false); }
  };

  const formatDateLabel = (date: Date) => {
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 24) return "Aujourd'hui";
    if (diffH < 48) return 'Hier';
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    const tempId = Date.now().toString();
    const msgText = newMessage.trim();
    const msg: Message = {
      id: tempId,
      text: msgText,
      isMine: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
      replyTo: replyingTo ? { id: replyingTo.id, name: replyingTo.isMine ? 'Vous' : contact.name, text: replyingTo.text } : undefined,
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    try {
      const body: any = { content: msgText, type: 'text' };
      if (replyingTo) {
        body.reply_to = { id: replyingTo.id, name: replyingTo.isMine ? 'Vous' : contact.name, text: replyingTo.text };
      }
      const response = await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages`, body);
      const sentMsg = response.data?.data;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: sentMsg?.id || tempId, status: 'delivered' } : m));
    } catch (err) {
      console.log('Send error:', err);
    } finally { setSending(false); }
  }, [newMessage, conversationId, sending, replyingTo, contact.name]);

  // ===== VOICE RECORDING =====

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission', 'Autorisez le microphone pour envoyer des vocaux');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      // Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.log('Recording error:', err);
      Alert.alert('Erreur', 'Impossible de demarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const duration = recordingDuration;
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (uri && duration >= 1) {
        const tempId = Date.now().toString();
        const voiceMsg: Message = {
          id: tempId,
          text: `Vocal ${formatDuration(duration)}`,
          isMine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'voice',
          voiceDuration: formatDuration(duration),
          imageUri: uri,
        };
        setMessages(prev => [...prev, voiceMsg]);

        try {
          await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages`, {
            content: `Vocal ${formatDuration(duration)}`,
            type: 'voice',
            media_url: uri,
            duration: duration,
          });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
        } catch {}
      }
    } catch (err) {
      console.log('Stop recording error:', err);
    }
  };

  const cancelRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
  };

  // ===== AUDIO PLAYBACK =====

  const playAudio = async (msg: Message) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playingAudioId === msg.id) {
        setPlayingAudioId(null);
        return;
      }
      const uri = msg.imageUri;
      if (!uri) return;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setAudioProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setAudioProgress(0);
          }
        }
      });
      soundRef.current = sound;
      setPlayingAudioId(msg.id);
    } catch (err) {
      console.log('Playback error:', err);
    }
  };

  // ===== IMAGE/VIDEO PICKER =====

  const pickImage = async (useCamera: boolean = false) => {
    setShowAttach(false);
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Autorisez la camera'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Autorisez la galerie'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7, allowsMultipleSelection: false });
      }
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const tempId = Date.now().toString();
        const mediaMsg: Message = {
          id: tempId,
          text: isVideo ? 'Video' : 'Photo',
          isMine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'image',
          imageUri: asset.uri,
        };
        setMessages(prev => [...prev, mediaMsg]);

        try {
          await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages`, {
            content: isVideo ? 'Video' : 'Photo',
            type: isVideo ? 'video' : 'image',
            media_url: asset.uri,
          });
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
        } catch {}
      }
    } catch (err) {
      console.log('Picker error:', err);
    }
  };

  // ===== CONTEXT MENU ACTIONS =====

  const onLongPress = (msg: Message) => {
    if (msg.date || msg.deleted) return;
    setSelectedMessage(msg);
    setContextMenuVisible(true);
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setContextMenuVisible(false);
  };

  const handleCopy = async () => {
    if (!selectedMessage) return;
    await Clipboard.setStringAsync(selectedMessage.text);
    setContextMenuVisible(false);
    Alert.alert('Copie', 'Message copie dans le presse-papier');
  };

  const handleReact = () => {
    setContextMenuVisible(false);
    setEmojiPickerVisible(true);
  };

  const handleEmojiReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    setEmojiPickerVisible(false);
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id === selectedMessage.id) {
        const existing = m.reactions || [];
        const found = existing.find(r => r.emoji === emoji);
        if (found && found.myReaction) {
          return { ...m, reactions: existing.filter(r => r.emoji !== emoji) };
        }
        if (found) {
          return { ...m, reactions: existing.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r) };
        }
        return { ...m, reactions: [...existing, { emoji, count: 1, myReaction: true }] };
      }
      return m;
    }));
    try {
      await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages/${selectedMessage.id}/react`, { emoji });
    } catch {}
  };

  const handleDelete = () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    const options = selectedMessage.isMine
      ? [
          { text: 'Annuler', style: 'cancel' as const },
          { text: 'Pour moi', onPress: () => doDelete('me') },
          { text: 'Pour tout le monde', style: 'destructive' as const, onPress: () => doDelete('everyone') },
        ]
      : [
          { text: 'Annuler', style: 'cancel' as const },
          { text: 'Pour moi', onPress: () => doDelete('me') },
        ];
    Alert.alert('Supprimer le message ?', '', options);
  };

  const doDelete = async (deleteFor: string) => {
    if (!selectedMessage) return;
    try {
      await mobileApiClient.delete(`/mobile/conversations/${conversationId}/messages/${selectedMessage.id}?delete_for=${deleteFor}`);
      if (deleteFor === 'everyone') {
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, text: 'Ce message a ete supprime', deleted: true } : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    }
  };

  const handlePin = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      const res = await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages/${selectedMessage.id}/pin`);
      const pinned = res.data?.data?.pinned;
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, pinned } : m));
      Alert.alert(pinned ? 'Epingle' : 'Desepingle', pinned ? 'Message epingle pour 30 jours' : 'Message desepingle');
    } catch {}
  };

  const handleStar = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      const res = await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages/${selectedMessage.id}/star`);
      const starred = res.data?.data?.starred;
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, starred } : m));
    } catch {}
  };

  const handleForward = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      const res = await mobileApiClient.get('/mobile/conversations');
      const convos = res.data?.data?.conversations || [];
      setConversations(convos);
      setForwardModalVisible(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les conversations');
    }
  };

  const doForward = async (targetConvId: string) => {
    if (!selectedMessage) return;
    setForwardModalVisible(false);
    try {
      await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages/${selectedMessage.id}/forward`, {
        target_conversation_id: targetConvId,
      });
      Alert.alert('Transfere', 'Message transfere avec succes');
    } catch {
      Alert.alert('Erreur', 'Echec du transfert');
    }
  };

  // ===== RENDERERS =====

  const renderStatus = (status: string) => {
    switch (status) {
      case 'sent': return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.5)" />;
      case 'delivered': return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.5)" />;
      case 'read': return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
      default: return null;
    }
  };

  const renderReactions = (reactions?: Message['reactions']) => {
    if (!reactions || reactions.length === 0) return null;
    return (
      <View style={styles.reactionsRow}>
        {reactions.map((r, i) => (
          <View key={i} style={[styles.reactionBadge, r.myReaction && styles.reactionBadgeMine]}>
            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    if (item.date) {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateBadge}><Text style={styles.dateText}>{item.date}</Text></View>
        </View>
      );
    }

    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTail = !prevMsg || prevMsg.isMine !== item.isMine || prevMsg.date;

    return (
      <Pressable
        onLongPress={() => onLongPress(item)}
        delayLongPress={300}
        style={[styles.messageRow, item.isMine && styles.messageRowMine]}
      >
        <View style={[
          styles.messageBubble,
          item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
          showTail && (item.isMine ? styles.tailMine : styles.tailTheirs),
          item.deleted && styles.deletedBubble,
        ]}>
          {/* Forwarded label */}
          {item.forwarded && (
            <View style={styles.forwardedRow}>
              <Ionicons name="arrow-redo" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.forwardedText}>Transfere</Text>
            </View>
          )}

          {/* Reply quote */}
          {item.replyTo && (
            <View style={styles.replyQuote}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyName}>{item.replyTo.name}</Text>
                <Text style={styles.replyText} numberOfLines={2}>{item.replyTo.text}</Text>
              </View>
            </View>
          )}

          {/* Deleted message */}
          {item.deleted ? (
            <View style={styles.deletedRow}>
              <Ionicons name="ban-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.deletedText}>{item.text}</Text>
            </View>
          ) : item.type === 'voice' ? (
            <TouchableOpacity style={styles.voiceBubble} onPress={() => playAudio(item)} activeOpacity={0.7}>
              <Ionicons name={playingAudioId === item.id ? 'pause' : 'play'} size={28} color="#FFF" />
              <View style={styles.voiceWaveContainer}>
                <View style={styles.voiceWaveTrack}>
                  <View style={[styles.voiceWaveProgress, { width: playingAudioId === item.id ? `${audioProgress * 100}%` : '0%' }]} />
                </View>
                <Text style={styles.voiceDurationText}>{item.voiceDuration || '0:00'}</Text>
              </View>
              <View style={[styles.voiceMicBadge, { backgroundColor: item.isMine ? '#005C4B' : '#1F2C34' }]}>
                <Ionicons name="mic" size={14} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          ) : item.type === 'image' && item.imageUri ? (
            <View style={styles.imageBubble}>
              <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
              {item.text && item.text !== 'Photo' && item.text !== 'Video' && (
                <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
          )}

          {/* Time + status + extras */}
          <View style={styles.msgTimeRow}>
            {item.starred && <Ionicons name="star" size={11} color="#FFD700" style={{ marginRight: 3 }} />}
            {item.edited && <Text style={styles.editedLabel}>modifie</Text>}
            <Text style={[styles.msgTimeText, item.isMine && styles.msgTimeTextMine]}>{item.time}</Text>
            {item.isMine && renderStatus(item.status)}
          </View>

          {/* Reactions */}
          {renderReactions(item.reactions)}
        </View>
      </Pressable>
    );
  };

  const ATTACHMENT_OPTIONS = [
    { icon: 'camera', label: 'Camera', color: '#FF6B6B', action: () => pickImage(true) },
    { icon: 'images', label: 'Galerie', color: '#4ECDC4', action: () => pickImage(false) },
    { icon: 'document', label: 'Document', color: '#45B7D1', action: () => setShowAttach(false) },
    { icon: 'location', label: 'Position', color: '#FF6B00', action: () => setShowAttach(false) },
    { icon: 'person', label: 'Contact', color: '#96CEB4', action: () => setShowAttach(false) },
    { icon: 'musical-notes', label: 'Audio', color: '#DDA0DD', action: () => setShowAttach(false) },
  ];

  const CONTEXT_MENU_ITEMS = [
    { icon: 'arrow-undo', label: 'Repondre', action: handleReply },
    { icon: 'happy-outline', label: 'Reagir', action: handleReact },
    { icon: 'copy-outline', label: 'Copier', action: handleCopy },
    { icon: 'arrow-redo', label: 'Transferer', action: handleForward },
    { icon: 'pin', label: 'Epingler', action: handlePin },
    { icon: 'star-outline', label: 'Important', action: handleStar },
    { icon: 'trash-outline', label: 'Supprimer', action: handleDelete, destructive: true },
  ];

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerProfile}>
          <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{contact.name}</Text>
            <Text style={styles.headerStatus}>{isContactTyping ? 'En train d\'ecrire...' : contact.online ? 'En ligne' : 'AfriChat'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => router.push({ pathname: '/messages/call' as any, params: { name: contact.name, avatar: contact.avatar, type: 'video' } })}>
          <Ionicons name="videocam" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => router.push({ pathname: '/messages/call' as any, params: { name: contact.name, avatar: contact.avatar, type: 'audio' } })}>
          <Ionicons name="call" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <View style={styles.chatArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
      </View>

      {/* Attachment Panel */}
      {showAttach && (
        <View style={styles.attachPanel}>
          <View style={styles.attachGrid}>
            {ATTACHMENT_OPTIONS.map((opt, i) => (
              <TouchableOpacity key={i} style={styles.attachOption} onPress={opt.action}>
                <View style={[styles.attachIcon, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon as any} size={22} color="#FFF" />
                </View>
                <Text style={styles.attachLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Reply bar */}
      {replyingTo && (
        <View style={styles.replyBar2}>
          <View style={styles.replyBarIndicator} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>{replyingTo.isMine ? 'Vous' : contact.name}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.xs }]}>
        {isRecording ? (
          /* Recording Mode */
          <View style={styles.recordingBar}>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
            <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: recordingAnim }] }]}>
              <View style={styles.recordDot} />
            </Animated.View>
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            <View style={styles.recordingWaves}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.waveBar, { height: 8 + Math.random() * 16 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.stopRecBtn}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Normal Input Mode */
          <>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.emojiBtn}>
                <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor={Colors.textMuted}
                value={newMessage}
                onChangeText={(text) => {
                  setNewMessage(text);
                  setShowAttach(false);
                  if (text.length > 0) socketService.startTyping(conversationId);
                  else socketService.stopTyping(conversationId);
                }}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity onPress={() => setShowAttach(!showAttach)}>
                <Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
              {!newMessage.trim() && (
                <TouchableOpacity style={styles.cameraInlineBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {newMessage.trim() ? (
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendBtn} onPress={startRecording} onLongPress={startRecording}>
                <Ionicons name="mic" size={22} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* ===== CONTEXT MENU MODAL ===== */}
      <Modal visible={contextMenuVisible} transparent animationType="fade" onRequestClose={() => setContextMenuVisible(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setContextMenuVisible(false)}>
          <View style={styles.contextMenu}>
            {/* Quick emoji reactions */}
            <View style={styles.quickReactions}>
              {EMOJI_REACTIONS.map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.quickReactionBtn} onPress={() => { setContextMenuVisible(false); handleEmojiReaction(emoji); }}>
                  <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.quickReactionBtn} onPress={handleReact}>
                <Ionicons name="add" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Context menu items */}
            {CONTEXT_MENU_ITEMS.map((item, i) => (
              <TouchableOpacity key={i} style={styles.contextMenuItem} onPress={item.action}>
                <Ionicons name={item.icon as any} size={20} color={item.destructive ? Colors.error : Colors.text} />
                <Text style={[styles.contextMenuText, item.destructive && { color: Colors.error }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ===== EMOJI PICKER MODAL ===== */}
      <Modal visible={emojiPickerVisible} transparent animationType="fade" onRequestClose={() => setEmojiPickerVisible(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setEmojiPickerVisible(false)}>
          <View style={styles.emojiPicker}>
            <Text style={styles.emojiPickerTitle}>Choisir une reaction</Text>
            <View style={styles.emojiGrid}>
              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '💯', '👏', '🤔', '😍', '💪', '🤣', '😡', '👀'].map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.emojiGridItem} onPress={() => handleEmojiReaction(emoji)}>
                  <Text style={styles.emojiGridText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ===== FORWARD MODAL ===== */}
      <Modal visible={forwardModalVisible} transparent animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <View style={styles.forwardModal}>
          <View style={styles.forwardHeader}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.forwardTitle}>Transferer a...</Text>
          </View>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const info = item.participant_info || {};
              const key = Object.keys(info)[0];
              const name = info[key]?.name || item.name || 'Contact';
              const avatar = info[key]?.avatar || `https://i.pravatar.cc/150?u=${item.id}`;
              return (
                <TouchableOpacity style={styles.forwardItem} onPress={() => doForward(item.id)}>
                  <Image source={{ uri: avatar }} style={styles.forwardAvatar} />
                  <Text style={styles.forwardName}>{name}</Text>
                  <Ionicons name="send" size={20} color={Colors.primary} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
  backBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  headerStatus: { color: Colors.success, fontSize: FontSizes.xs },
  headerAction: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Chat area
  chatArea: { flex: 1, backgroundColor: '#0B141A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  messagesList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: Spacing.lg },
  // Date separator
  dateSeparator: { alignItems: 'center', marginVertical: Spacing.md },
  dateBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.sm },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs },
  // Message bubble
  messageRow: { flexDirection: 'row', marginBottom: 2 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', borderRadius: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
  bubbleMine: { backgroundColor: '#005C4B', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  bubbleTheirs: { backgroundColor: '#1F2C34', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  tailMine: { borderTopRightRadius: 0 },
  tailTheirs: { borderTopLeftRadius: 0 },
  deletedBubble: { opacity: 0.6 },
  messageText: { color: '#E9EDEF', fontSize: FontSizes.md, lineHeight: 22 },
  messageTextMine: { color: '#E9EDEF' },
  msgTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2, marginBottom: 2 },
  msgTimeText: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  msgTimeTextMine: { color: 'rgba(255,255,255,0.45)' },
  editedLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontStyle: 'italic', marginRight: 3 },
  // Forwarded
  forwardedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  forwardedText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontStyle: 'italic' },
  // Reply quote in message
  replyQuote: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 6, overflow: 'hidden' },
  replyBar: { width: 3, backgroundColor: Colors.primary },
  replyContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  replyName: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  replyText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  // Deleted message
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deletedText: { color: 'rgba(255,255,255,0.4)', fontSize: FontSizes.md, fontStyle: 'italic' },
  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  reactionBadgeMine: { backgroundColor: 'rgba(255,106,0,0.2)' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginLeft: 2 },
  // Attachment panel
  attachPanel: { backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.lg },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  attachOption: { alignItems: 'center', width: width / 3 - Spacing.xl, marginBottom: Spacing.lg },
  attachIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  attachLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  // Reply bar (input area)
  replyBar2: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  replyBarIndicator: { width: 3, height: 36, backgroundColor: Colors.primary, borderRadius: 1.5, marginRight: Spacing.sm },
  replyBarContent: { flex: 1 },
  replyBarName: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  replyBarText: { color: Colors.textSecondary, fontSize: 13 },
  replyBarClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.background },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surface, borderRadius: 24, paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'ios' ? 8 : 4, gap: 4 },
  emojiBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, maxHeight: 100, paddingVertical: Platform.OS === 'ios' ? 4 : 2, paddingHorizontal: 4 },
  cameraInlineBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Context menu
  contextOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  contextMenu: { backgroundColor: Colors.surface || '#1a1a2e', borderRadius: 16, width: width * 0.8, maxWidth: 320, paddingVertical: 8, overflow: 'hidden' },
  quickReactions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  quickReactionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  quickReactionEmoji: { fontSize: 22 },
  contextMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  contextMenuText: { color: Colors.text, fontSize: FontSizes.md },
  // Emoji picker
  emojiPicker: { backgroundColor: Colors.surface || '#1a1a2e', borderRadius: 16, width: width * 0.85, padding: 16 },
  emojiPickerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  emojiGridItem: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  emojiGridText: { fontSize: 28 },
  // Forward modal
  forwardModal: { flex: 1, backgroundColor: Colors.background, marginTop: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  forwardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  forwardTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  forwardItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  forwardAvatar: { width: 44, height: 44, borderRadius: 22 },
  forwardName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  // Voice bubble
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
  voiceWaveContainer: { flex: 1 },
  voiceWaveTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  voiceWaveProgress: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  voiceDurationText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 },
  voiceMicBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // Image bubble
  imageBubble: { marginBottom: 2 },
  chatImage: { width: 220, height: 220, borderRadius: 8, marginBottom: 4 },
  // Recording bar
  recordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  cancelRecBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, overflow: 'hidden' },
  recordDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3D00' },
  recordingTime: { color: '#FF3D00', fontSize: FontSizes.md, fontWeight: '600', minWidth: 40 },
  recordingWaves: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 },
  waveBar: { width: 3, backgroundColor: Colors.primary, borderRadius: 1.5, opacity: 0.6 },
  stopRecBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
