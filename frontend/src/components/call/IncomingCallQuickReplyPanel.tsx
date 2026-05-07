import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';

export const INCOMING_CALL_QUICK_REPLIES = [
  'Je ne suis pas disponible. Ça va ?',
  'Je vous rappelle tout de suite.',
  'Je vous rappellerai plus tard.',
  'Je ne suis pas disponible. Pouvez-vous rappeler plus tard ?',
] as const;

type Props = {
  showQuickReplies: boolean;
  showCustomMessage: boolean;
  sendingReply: boolean;
  customText: string;
  onChangeCustomText: (t: string) => void;
  onCloseQuick: () => void;
  onPickPreset: (line: string) => void;
  onOpenCustom: () => void;
  onCloseCustom: () => void;
  onSendCustom: () => void;
};

export function IncomingCallQuickReplyPanel({
  showQuickReplies,
  showCustomMessage,
  sendingReply,
  customText,
  onChangeCustomText,
  onCloseQuick,
  onPickPreset,
  onOpenCustom,
  onCloseCustom,
  onSendCustom,
}: Props) {
  return (
    <>
      {showQuickReplies && !showCustomMessage && (
        <View style={styles.sheetScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseQuick} />
          <View style={styles.quickCard}>
            <Text style={styles.quickTitle}>Réponse rapide</Text>
            {INCOMING_CALL_QUICK_REPLIES.map((line) => (
              <TouchableOpacity
                key={line}
                style={styles.quickRow}
                onPress={() => onPickPreset(line)}
                disabled={sendingReply}
              >
                <Text style={styles.quickText}>{line}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.quickRow}
              onPress={onOpenCustom}
              disabled={sendingReply}
            >
              <Text style={[styles.quickText, styles.quickCustom]}>Message personnalisé…</Text>
            </TouchableOpacity>
            {sendingReply ? (
              <ActivityIndicator color="#128C7E" style={{ marginTop: 12 }} />
            ) : null}
          </View>
        </View>
      )}

      {showCustomMessage && (
        <View style={styles.customOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseCustom} />
          <View style={styles.customCard}>
            <Text style={styles.quickTitle}>Votre message</Text>
            <TextInput
              style={styles.customInput}
              value={customText}
              onChangeText={onChangeCustomText}
              placeholder="Écrivez un message…"
              placeholderTextColor="#889095"
              multiline
              maxLength={2000}
              editable={!sendingReply}
            />
            <View style={styles.customActions}>
              <TouchableOpacity
                onPress={() => {
                  onCloseCustom();
                  onChangeCustomText('');
                }}
              >
                <Text style={styles.linkBtn}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSendCustom} disabled={sendingReply || !customText.trim()}>
                {sendingReply ? (
                  <ActivityIndicator />
                ) : (
                  <Text
                    style={[
                      styles.linkBtn,
                      styles.linkPrimary,
                      !customText.trim() && styles.linkDisabled,
                    ]}
                  >
                    Envoyer
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  quickCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 2,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EAED',
  },
  quickText: {
    fontSize: 16,
    color: '#202124',
  },
  quickCustom: {
    color: '#128C7E',
    fontWeight: '600',
  },
  customOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCard: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    zIndex: 2,
  },
  customInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    textAlignVertical: 'top',
  },
  customActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkBtn: {
    fontSize: 16,
    color: '#5F6368',
    fontWeight: '600',
  },
  linkPrimary: {
    color: '#128C7E',
  },
  linkDisabled: {
    opacity: 0.4,
  },
});
