import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, FlatList, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface LiveMessage {
  id: string;
  text: string;
  user: {
    name: string;
    avatar: string;
  };
}

const MOCK_MESSAGES: LiveMessage[] = [
  { id: '1', text: 'Super live!', user: { name: 'Aminata', avatar: 'https://i.pravatar.cc/150?img=1' } },
  { id: '2', text: 'Magnifique danse', user: { name: 'Moussa', avatar: 'https://i.pravatar.cc/150?img=2' } },
  { id: '3', text: 'Bravo!', user: { name: 'Awa', avatar: 'https://i.pravatar.cc/150?img=3' } },
  { id: '4', text: 'Quelle energie!', user: { name: 'Ibrahim', avatar: 'https://i.pravatar.cc/150?img=4' } },
  { id: '5', text: 'Je partage avec mes amis', user: { name: 'Fatou', avatar: 'https://i.pravatar.cc/150?img=5' } },
];

export default function LiveStreamViewerScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<LiveMessage[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState(234);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  // Simulate new messages
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ['Kadi', 'Sekou', 'Mariam', 'Oumar', 'Binta'];
      const texts = ['Trop bien!', 'Continue!', 'Genial!', 'Wow!', 'Incroyable!'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      setMessages(prev => [...prev.slice(-20), {
        id: Date.now().toString(),
        text: randomText,
        user: { name: randomName, avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}` }
      }]);
      setViewers(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: newMessage,
      user: { name: 'Moi', avatar: 'https://i.pravatar.cc/150?img=10' }
    }]);
    setNewMessage('');
  };

  const GIFTS = [
    { id: 'g1', name: 'Coeur', emoji: '\u2764\ufe0f', price: 100 },
    { id: 'g2', name: 'Etoile', emoji: '\u2b50', price: 500 },
    { id: 'g3', name: 'Diamant', emoji: '\ud83d\udc8e', price: 1000 },
    { id: 'g4', name: 'Couronne', emoji: '\ud83d\udc51', price: 5000 },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Video Background Placeholder */}
      <View style={styles.videoBackground}>
        <Image
          source={{ uri: 'https://picsum.photos/400/800?random=35' }}
          style={styles.backgroundImage}
        />
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.streamerInfo}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=1' }} style={styles.streamerAvatar} />
          <View>
            <Text style={styles.streamerName}>Aminata Diallo</Text>
            <Text style={styles.streamerTitle}>Live Dance Mali</Text>
          </View>
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            onPress={() => setIsFollowing(!isFollowing)}
          >
            <Text style={styles.followBtnText}>{isFollowing ? 'Abonne' : 'Suivre'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewersBadge}>
          <Ionicons name="eye" size={14} color={Colors.text} />
          <Text style={styles.viewersText}>{viewers}</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.messageItem}>
              <Image source={{ uri: item.user.avatar }} style={styles.msgAvatar} />
              <View style={styles.messageBubble}>
                <Text style={styles.msgUser}>{item.user.name}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          inverted={false}
        />

        {/* Gifts Panel */}
        {showGifts && (
          <View style={styles.giftsPanel}>
            {GIFTS.map((gift) => (
              <TouchableOpacity key={gift.id} style={styles.giftItem}>
                <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                <Text style={styles.giftPrice}>{gift.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={styles.messageInput}
            placeholder="Envoyer un message..."
            placeholderTextColor={Colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity onPress={() => setShowGifts(!showGifts)} style={styles.giftBtn}>
            <Ionicons name="gift" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  headerOverlay: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.pill,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  streamerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.live,
  },
  streamerName: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  streamerTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    marginLeft: 'auto',
  },
  followBtnActive: {
    backgroundColor: Colors.surface,
  },
  followBtnText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  viewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  viewersText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messagesList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    maxWidth: '70%',
  },
  msgUser: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  msgText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  giftsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  giftItem: {
    alignItems: 'center',
    gap: 4,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftPrice: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  giftBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
