import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type MediaViewerItem = {
  id: string;
  uri: string;
  type: 'image' | 'video';
  senderLabel: string;
  timeLabel: string;
  caption?: string;
  isMine: boolean;
  starred?: boolean;
};

export type MediaViewerModalProps = {
  item: MediaViewerItem | null;
  onClose: () => void;
  onToggleStar: (item: MediaViewerItem) => void;
  onDelete: (item: MediaViewerItem) => void;
  onShowInChat: (item: MediaViewerItem) => void;
  onSetAsProfilePhoto: (item: MediaViewerItem) => void;
};

export type MediaViewerModalResolvedProps = Omit<MediaViewerModalProps, 'item'> & { item: MediaViewerItem };

export function useMediaViewerActions(item: MediaViewerItem) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [displayUri, setDisplayUri] = useState(item.uri);

  useEffect(() => {
    setDisplayUri(item.uri);
    setMenuOpen(false);
  }, [item.id, item.uri]);

  const ensureLocalFile = useCallback(async (): Promise<string | null> => {
    if (!item.uri) return null;
    if (item.uri.startsWith('file://') || item.uri.startsWith('data:')) return item.uri;
    const dir = cacheDirectory;
    if (!dir) return item.uri;
    const ext = (item.uri.split('?')[0].split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const dest = `${dir}afw-view-${item.id}.${ext}`;
    try {
      const res = await downloadAsync(item.uri, dest);
      return res.uri;
    } catch {
      return item.uri;
    }
  }, [item.uri, item.id]);

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      const local = await ensureLocalFile();
      if (local && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(local);
      } else {
        Alert.alert('Partage', 'Partage indisponible sur cet appareil.');
      }
    } catch {
      Alert.alert('Partage', "Impossible de partager ce média.");
    } finally {
      setBusy(false);
    }
  }, [ensureLocalFile]);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try {
      const local = await ensureLocalFile();
      if (!local) throw new Error('no-file');
      if (Platform.OS === 'web') {
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(local);
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Autorisation requise', "Autorisez l'accès à la galerie pour enregistrer.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(local);
      Alert.alert('Enregistré', 'Média enregistré dans votre galerie.');
    } catch {
      Alert.alert('Téléchargement', "Impossible d'enregistrer ce média.");
    } finally {
      setBusy(false);
    }
  }, [ensureLocalFile]);

  const handleRotate = useCallback(async () => {
    if (item.type !== 'image') return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const local = await ensureLocalFile();
      if (!local) return;
      const out = await ImageManipulator.manipulateAsync(local, [{ rotate: 90 }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setDisplayUri(out.uri);
    } catch {
      Alert.alert('Pivoter', 'Rotation impossible.');
    } finally {
      setBusy(false);
    }
  }, [item.type, ensureLocalFile]);

  return {
    menuOpen,
    setMenuOpen,
    busy,
    displayUri,
    handleShare,
    handleDownload,
    handleRotate,
  };
}

export function MediaViewerModalChrome({
  item,
  onClose,
  onToggleStar,
  onDelete,
  onShowInChat,
  onSetAsProfilePhoto,
  renderMedia,
}: MediaViewerModalResolvedProps & { renderMedia: (displayUri: string) => React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const {
    menuOpen,
    setMenuOpen,
    busy,
    displayUri,
    handleShare,
    handleDownload,
    handleRotate,
  } = useMediaViewerActions(item);

  const MENU_ITEMS: { icon: string; label: string; action: () => void; destructive?: boolean }[] = [
    { icon: 'share-social-outline', label: 'Partager', action: () => { setMenuOpen(false); void handleShare(); } },
    { icon: item.starred ? 'star' : 'star-outline', label: 'Important', action: () => { setMenuOpen(false); onToggleStar(item); } },
    { icon: 'chatbubble-ellipses-outline', label: 'Afficher dans la discussion', action: () => { setMenuOpen(false); onShowInChat(item); } },
    ...(item.type === 'image' ? [{ icon: 'sync-outline', label: 'Pivoter', action: () => void handleRotate() }] : []),
    ...(item.type === 'image'
      ? [{
          icon: 'person-circle-outline',
          label: 'Définir comme photo de profil',
          action: () => { setMenuOpen(false); onSetAsProfilePhoto(item); },
        }]
      : []),
    { icon: 'trash-outline', label: 'Supprimer', action: () => { setMenuOpen(false); onDelete(item); }, destructive: true },
  ];

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={mediaViewerStyles.root}>
        <View style={[mediaViewerStyles.topBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={onClose} style={mediaViewerStyles.iconHit} accessibilityLabel="Fermer">
            <Ionicons name="arrow-back" size={26} color="#FFF" />
          </TouchableOpacity>
          <View style={mediaViewerStyles.titleWrap}>
            <Text style={mediaViewerStyles.title} numberOfLines={1}>{item.senderLabel}</Text>
            <Text style={mediaViewerStyles.subtitle} numberOfLines={1}>{item.timeLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => void handleDownload()} style={mediaViewerStyles.iconHit} accessibilityLabel="Télécharger">
            <Ionicons name="download-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void handleShare()} style={mediaViewerStyles.iconHit} accessibilityLabel="Partager">
            <Ionicons name="share-social-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} style={mediaViewerStyles.iconHit} accessibilityLabel="Plus d'options">
            <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {renderMedia(displayUri || item.uri)}

        {item.caption && item.caption !== 'Photo' && item.caption !== 'Video' ? (
          <View style={[mediaViewerStyles.captionBar, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={mediaViewerStyles.captionText}>{item.caption}</Text>
          </View>
        ) : null}

        {busy ? (
          <View style={mediaViewerStyles.busyOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        ) : null}

        {menuOpen ? (
          <>
            <Pressable style={mediaViewerStyles.menuBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={[mediaViewerStyles.menu, { top: insets.top + 48 }]}>
              {MENU_ITEMS.map((mi) => (
                <TouchableOpacity key={mi.label} style={mediaViewerStyles.menuRow} onPress={mi.action}>
                  <Ionicons
                    name={mi.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={mi.destructive ? '#FF4D4F' : '#222'}
                  />
                  <Text style={[mediaViewerStyles.menuLabel, mi.destructive && mediaViewerStyles.menuLabelDanger]}>{mi.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

export const mediaViewerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  gestureRoot: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconHit: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, paddingHorizontal: 6 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  imageWrap: { flex: 1, width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captionText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 15 },
  menu: {
    position: 'absolute',
    right: 8,
    zIndex: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 240,
    ...(Platform.OS === 'android' ? { elevation: 8 } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    }),
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 14 },
  menuLabel: { fontSize: 15, color: '#222' },
  menuLabelDanger: { color: '#FF4D4F' },
});
