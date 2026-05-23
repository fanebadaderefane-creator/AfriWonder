import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const INITIAL_MESSAGES = [
  { id: 'm1', role: 'assistant', text: 'Bonjour! Je suis l\'assistant AfriWonder. Comment puis-je vous aider aujourd\'hui?', time: '10:00' },
];

const SUGGESTIONS = [
  'Comment recharger mon wallet?',
  'Comment vendre sur la marketplace?',
  'Aide pour le microcredit',
  'Probleme avec ma commande',
];

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = (text?: string) => {
    const msgText = text || input;
    if (!msgText.trim()) return;

    const userMsg = { id: `u${Date.now()}`, role: 'user', text: msgText, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    const botMsg = {
      id: `b${Date.now()}`,
      role: 'assistant',
      text: 'Merci pour votre message. Pour une aide personnalisée, ouvrez Paramètres → Aide ou contactez le support AfriWonder.',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.botAvatar}><Ionicons name="sparkles" size={20} color={Colors.primary} /></View>
          <Text style={styles.headerTitle}>Assistant IA</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={
          messages.length <= 1 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, item.role === 'user' && styles.userMessageText]}>{item.text}</Text>
            <Text style={styles.messageTime}>{item.time}</Text>
          </View>
        )}
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput style={styles.input} placeholder="Ecrivez votre message..." placeholderTextColor={Colors.textMuted} value={input} onChangeText={setInput} onSubmitEditing={() => sendMessage()} />
        <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
          <Ionicons name="send" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  messagesList: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  messageBubble: { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  userBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 22 },
  userMessageText: { color: '#FFFFFF' },
  messageTime: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.xs, marginTop: 4, alignSelf: 'flex-end' },
  suggestions: { paddingVertical: Spacing.xl },
  suggestionsTitle: { color: Colors.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.md },
  suggestionChip: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  suggestionText: { color: Colors.text, fontSize: FontSizes.md },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.text, fontSize: FontSizes.md },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
