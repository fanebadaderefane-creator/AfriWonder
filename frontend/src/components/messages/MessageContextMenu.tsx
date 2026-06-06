import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

export const MESSAGE_QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export type MessageContextMenuMessage = {
  id: string;
  isMine: boolean;
  pinned?: boolean;
  starred?: boolean;
  deleted?: boolean;
  type?: string;
  transcription?: string;
};

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function MenuRow({ icon, label, onPress, destructive }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.65}>
      <Ionicons name={icon} size={20} color={destructive ? '#E53935' : '#54656F'} />
      <Text style={[styles.menuRowText, destructive && styles.menuRowTextDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Petit chevron ▼ en haut à droite de la bulle — visible au survol / toucher (WhatsApp Web). */
export function MessageBubbleMenuChevron({
  onPress,
  isMine,
  visible = false,
  onPointerDown,
}: {
  onPress: () => void;
  isMine: boolean;
  visible?: boolean;
  /** Garde le chevron visible quand on vise le bouton (annule un masquage différé). */
  onPointerDown?: () => void;
}) {
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    onPress();
  };

  const handlePointerDown = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    onPointerDown?.();
  };

  if (!visible) return null;

  return (
    <Pressable
      style={[styles.chevronBtn, isMine ? styles.chevronMine : styles.chevronTheirs]}
      onPress={handlePress}
      onPressIn={handlePointerDown}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Options du message"
      accessibilityRole="button"
    >
      <Ionicons name="chevron-down" size={15} color="rgba(255,255,255,0.58)" />
    </Pressable>
  );
}

type MessageContextMenuProps = {
  visible: boolean;
  message: MessageContextMenuMessage | null;
  onClose: () => void;
  onEmoji: (emoji: string) => void;
  onMoreEmojis: () => void;
  onReply: () => void;
  onPin: () => void;
  onStar: () => void;
  onSelect: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onTranscribe?: () => void;
};

export function MessageContextMenu({
  visible,
  message,
  onClose,
  onEmoji,
  onMoreEmojis,
  onReply,
  onPin,
  onStar,
  onSelect,
  onDeleteForMe,
  onDeleteForEveryone,
  onCopy,
  onForward,
  onTranscribe,
}: MessageContextMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!visible) setDeleteOpen(false);
  }, [visible]);

  if (!message) return null;

  const isVoice = message.type === 'voice' || message.type === 'audio';
  const pinLabel = message.pinned ? 'Désépingler' : 'Épingler';
  const starLabel = message.starred ? 'Retirer des importants' : 'Marquer comme important';
  const isDeletedPlaceholder = Boolean(message.deleted);

  const closeAnd = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {isDeletedPlaceholder ? (
            <MenuRow
              icon="trash-outline"
              label="Supprimer pour moi"
              destructive
              onPress={() => closeAnd(onDeleteForMe)}
            />
          ) : !deleteOpen ? (
            <>
              <View style={styles.emojiRow}>
                {MESSAGE_QUICK_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => closeAnd(() => onEmoji(emoji))}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.emojiBtn} onPress={() => closeAnd(onMoreEmojis)}>
                  <Ionicons name="add" size={22} color="#54656F" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <MenuRow icon="arrow-undo-outline" label="Répondre" onPress={() => closeAnd(onReply)} />
              <MenuRow icon="pin-outline" label={pinLabel} onPress={() => closeAnd(onPin)} />
              <MenuRow icon="star-outline" label={starLabel} onPress={() => closeAnd(onStar)} />
              <MenuRow icon="checkbox-outline" label="Sélectionner" onPress={() => closeAnd(onSelect)} />
              {isVoice && onTranscribe ? (
                <MenuRow
                  icon="sparkles-outline"
                  label={message.transcription ? 'Voir la transcription' : 'Transcrire (IA)'}
                  onPress={() => closeAnd(onTranscribe)}
                />
              ) : null}
              {onCopy ? (
                <MenuRow icon="copy-outline" label="Copier" onPress={() => closeAnd(onCopy)} />
              ) : null}
              {onForward ? (
                <MenuRow icon="arrow-redo-outline" label="Transférer" onPress={() => closeAnd(onForward)} />
              ) : null}
              <MenuRow
                icon="trash-outline"
                label="Supprimer"
                destructive
                onPress={() => setDeleteOpen(true)}
              />
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.deleteBackRow} onPress={() => setDeleteOpen(false)}>
                <Ionicons name="arrow-back" size={18} color="#54656F" />
                <Text style={styles.deleteBackText}>Supprimer</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <MenuRow
                icon="person-outline"
                label="Supprimer pour moi"
                onPress={() => closeAnd(onDeleteForMe)}
              />
              {message.isMine && onDeleteForEveryone ? (
                <MenuRow
                  icon="people-outline"
                  label="Supprimer pour tout le monde"
                  destructive
                  onPress={() => closeAnd(onDeleteForEveryone)}
                />
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: Math.min(SCREEN_W * 0.82, 300),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 24 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E9EDEF' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuRowText: { color: '#111B21', fontSize: 15 },
  menuRowTextDestructive: { color: '#E53935' },
  deleteBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteBackText: { color: '#111B21', fontSize: 15, fontWeight: '600' },
  chevronBtn: {
    position: 'absolute',
    top: 2,
    zIndex: 3,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronMine: { right: 4 },
  chevronTheirs: { right: 4 },
});
