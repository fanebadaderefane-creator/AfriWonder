import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'Salut! Comment tu vas?', isMine: false, time: '14:00' },
  { id: '2', text: 'Salut! Je vais bien, merci! Et toi?', isMine: true, time: '14:02' },
  { id: '3', text: 'Super! Tu as vu ma nouvelle video?', isMine: false, time: '14:03' },
  { id: '4', text: 'Oui! Elle est geniale, j\'ai adore la danse!', isMine: true, time: '14:05' },
  { id: '5', text: 'Merci beaucoup! J\'en prepare une autre pour demain', isMine: false, time: '14:06' },
  { id: '6', text: 'J\'ai hate de la voir!', isMine: true, time: '14:07' },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const contactName = 'Aminata Diallo';
  const contactAvatar = 'https://i.pravatar.cc/150?img=1';

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      isMine: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');

    // Simulate reply
    setTimeout(() => {
      const replies = ['D\'accord!', 'Super!', 'Je comprends', 'Genial!', 'OK merci!'];
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: replies[Math.floor(Math.random() * replies.length)],
        isMine: false,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 2000);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
      {!item.isMine && (
        <Image source={{ uri: contactAvatar }} style={styles.msgAvatar} />
      )}
      <View style={[styles.messageBubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    </View>
  );

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
        <Image source={{ uri: contactAvatar }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{contactName}</Text>
          <Text style={styles.headerStatus}>En ligne</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="videocam" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={Colors.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  headerStatus: {
    color: Colors.success,
    fontSize: FontSizes.xs,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSizes.xs,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
