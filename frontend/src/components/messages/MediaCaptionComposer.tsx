import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

export type MediaComposerDraft = {
  uri: string;
  isVideo: boolean;
  fileName?: string;
  mimeType?: string;
};

type Props = {
  draft: MediaComposerDraft | null;
  /** Envoi confirmé avec la légende saisie (peut être vide). */
  onSend: (draft: MediaComposerDraft, caption: string) => void;
  onCancel: () => void;
};

/** Aperçu plein écran + champ « légende » avant l'envoi d'une photo/vidéo (façon WhatsApp). */
export function MediaCaptionComposer({ draft, onSend, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');

  useEffect(() => {
    setCaption('');
  }, [draft?.uri]);

  if (!draft) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={onCancel} style={styles.iconHit} accessibilityLabel="Annuler">
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.preview}>
          {draft.isVideo ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.9)" />
              <Text style={styles.videoText}>Vidéo prête à envoyer</Text>
            </View>
          ) : (
            <Image source={{ uri: draft.uri }} style={styles.image} contentFit="contain" />
          )}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ajouter une légende…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => onSend(draft, caption.trim())}
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="send" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, paddingHorizontal: 6, paddingBottom: 8 },
  iconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: '100%' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  videoText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  inputRow: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    maxHeight: 120,
  },
  input: { color: '#FFF', fontSize: 16 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
