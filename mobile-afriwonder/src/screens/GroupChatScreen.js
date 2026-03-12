/**
 * GroupChatScreen — Chat de groupe (parité CDC avec PWA GroupChat.jsx)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatMessageTime(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function GroupChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user: currentUser } = useAuth();
  const groupId = route.params?.groupId;

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const listRef = useRef(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const g = await api.messages.getGroup(groupId);
      setGroup(g);
      const msgs = await api.messages.getGroupMessages(groupId, null, 50);
      const list = msgs?.messages ?? msgs?.data ?? (Array.isArray(msgs) ? msgs : []);
      setMessages(Array.isArray(list) ? list.reverse() : []);
    } catch {
      setMessages([]);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !groupId || sending) return;
    setSending(true);
    setInputText('');
    try {
      const sent = await api.messages.sendGroupMessage(groupId, text);
      const msg = sent?.message ?? {
        id: String(Date.now()),
        content: text,
        sender_id: currentUser?.id,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, groupId, currentUser?.id, sending]);

  const groupName = group?.name || 'Groupe';

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groupe</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Groupe introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="people" size={24} color="#F9FAFB" />
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id || String(item.created_at)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isMe = item.sender_id === currentUser?.id;
              const sender = item.sender || {};
              const senderName = sender.full_name || sender.username || 'Membre';
              return (
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                  {!isMe && (
                    (sender.profile_image ? (
                      <Image source={{ uri: sender.profile_image }} style={styles.msgAvatar} />
                    ) : (
                      <View style={[styles.msgAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarLetter}>{senderName[0]?.toUpperCase() || '?'}</Text>
                      </View>
                    )
                  )}
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content || ''}</Text>
                    <Text style={styles.bubbleTime}>{formatMessageTime(item.created_at)}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor="#6B7280"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons name="send" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#F9FAFB', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#9CA3AF' },
  listContent: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowMe: { flexDirection: 'row-reverse' },
  messageRowOther: {},
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#3B82F6', marginLeft: 8 },
  bubbleOther: { backgroundColor: '#1F2937' },
  senderName: { fontSize: 11, color: '#3B82F6', marginBottom: 2 },
  bubbleText: { fontSize: 15, color: '#E5E7EB' },
  bubbleTextMe: { color: '#FFF' },
  bubbleTime: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2937',
    backgroundColor: '#020617',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#F9FAFB',
    marginRight: 8,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
