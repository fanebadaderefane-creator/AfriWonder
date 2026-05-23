import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import { getAlertMessageForCaughtError } from '../../utils/userFacingError';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export type CallMoreOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  connectionLabel: string;
  connectionBars: 1 | 2 | 3;
  connectionQuality: 'good' | 'fair' | 'poor';
  myRaisedHand: boolean;
  onToggleRaiseHand: () => void;
  onPickReaction: (emoji: string) => void;
  onShareScreen: () => void;
  onOpenMessageComposer: () => void;
  screenShareLoading: boolean;
};

/** Bottom sheet « trois points » pendant un appel (style WhatsApp). */
export function CallMoreOptionsSheet({
  visible,
  onClose,
  connectionLabel,
  connectionBars,
  connectionQuality,
  myRaisedHand,
  onToggleRaiseHand,
  onPickReaction,
  onShareScreen,
  onOpenMessageComposer,
  screenShareLoading,
}: CallMoreOptionsSheetProps) {
  const barColor =
    connectionQuality === 'good' ? '#69F0AE' : connectionQuality === 'fair' ? '#FFD54F' : '#FF8A65';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.moreSheet}>
          <View style={styles.sheetGrab} />
          <View style={styles.sheetEncryptRow}>
            <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.65)" />
            <Text style={styles.sheetEncryptText}>Chiffré de bout en bout</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionRow}>
            {REACTION_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={styles.reactionChip}
                onPress={() => onPickReaction(e)}
              >
                <Text style={styles.reactionEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.sheetRow, myRaisedHand && styles.sheetRowActive]}
            onPress={onToggleRaiseHand}
          >
            <Text style={styles.sheetRowLabel}>Lever la main</Text>
            <Ionicons name="hand-left-outline" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.groupedBox}>
            <TouchableOpacity
              style={[styles.sheetRowGrouped, styles.sheetRowGroupedFirst]}
              onPress={onShareScreen}
              disabled={screenShareLoading}
            >
              <Text style={styles.sheetRowLabel}>Partager l’écran</Text>
              {screenShareLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Ionicons name="phone-portrait-outline" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
            <View style={styles.groupDivider} />
            <TouchableOpacity style={styles.sheetRowGrouped} onPress={onOpenMessageComposer}>
              <Text style={styles.sheetRowLabel}>Envoyer un message</Text>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.qualityRow}>
            <SignalBars bars={connectionBars} color={barColor} />
            <Text style={[styles.sheetQuality, { color: barColor }]}>{connectionLabel}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SignalBars({ bars, color }: { bars: 1 | 2 | 3; color: string }) {
  const h = [10, 14, 18] as const;
  return (
    <View style={styles.signalWrap}>
      {h.map((height, i) => (
        <View
          key={String(i)}
          style={[
            styles.signalBar,
            { height, backgroundColor: i < bars ? color : 'rgba(255,255,255,0.15)' },
          ]}
        />
      ))}
    </View>
  );
}

export type CallDuringMessageModalProps = {
  visible: boolean;
  onClose: () => void;
  otherUserId: string;
  peerName: string;
  onSendSuccess?: () => void;
};

/**
 * Envoi d’un message texte pendant l’appel (sans quitter l’écran d’appel).
 */
export function CallDuringMessageModal({
  visible,
  onClose,
  otherUserId,
  peerName,
  onSendSuccess,
}: CallDuringMessageModalProps) {
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) {
      setText('');
      setError(null);
    }
  }, [visible]);

  const send = React.useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !otherUserId) return;
    setBusy(true);
    setError(null);
    try {
      let conversationId: string | undefined;
      try {
        const r = await apiClient.get(`/messages/conversation/${encodeURIComponent(otherUserId)}`);
        const conv = r.data?.data;
        if (conv && typeof conv.id === 'string') conversationId = conv.id;
      } catch {
        /* thread créé au besoin côté send */
      }
      await apiClient.post('/messages/send', {
        recipientId: otherUserId,
        content: trimmed,
        type: 'text',
        ...(conversationId ? { conversationId } : {}),
      });
      onSendSuccess?.();
      onClose();
    } catch (e: unknown) {
      setError(getAlertMessageForCaughtError(e));
    } finally {
      setBusy(false);
    }
  }, [text, otherUserId, onClose, onSendSuccess]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.msgModalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.msgCard}>
          <Text style={styles.msgTitle}>Message à {peerName}</Text>
          <Text style={styles.msgHint}>L’appel continue. Le message est envoyé dans votre discussion.</Text>
          <TextInput
            style={styles.msgInput}
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            placeholderTextColor="#889095"
            multiline
            maxLength={2000}
            editable={!busy}
          />
          {error ? <Text style={styles.msgError}>{error}</Text> : null}
          <View style={styles.msgActions}>
            <TouchableOpacity onPress={onClose} disabled={busy}>
              <Text style={styles.msgCancel}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void send()} disabled={busy || !text.trim()}>
              {busy ? <ActivityIndicator /> : <Text style={styles.msgSend}>Envoyer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  moreSheet: {
    backgroundColor: '#1c252e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 10,
    zIndex: 2,
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 14,
  },
  sheetEncryptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'center',
  },
  sheetEncryptText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  reactionRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, marginBottom: 12 },
  reactionChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 22 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sheetRowActive: {
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.45)',
  },
  sheetRowLabel: { color: '#FFF', fontSize: 16, flex: 1, paddingRight: 12 },
  groupedBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sheetRowGrouped: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sheetRowGroupedFirst: {},
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 14,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  sheetQuality: {
    fontSize: 13,
    fontWeight: '600',
  },
  signalWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 20,
  },
  signalBar: {
    width: 5,
    borderRadius: 1,
  },
  msgModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  msgCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    zIndex: 2,
  },
  msgTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  msgHint: { fontSize: 13, color: '#5F6368', marginTop: 8, marginBottom: 12 },
  msgInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    textAlignVertical: 'top',
  },
  msgError: { color: '#C62828', fontSize: 13, marginTop: 8 },
  msgActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  msgCancel: { fontSize: 16, color: '#5F6368', fontWeight: '600' },
  msgSend: { fontSize: 16, color: '#128C7E', fontWeight: '700' },
});
