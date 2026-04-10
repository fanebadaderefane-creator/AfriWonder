import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import mobileApiClient from '../../src/api/mobileClient';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice' | 'document';
  imageUri?: string;
  voiceDuration?: string;
  replyTo?: { name: string; text: string };
  date?: string;
}

// Fallback contacts for legacy/mock conversation IDs
const FALLBACK_CONTACTS: Record<string, { name: string; avatar: string; online: boolean; lastSeen: string }> = {
  c1: { name: 'Aminata Diallo', avatar: 'https://i.pravatar.cc/150?img=1', online: true, lastSeen: '' },
  c2: { name: 'Moussa Ndiaye', avatar: 'https://i.pravatar.cc/150?img=2', online: true, lastSeen: '' },
  c3: { name: 'Famille Bamako', avatar: 'https://i.pravatar.cc/150?img=10', online: false, lastSeen: '12 membres' },
  c4: { name: 'Awa Kone', avatar: 'https://i.pravatar.cc/150?img=3', online: false, lastSeen: 'Vu a 11:05' },
  c5: { name: 'Ibrahim Toure', avatar: 'https://i.pravatar.cc/150?img=4', online: false, lastSeen: 'Vu a 09:30' },
  c6: { name: 'Fatoumata Diarra', avatar: 'https://i.pravatar.cc/150?img=9', online: true, lastSeen: '' },
  c7: { name: 'Vendeurs AfriWonder', avatar: 'https://i.pravatar.cc/150?img=12', online: false, lastSeen: '45 membres' },
  c8: { name: 'Support AfriWonder', avatar: 'https://i.pravatar.cc/150?img=50', online: true, lastSeen: '' },
  c9: { name: 'Mariam Sangare', avatar: 'https://i.pravatar.cc/150?img=5', online: false, lastSeen: 'Vu hier a 22:15' },
  c10: { name: 'Boubacar Diallo', avatar: 'https://i.pravatar.cc/150?img=7', online: false, lastSeen: 'Vu samedi' },
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id, name: paramName, avatar: paramAvatar } = useLocalSearchParams();
  const conversationId = id as string;
  const { user } = useAuthStore();
  const currentUserId = user?.id || user?._id || '';

  // Contact info: from route params, fallback map, or defaults
  const fallback = FALLBACK_CONTACTS[conversationId];
  const [contact, setContact] = useState({
    name: (paramName as string) || fallback?.name || 'Contact',
    avatar: (paramAvatar as string) || fallback?.avatar || `https://i.pravatar.cc/150?u=${conversationId}`,
    online: fallback?.online || false,
    lastSeen: fallback?.lastSeen || '',
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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
            text: m.content || '',
            isMine: m.sender_id === currentUserId,
            time: msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            status: m.is_read ? 'read' : 'delivered',
            type: (m.type || 'text') as any,
          });
        });
        setMessages(transformed);
      } else {
        // No messages yet - show a welcome date separator
        setMessages([{ id: 'd1', text: '', isMine: false, time: '', status: 'read', type: 'text', date: "Aujourd'hui" }]);
      }
    } catch (err) {
      console.log('Error loading messages, using empty state', err);
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
    };
    // Optimistic UI update
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setSending(true);

    try {
      const response = await mobileApiClient.post(`/mobile/conversations/${conversationId}/messages`, {
        content: msgText,
        type: 'text',
      });
      const sentMsg = response.data?.data;
      // Update with server-confirmed message
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: sentMsg?.id || tempId, status: 'delivered' } : m));
    } catch (err) {
      console.log('Send message error:', err);
      // Mark as failed but keep in UI
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
    } finally { setSending(false); }
  }, [newMessage, conversationId, sending]);

  const renderStatus = (status: string) => {
    switch (status) {
      case 'sent':
        return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.5)" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.5)" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
      default:
        return null;
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Date separator
    if (item.date) {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
        </View>
      );
    }

    // Check if we should show tail
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTail = !prevMsg || prevMsg.isMine !== item.isMine || prevMsg.date;

    if (item.type === 'image') {
      return (
        <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
          <View style={[styles.imageBubble, item.isMine ? styles.imageBubbleMine : styles.imageBubbleTheirs]}>
            <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
            <View style={styles.imageTimeRow}>
              <Text style={styles.imageTime}>{item.time}</Text>
              {item.isMine && renderStatus(item.status)}
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'voice') {
      return (
        <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
          <View style={[styles.voiceBubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs, showTail && (item.isMine ? styles.tailMine : styles.tailTheirs)]}>
            <TouchableOpacity style={styles.voicePlayBtn}>
              <Ionicons name="play" size={20} color={item.isMine ? '#FFF' : Colors.primary} />
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              {Array.from({ length: 20 }, (_, i) => (
                <View key={i} style={[styles.waveBar, { height: Math.random() * 16 + 4 }, item.isMine && styles.waveBarMine]} />
              ))}
            </View>
            <Text style={[styles.voiceDuration, item.isMine && styles.voiceDurationMine]}>{item.voiceDuration}</Text>
            <View style={styles.voiceTimeRow}>
              <Text style={[styles.msgTimeText, item.isMine && styles.msgTimeTextMine]}>{item.time}</Text>
              {item.isMine && renderStatus(item.status)}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
        <View style={[
          styles.messageBubble,
          item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
          showTail && (item.isMine ? styles.tailMine : styles.tailTheirs),
        ]}>
          <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
          <View style={styles.msgTimeRow}>
            <Text style={[styles.msgTimeText, item.isMine && styles.msgTimeTextMine]}>{item.time}</Text>
            {item.isMine && renderStatus(item.status)}
          </View>
        </View>
      </View>
    );
  };

  const ATTACHMENT_OPTIONS = [
    { icon: 'camera', label: 'Camera', color: '#FF6B6B' },
    { icon: 'images', label: 'Galerie', color: '#4ECDC4' },
    { icon: 'document', label: 'Document', color: '#45B7D1' },
    { icon: 'location', label: 'Position', color: '#FF6B00' },
    { icon: 'person', label: 'Contact', color: '#96CEB4' },
    { icon: 'musical-notes', label: 'Audio', color: '#DDA0DD' },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerProfile}>
          <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{contact.name}</Text>
            <Text style={styles.headerStatus}>
              {contact.online ? 'En ligne' : contact.lastSeen}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => router.push({ pathname: '/messages/call' as any, params: { name: contact.name, avatar: contact.avatar, type: 'video' } })}>
          <Ionicons name="videocam" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => router.push({ pathname: '/messages/call' as any, params: { name: contact.name, avatar: contact.avatar, type: 'audio' } })}>
          <Ionicons name="call" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Chat Background + Messages */}
      <View style={styles.chatArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement des messages...</Text>
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
              <TouchableOpacity key={i} style={styles.attachOption}>
                <View style={[styles.attachIcon, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon as any} size={22} color="#FFF" />
                </View>
                <Text style={styles.attachLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.xs }]}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Message"
            placeholderTextColor={Colors.textMuted}
            value={newMessage}
            onChangeText={(text) => { setNewMessage(text); setShowAttach(false); }}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity onPress={() => setShowAttach(!showAttach)}>
            <Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
          </TouchableOpacity>
          {!newMessage.trim() && (
            <TouchableOpacity style={styles.cameraInlineBtn}>
              <Ionicons name="camera" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {newMessage.trim() ? (
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, isRecording && styles.recordingBtn]}
            onPressIn={() => setIsRecording(true)}
            onPressOut={() => setIsRecording(false)}
          >
            <Ionicons name="mic" size={22} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.secondary || Colors.background },
  backBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  headerStatus: { color: Colors.success, fontSize: FontSizes.xs },
  headerAction: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  chatArea: { flex: 1, backgroundColor: '#0B141A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  messagesList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, paddingBottom: Spacing.lg },
  dateSeparator: { alignItems: 'center', marginVertical: Spacing.md },
  dateBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.sm },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs },
  messageRow: { flexDirection: 'row', marginBottom: 2 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', borderRadius: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
  bubbleMine: { backgroundColor: '#005C4B', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  bubbleTheirs: { backgroundColor: '#1F2C34', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  tailMine: { borderTopRightRadius: 0 },
  tailTheirs: { borderTopLeftRadius: 0 },
  messageText: { color: '#E9EDEF', fontSize: FontSizes.md, lineHeight: 22 },
  messageTextMine: { color: '#E9EDEF' },
  msgTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2, marginBottom: 2 },
  msgTimeText: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  msgTimeTextMine: { color: 'rgba(255,255,255,0.45)' },
  // Image message
  imageBubble: { maxWidth: '70%', borderRadius: 8, overflow: 'hidden' },
  imageBubbleMine: { backgroundColor: '#005C4B' },
  imageBubbleTheirs: { backgroundColor: '#1F2C34' },
  messageImage: { width: 220, height: 280, borderRadius: 6 },
  imageTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, position: 'absolute', bottom: 6, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  imageTime: { color: '#FFF', fontSize: 11 },
  // Voice message
  voiceBubble: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', maxWidth: '75%', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, gap: Spacing.xs },
  voicePlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  voiceWaveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1.5, minWidth: 100 },
  waveBar: { width: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 1.5 },
  waveBarMine: { backgroundColor: 'rgba(255,255,255,0.5)' },
  voiceDuration: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 4 },
  voiceDurationMine: {},
  voiceTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, width: '100%' },
  // Attachment panel
  attachPanel: { backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.lg },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  attachOption: { alignItems: 'center', width: width / 3 - Spacing.xl, marginBottom: Spacing.lg },
  attachIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  attachLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.background },
  inputRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surface, borderRadius: 24, paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'ios' ? 8 : 4, gap: 4 },
  emojiBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, maxHeight: 100, paddingVertical: Platform.OS === 'ios' ? 4 : 2, paddingHorizontal: 4 },
  cameraInlineBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  recordingBtn: { backgroundColor: Colors.error, transform: [{ scale: 1.1 }] },
});
