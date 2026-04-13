import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Share, Platform, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  url?: string;
}

const SHARE_OPTIONS = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'twitter', name: 'Twitter/X', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'copy', name: 'Copier lien', icon: 'copy-outline', color: Colors.textSecondary },
  { id: 'more', name: 'Plus', icon: 'share-social-outline', color: Colors.primary },
];

export default function ShareSheet({ visible, onClose, title, message, url }: ShareSheetProps) {
  const shareUrl = url || 'https://afriwonder.onrender.com';
  const fullMessage = `${message}\n\n${shareUrl}`;

  const handleShare = async (option: string) => {
    switch (option) {
      case 'copy':
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert('Copié !', 'Lien copié dans le presse-papier');
        onClose();
        break;
      case 'whatsapp':
      case 'facebook':
      case 'twitter':
      case 'more':
      default:
        try {
          await Share.share({ title, message: fullMessage, url: shareUrl });
          onClose();
        } catch {}
        break;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Partager</Text>
          <View style={styles.options}>
            {SHARE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id} style={styles.option} onPress={() => handleShare(opt.id)}>
                <View style={[styles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                  <Ionicons name={opt.icon as any} size={24} color={opt.color} />
                </View>
                <Text style={styles.optionName}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity testID="share-sheet-cancel" style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', textAlign: 'center', paddingVertical: Spacing.lg },
  options: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  option: { alignItems: 'center', gap: 6, width: 64 },
  optionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  optionName: { color: Colors.textSecondary, fontSize: 11 },
  cancelBtn: { marginHorizontal: Spacing.xl, paddingVertical: Spacing.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontSize: FontSizes.md },
});
