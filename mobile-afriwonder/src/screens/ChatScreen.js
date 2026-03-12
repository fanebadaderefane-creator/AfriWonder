/**
 * ChatScreen — Conversation avec un utilisateur (réécriture RN depuis PWA Chat.jsx, version simplifiée)
 * Affiche les messages, envoi de texte, marquer comme lu.
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

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user: currentUser } = useAuth();
  const userId = route.params?.userId;

  const [other, setOther] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const listRef = useRef(null);

  const loadConversation = useCallback(async () => {
    if (!userId) return;
    try {
      const conv = await api.messages.getConversation(userId);
      setConversation(conv);
      const otherUser = conv?.other ?? conv?.participants?.find((p) => p.id !== currentUser?.id) ?? { id: userId };
      setOther(otherUser);
      const msgs = await api.messages.getMessages(conv?.id || userId, null, 50);
      const list = msgs?.messages ?? msgs?.data ?? (Array.isArray(msgs) ? msgs : []);
      setMessages(Array.isArray(list) ? list.reverse() : []);
      await api.messages.markAsRead(conv?.id || userId);
    } catch {
      setMessages([]);
      setOther({ id: userId });
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setInputText('');
    try {
      const sent = await api.messages.send(userId, text);
      const msg = sent?.message ?? { id: Date.now(), content: text, sender_id: currentUser?.id, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, userId, currentUser?.id, sending]);

  const otherName = other?.full_name || other?.username || 'Utilisateur';

  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Conversation introuvable</Text>
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
        {other?.profile_image ? (
          <Image source={{ uri: other.profile_image }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{otherName[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>{otherName}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id || `${item.created_at}-${item.content?.slice(0, 10)}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Aucun message. Envoyez un message pour commencer.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = (item.sender_id || item.senderId) === currentUser?.id;
              const content = item.content ?? item.text ?? '';
              return (
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{content}</Text>
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatMessageTime(item.created_at)}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Votre message..."
              placeholderTextColor="#6B7280"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#9CA3AF' },
  listContent: { padding: 16, paddingBottom: 8 },
  emptyWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#6B7280' },
  msgRow: { marginBottom: 8 },
  msgRowMe: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#1F2937', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#E5E7EB' },
  bubbleTextMe: { color: '#FFF' },
  bubbleTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.8)' },
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
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#111827',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F9FAFB',
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
