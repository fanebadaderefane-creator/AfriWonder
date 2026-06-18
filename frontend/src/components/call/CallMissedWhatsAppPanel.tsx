import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CallMissedWhatsAppPanelProps = {
  peerName: string;
  peerAvatarUri: string;
  busy?: boolean;
  onCancel: () => void;
  onVideoNote: () => void;
  onRecall: () => void;
};

/** Écran « Sans réponse » — parité WhatsApp (capture 3). */
export function CallMissedWhatsAppPanel({
  peerName,
  peerAvatarUri,
  busy = false,
  onCancel,
  onVideoNote,
  onRecall,
}: CallMissedWhatsAppPanelProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Image source={{ uri: peerAvatarUri }} style={styles.bgImage} blurRadius={28} />
      <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={[styles.center, { paddingTop: insets.top + 48 }]}>
        <Text style={styles.name}>{peerName}</Text>
        <Text style={styles.status}>Sans réponse</Text>
        <Image source={{ uri: peerAvatarUri }} style={styles.avatar} />
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 28 }]}>
        <TouchableOpacity
          style={styles.actionCol}
          onPress={onCancel}
          disabled={busy}
          accessibilityLabel="Annuler"
        >
          <View style={[styles.actionBtn, styles.actionBtnLight]}>
            <Ionicons name="close" size={28} color="#111" />
          </View>
          <Text style={styles.actionLabel}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCol}
          onPress={onVideoNote}
          disabled={busy}
          accessibilityLabel="Enregistrer une note vidéo"
        >
          <View style={[styles.actionBtn, styles.actionBtnDark]}>
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="camera" size={26} color="#FFF" />
            )}
          </View>
          <Text style={styles.actionLabel}>Enregistrer{'\n'}une note vidéo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCol}
          onPress={onRecall}
          disabled={busy}
          accessibilityLabel="Rappeler"
        >
          <View style={[styles.actionBtn, styles.actionBtnGreen]}>
            <Ionicons name="videocam" size={26} color="#FFF" />
          </View>
          <Text style={styles.actionLabel}>Rappeler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a1a' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.85 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  name: { color: '#FFF', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  status: { color: 'rgba(255,255,255,0.75)', fontSize: 18, marginBottom: 28 },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  actionCol: { alignItems: 'center', width: 110 },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionBtnLight: { backgroundColor: '#FFF' },
  actionBtnDark: { backgroundColor: 'rgba(40,40,40,0.85)' },
  actionBtnGreen: { backgroundColor: '#25D366' },
  actionLabel: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
