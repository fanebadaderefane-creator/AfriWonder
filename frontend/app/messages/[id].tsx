import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Animated, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

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

const CONTACTS: Record<string, { name: string; avatar: string; online: boolean; lastSeen: string }> = {
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

const INITIAL_MESSAGES: Message[] = [
  { id: 'd1', text: '', isMine: false, time: '', status: 'read', type: 'text', date: 'Aujourd\'hui' },
  { id: '1', text: 'Salut! Comment tu vas?', isMine: false, time: '14:00', status: 'read', type: 'text' },
  { id: '2', text: 'Salut! Je vais bien, merci! Et toi?', isMine: true, time: '14:02', status: 'read', type: 'text' },
  { id: '3', text: 'Super bien! Tu as vu ma nouvelle video sur AfriWonder? J\'ai fait une danse traditionnelle mandingue', isMine: false, time: '14:03', status: 'read', type: 'text' },
  { id: '4', text: '', isMine: false, time: '14:04', status: 'read', type: 'image', imageUri: 'https://picsum.photos/300/400?random=300' },
  { id: '5', text: 'Waow! Elle est geniale, j\'ai adore la danse! Le decor est magnifique aussi', isMine: true, time: '14:05', status: 'read', type: 'text' },
  { id: '6', text: '', isMine: false, time: '14:06', status: 'read', type: 'voice', voiceDuration: '0:23' },
  { id: '7', text: 'Merci beaucoup! J\'en prepare une autre pour demain. Tu veux y participer?', isMine: false, time: '14:07', status: 'read', type: 'text' },
  { id: '8', text: 'Oui avec plaisir! On se retrouve a quelle heure?', isMine: true, time: '14:08', status: 'read', type: 'text' },
  { id: '9', text: 'Vers 16h au studio. Je t\'envoie la localisation', isMine: false, time: '14:09', status: 'read', type: 'text' },
  { id: '10', text: 'J\'ai hate de la voir!', isMine: true, time: '14:10', status: 'delivered', type: 'text' },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const contactId = (id as string) || 'c1';
  const contact = CONTACTS[contactId] || CONTACTS.c1;
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      isMine: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');

    // Update to delivered
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m));
    }, 1000);

    // Simulate reply
    setTimeout(() => {
      const replies = [
        'D\'accord, ca marche!',
        'Super idee!',
        'Je vais verifier et je te dis',
        'Merci beaucoup!',
        'Pas de probleme',
        'On en reparle demain',
      ];
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: replies[Math.floor(Math.random() * replies.length)],
        isMine: false,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        type: 'text',
      }]);

      // Mark my messages as read
      setMessages(prev => prev.map(m => m.isMine ? { ...m, status: 'read' } : m));
    }, 2500);
  }, [newMessage]);

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
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
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
