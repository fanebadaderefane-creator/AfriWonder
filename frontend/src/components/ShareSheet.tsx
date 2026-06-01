import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Share,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { toAbsoluteMediaUrl } from '../utils/absoluteMediaUrl';
import { getPublicWebOrigin, getVideoSharePageUrl } from '../config/shareUrls';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { alertDmAccessDenied, isDmAccessDeniedError } from '../messages/dmAccess';

const OFFLINE_VIDEO_META_PREFIX = 'afriwonder_offline_video_';
const SHEET_VIDEO_BG = '#0b111d';

export interface ShareVideoContext {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  username?: string;
  creatorName?: string;
  creatorAvatar?: string;
}

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  url?: string;
  video?: ShareVideoContext | null;
}

type IconSet = 'ion' | 'mci';

const LEGACY_SCROLL_OPTIONS: {
  id: string;
  name: string;
  icon: string;
  iconSet: IconSet;
  color: string;
}[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', iconSet: 'ion', color: '#25D366' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', iconSet: 'ion', color: '#1877F2' },
  { id: 'twitter', name: 'X', icon: 'logo-twitter', iconSet: 'ion', color: '#FFFFFF' },
  { id: 'telegram', name: 'Telegram', icon: 'logo-telegram', iconSet: 'ion', color: '#2AABEE' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', iconSet: 'ion', color: '#E4405F' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', iconSet: 'ion', color: '#FF0000' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', iconSet: 'ion', color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', icon: 'music-note', iconSet: 'mci', color: '#FFFFFF' },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat', iconSet: 'ion', color: '#000000' },
  { id: 'copy', name: 'Copier', icon: 'link', iconSet: 'ion', color: '#6B7280' },
  { id: 'more', name: 'Plus', icon: 'share-social-outline', iconSet: 'ion', color: Colors.primary },
];

const VIDEO_EXTRA_SOCIAL: {
  id: string;
  name: string;
  icon: string;
  iconSet: IconSet;
  color: string;
}[] = [
  { id: 'twitter', name: 'X', icon: 'logo-twitter', iconSet: 'ion', color: '#000000' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', iconSet: 'ion', color: '#E4405F' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', iconSet: 'ion', color: '#FF0000' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', iconSet: 'ion', color: '#0A66C2' },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat', iconSet: 'ion', color: '#FFFC00' },
  { id: 'system_share', name: 'Autres', icon: 'share-outline', iconSet: 'ion', color: '#94A3B8' },
];

function ShareGlyph({
  iconSet,
  icon,
  color,
  size,
}: {
  iconSet: IconSet;
  icon: string;
  color: string;
  size: number;
}) {
  if (iconSet === 'mci') {
    return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
  }
  return <Ionicons name={icon as any} size={size} color={color} />;
}

function displayHandle(v: ShareVideoContext): string {
  const raw = (v.username || v.creatorName || 'afriwonder').trim();
  if (!raw) return '@afriwonder';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function fileExtensionFromUrl(u: string): string {
  try {
    const path = u.split('?')[0] || '';
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    /* ignore */
  }
  return 'mp4';
}

function safeFilenameBase(title: string): string {
  return (title || 'AfriWonder-video').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'video';
}

type SendToFriend = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  profile_image?: string | null;
};

export default function ShareSheet({ visible, onClose, title, message, url, video }: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const isVideoMode = Boolean(video);

  const sharePageUrl = useMemo(() => {
    const u = url?.trim();
    if (u) return u;
    if (video?.id) return getVideoSharePageUrl(video.id);
    return getPublicWebOrigin();
  }, [url, video?.id]);

  const fullMessage = `${message}\n\n${sharePageUrl}`;
  const [downloading, setDownloading] = useState(false);
  const [offlineSaving, setOfflineSaving] = useState(false);

  /** "Send to" — Wonder + Dans ton Wonder dédupliqués (DM dans l'app, comme TikTok). */
  const currentUser = useAuthStore((s) => s.user);
  const [friends, setFriends] = useState<SendToFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<Record<string, 'sending' | 'sent'>>({});

  useEffect(() => {
    if (!visible || !isVideoMode || !currentUser?.id) return;
    let cancelled = false;
    setFriendsLoading(true);
    void (async () => {
      try {
        const [followers, following] = await Promise.all([
          apiClient.get(`/users/${currentUser.id}/followers`, { params: { page: 1, limit: 30 } }).catch(() => null),
          apiClient.get(`/users/${currentUser.id}/following`, { params: { page: 1, limit: 30 } }).catch(() => null),
        ]);
        const a: SendToFriend[] = (followers?.data?.data?.followers || followers?.data?.followers || []) as SendToFriend[];
        const b: SendToFriend[] = (following?.data?.data?.following || following?.data?.following || []) as SendToFriend[];
        const seen = new Set<string>();
        const list: SendToFriend[] = [];
        for (const u of [...a, ...b]) {
          if (!u?.id || seen.has(u.id) || u.id === currentUser.id) continue;
          seen.add(u.id);
          list.push(u);
        }
        if (!cancelled) setFriends(list);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setFriendsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, isVideoMode, currentUser?.id]);

  const sendVideoToFriend = useCallback(
    async (friend: SendToFriend) => {
      const state = sendingTo[friend.id];
      if (state === 'sending' || state === 'sent') return;
      setSendingTo((prev) => ({ ...prev, [friend.id]: 'sending' }));
      try {
        const previewTitle = video?.title?.trim() || message?.trim() || 'AfriWonder';
        const content = `${previewTitle}\n${sharePageUrl}`;
        await apiClient.post('/messages/send', {
          recipientId: friend.id,
          content,
          type: 'text',
        });
        setSendingTo((prev) => ({ ...prev, [friend.id]: 'sent' }));
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setSendingTo((prev) => {
          const next = { ...prev };
          delete next[friend.id];
          return next;
        });
        if (isDmAccessDeniedError(e)) {
          alertDmAccessDenied({ error: e, peerName: friendDisplayName(friend) });
        } else if (status === 403) {
          Alert.alert('Envoi', "Cette personne n'accepte pas les messages privés.");
        } else {
          Alert.alert('Envoi', "Impossible d'envoyer le message. Réessayez.");
        }
      }
    },
    [sendingTo, sharePageUrl, video?.title, message],
  );

  const friendDisplayName = (f: SendToFriend) =>
    (f.full_name || f.username || 'User').toString().trim();

  const openExternal = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch {
      Alert.alert('Partage', 'Impossible d’ouvrir l’application.');
    }
  }, []);

  const handleVideoDownload = useCallback(async () => {
    if (!video?.videoUrl) {
      Alert.alert('Téléchargement', 'URL de vidéo non disponible.');
      return;
    }
    const abs = toAbsoluteMediaUrl(video.videoUrl);
    if (!abs) {
      Alert.alert('Téléchargement', 'URL de vidéo non disponible.');
      return;
    }
    setDownloading(true);
    try {
      const ext = fileExtensionFromUrl(abs);
      const base = safeFilenameBase(video.title);
      const filename = `${base}-afriwonder.${ext}`;

      if (Platform.OS === 'web' && typeof fetch !== 'undefined') {
        const res = await fetch(abs);
        if (!res.ok) throw new Error('network');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        Alert.alert('Téléchargement', 'Enregistrement lancé depuis le navigateur.');
        onClose();
        return;
      }

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error('no_cache');
      const target = `${cacheDir}${filename}`;
      const dl = await FileSystem.downloadAsync(abs, target);
      if (dl.status !== 200) throw new Error('status');

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: ext === 'webm' ? 'video/webm' : 'video/mp4',
          dialogTitle: video.title || 'Vidéo AfriWonder',
          UTI: 'public.mpeg-4',
        });
        Alert.alert(
          'Partage',
          'Choisissez « Enregistrer dans la galerie » ou « Photos » si votre appareil le propose.'
        );
      } else {
        Alert.alert('Enregistré', 'Fichier mis en cache. Partage système indisponible sur cet appareil.');
      }
      onClose();
    } catch (e) {
      console.warn('[ShareSheet] download', e);
      Alert.alert('Téléchargement', 'Impossible d’enregistrer la vidéo. Réessayez.');
    } finally {
      setDownloading(false);
    }
  }, [video, onClose]);

  const handleSaveForOffline = useCallback(async () => {
    if (!video?.videoUrl) {
      Alert.alert('Hors ligne', 'URL de vidéo non disponible.');
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Hors ligne', 'L’enregistrement dans l’app pour consultation hors ligne est disponible sur mobile.');
      return;
    }
    const abs = toAbsoluteMediaUrl(video.videoUrl);
    if (!abs) {
      Alert.alert('Hors ligne', 'URL de vidéo non disponible.');
      return;
    }
    const doc = FileSystem.documentDirectory;
    if (!doc) {
      Alert.alert('Hors ligne', 'Stockage local non disponible.');
      return;
    }
    setOfflineSaving(true);
    try {
      const ext = fileExtensionFromUrl(abs);
      const dir = `${doc}offline_videos`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
      const dest = `${dir}/${video.id}.${ext}`;
      const dl = await FileSystem.downloadAsync(abs, dest);
      if (dl.status !== 200) throw new Error('status');
      await AsyncStorage.setItem(
        OFFLINE_VIDEO_META_PREFIX + video.id,
        JSON.stringify({
          localUri: dl.uri,
          title: video.title || 'Vidéo',
          thumbnailUrl: video.thumbnailUrl,
          creatorName: video.creatorName,
          username: video.username,
          savedAt: Date.now(),
        })
      );
      Alert.alert('Hors ligne', 'Vidéo enregistrée pour consultation hors ligne dans l’app.');
      onClose();
    } catch (e) {
      console.warn('[ShareSheet] offline save', e);
      Alert.alert('Hors ligne', 'Impossible de télécharger la vidéo. Réessayez.');
    } finally {
      setOfflineSaving(false);
    }
  }, [video, onClose]);

  const handleChannel = useCallback(
    async (channel: string, opts?: { closeAfterNativeShare?: boolean }) => {
      const pageUrl = sharePageUrl;
      const closeAfterShare = opts?.closeAfterNativeShare ?? true;

      switch (channel) {
        case 'whatsapp': {
          const text = `Regarde cette vidéo !\n\n${pageUrl}`;
          await openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
          break;
        }
        case 'telegram':
          await openExternal(
            `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent('Regarde cette vidéo !')}`
          );
          break;
        case 'facebook':
          await openExternal(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent('Regarde cette vidéo !')}`
          );
          break;
        case 'twitter':
        case 'x': {
          await openExternal(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent('Regarde cette vidéo !')}`
          );
          break;
        }
        case 'linkedin':
          await openExternal(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`);
          break;
        case 'tiktok': {
          await Clipboard.setStringAsync(pageUrl);
          Alert.alert('TikTok', 'Lien copié. Collez-le dans TikTok.');
          await openExternal('https://www.tiktok.com/');
          break;
        }
        case 'instagram': {
          await Clipboard.setStringAsync(pageUrl);
          Alert.alert('Instagram', 'Lien copié. Collez-le dans une story, une note ou un message.');
          try {
            const ig = 'instagram://app';
            if (await Linking.canOpenURL(ig)) await Linking.openURL(ig);
            else await Linking.openURL('https://www.instagram.com/');
          } catch {
            await openExternal('https://www.instagram.com/');
          }
          break;
        }
        case 'youtube': {
          await Clipboard.setStringAsync(pageUrl);
          Alert.alert('YouTube', 'Lien copié. Vous pouvez le coller dans un commentaire ou une description.');
          await openExternal('https://www.youtube.com/');
          break;
        }
        case 'snapchat': {
          await Clipboard.setStringAsync(pageUrl);
          Alert.alert('Snapchat', 'Lien copié. Collez-le dans un snap ou un chat.');
          try {
            const sc = 'snapchat://';
            if (await Linking.canOpenURL(sc)) await Linking.openURL(sc);
            else await openExternal('https://www.snapchat.com/');
          } catch {
            await openExternal('https://www.snapchat.com/');
          }
          break;
        }
        case 'copy': {
          await Clipboard.setStringAsync(pageUrl);
          Alert.alert('Copié !', 'Lien copié dans le presse-papier');
          onClose();
          break;
        }
        case 'download':
          await handleVideoDownload();
          break;
        case 'offline':
          await handleSaveForOffline();
          break;
        case 'bluetooth':
        case 'nearby':
          Alert.alert('Partage', 'Le partage Bluetooth et Wi‑Fi Direct ne sont pas disponibles sur cet appareil.');
          onClose();
          break;
        case 'more':
        case 'system_share': {
          try {
            await Share.share({
              title,
              message: fullMessage,
              ...(Platform.OS === 'ios' ? { url: pageUrl } : {}),
            });
            if (closeAfterShare) onClose();
          } catch {
            /* annulation */
          }
          break;
        }
        default:
          break;
      }
    },
    [sharePageUrl, title, fullMessage, openExternal, onClose, handleVideoDownload, handleSaveForOffline]
  );

  const handleLegacyPress = useCallback(
    async (id: string) => {
      if (id === 'copy') {
        await handleChannel('copy');
        return;
      }
      if (id === 'more') {
        await handleChannel('more', { closeAfterNativeShare: true });
        return;
      }
      await handleChannel(id, { closeAfterNativeShare: false });
    },
    [handleChannel]
  );

  const previewAvatarUri = toAbsoluteMediaUrl(
    video?.creatorAvatar?.trim() ? video.creatorAvatar : video?.thumbnailUrl || ''
  );

  if (isVideoMode && video) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
          <View
            style={[styles.sheetVideo, { paddingBottom: Math.max(insets.bottom, 16) + 12, backgroundColor: SHEET_VIDEO_BG }]}
          >
            <View style={styles.handleLight} />
            <View style={styles.videoHeaderRow}>
              <View style={styles.videoHeaderSpacer} />
              <Text style={styles.videoTitleCenter}>Partager</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.videoCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.videoScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sendToBlock}>
                <View style={styles.sendToHeader}>
                  <Text style={styles.sendToTitle}>Send to</Text>
                </View>
                {friendsLoading ? (
                  <ActivityIndicator color="#FFF" style={{ paddingVertical: 14 }} />
                ) : friends.length === 0 ? (
                  <Text style={styles.sendToEmpty}>
                    Follow people to send them videos directly inside AfriWonder.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sendToRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {friends.map((f) => {
                      const state = sendingTo[f.id];
                      const avatar = toAbsoluteMediaUrl(f.profile_image || '');
                      return (
                        <TouchableOpacity
                          key={f.id}
                          activeOpacity={0.85}
                          style={styles.sendToItem}
                          onPress={() => void sendVideoToFriend(f)}
                          disabled={state === 'sending' || state === 'sent'}
                          accessibilityLabel={`Send to ${friendDisplayName(f)}`}
                        >
                          <View style={styles.sendToAvatarWrap}>
                            {avatar ? (
                              <Image source={{ uri: avatar }} style={styles.sendToAvatar} />
                            ) : (
                              <View style={[styles.sendToAvatar, styles.sendToAvatarFallback]}>
                                <Text style={styles.sendToAvatarLetter}>
                                  {friendDisplayName(f).charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            {state === 'sent' ? (
                              <View style={styles.sendToBadgeSent}>
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                              </View>
                            ) : null}
                            {state === 'sending' ? (
                              <View style={styles.sendToBadgeSending}>
                                <ActivityIndicator color="#FFF" size="small" />
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.sendToName} numberOfLines={1}>
                            {friendDisplayName(f)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewThumbWrap}>
                  {previewAvatarUri ? (
                    <Image source={{ uri: previewAvatarUri }} style={styles.previewThumb} />
                  ) : (
                    <View style={styles.previewThumbPlaceholder} />
                  )}
                </View>
                <View style={styles.previewTextCol}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {video.title || 'Vidéo AfriWonder'}
                  </Text>
                  <Text style={styles.previewHandle} numberOfLines={1}>
                    {displayHandle(video)}
                  </Text>
                  <Text style={styles.previewHint}>
                    Liens vers la page web AfriWonder (même adresse que la PWA). Partage réseaux + hors ligne.
                  </Text>
                </View>
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('whatsapp')}
                  accessibilityLabel="WhatsApp"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#25D366' }]}>
                    <Ionicons name="logo-whatsapp" size={26} color="#fff" />
                  </View>
                  <Text style={styles.socialLabel}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('telegram')}
                  accessibilityLabel="Telegram"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#2AABEE' }]}>
                    <MaterialCommunityIcons name={'telegram' as any} size={26} color="#fff" />
                  </View>
                  <Text style={styles.socialLabel}>Telegram</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('facebook')}
                  accessibilityLabel="Facebook"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#1877F2' }]}>
                    <Ionicons name="logo-facebook" size={26} color="#fff" />
                  </View>
                  <Text style={styles.socialLabel}>Facebook</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('tiktok')}
                  accessibilityLabel="TikTok"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#000000' }]}>
                    <MaterialCommunityIcons name="music-note" size={26} color="#fff" />
                  </View>
                  <Text style={styles.socialLabel}>TikTok</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('copy')}
                  accessibilityLabel="Copier le lien"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#6B7280' }]}>
                    <Ionicons name="link" size={24} color="#fff" />
                  </View>
                  <Text style={styles.socialLabel}>Copier lien</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialItem}
                  onPress={() => void handleChannel('download')}
                  disabled={downloading}
                  accessibilityLabel="Télécharger"
                >
                  <View style={[styles.socialCircle, { backgroundColor: '#A855F7' }]}>
                    {downloading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="download-outline" size={26} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.socialLabel}>{downloading ? 'Chargement…' : 'Télécharger'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.extraSocialTitle}>Autres réseaux</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.extraSocialScroll}
                keyboardShouldPersistTaps="handled"
              >
                {VIDEO_EXTRA_SOCIAL.map((opt) => {
                  const iconColor =
                    opt.id === 'twitter' || opt.id === 'snapchat'
                      ? opt.id === 'snapchat'
                        ? '#0f172a'
                        : '#fff'
                      : '#fff';
                  const circleBg =
                    opt.id === 'twitter'
                      ? '#0f172a'
                      : opt.id === 'snapchat'
                        ? '#FFFC00'
                        : opt.color;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.extraSocialChip}
                      onPress={() => void handleChannel(opt.id === 'system_share' ? 'system_share' : opt.id)}
                      accessibilityLabel={opt.name}
                    >
                      <View style={[styles.socialCircle, { backgroundColor: circleBg }]}>
                        <ShareGlyph iconSet={opt.iconSet} icon={opt.icon} color={iconColor} size={opt.id === 'snapchat' ? 24 : 26} />
                      </View>
                      <Text style={styles.socialLabel}>{opt.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.offlineSection}>
                <View style={styles.offlineTitleRow}>
                  <Ionicons name="people-outline" size={18} color="#93C5FD" />
                  <Text style={styles.offlineTitle}>Partage sans internet</Text>
                </View>
                <View style={styles.offlineGrid}>
                  <TouchableOpacity
                    style={styles.offlineTile}
                    onPress={() => void handleChannel('bluetooth')}
                    accessibilityLabel="Bluetooth"
                  >
                    <View style={[styles.offlineIconCircle, { backgroundColor: '#6366F1' }]}>
                      <Ionicons name="bluetooth" size={22} color="#fff" />
                    </View>
                    <View style={styles.offlineTileText}>
                      <Text style={styles.offlineTileTitle}>Bluetooth</Text>
                      <Text style={styles.offlineTileSub}>Sans data</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.offlineTile}
                    onPress={() => void handleChannel('nearby')}
                    accessibilityLabel="WiFi Direct"
                  >
                    <View style={[styles.offlineIconCircle, { backgroundColor: '#06B6D4' }]}>
                      <Ionicons name="wifi" size={22} color="#fff" />
                    </View>
                    <View style={styles.offlineTileText}>
                      <Text style={styles.offlineTileTitle}>WiFi Direct</Text>
                      <Text style={styles.offlineTileSub}>Proches de vous</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.offlineTile, styles.offlineTileFull]}
                    onPress={() => void handleChannel('offline')}
                    disabled={offlineSaving}
                    accessibilityLabel="Enregistrer pour hors ligne"
                  >
                    <View style={[styles.offlineIconCircle, { backgroundColor: '#3B82F6' }]}>
                      {offlineSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="save-outline" size={22} color="#fff" />
                      )}
                    </View>
                    <View style={styles.offlineTileText}>
                      <Text style={styles.offlineTileTitle}>Pour hors ligne</Text>
                      <Text style={styles.offlineTileSub}>Dans l’app</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Partager</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legacyScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {LEGACY_SCROLL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.legacyOption}
                onPress={() => void handleLegacyPress(opt.id)}
                testID={opt.id === 'copy' ? 'share-sheet-copy' : undefined}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor:
                        opt.id === 'twitter' ? 'rgba(15,23,42,0.85)' : opt.id === 'snapchat' ? 'rgba(255,252,0,0.35)' : opt.color + '20',
                    },
                  ]}
                >
                  <ShareGlyph
                    iconSet={opt.iconSet}
                    icon={opt.icon}
                    color={opt.id === 'twitter' ? '#fff' : opt.id === 'snapchat' ? '#0f172a' : opt.color}
                    size={24}
                  />
                </View>
                <Text style={styles.optionName} numberOfLines={1}>
                  {opt.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity testID="share-sheet-cancel" style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', textAlign: 'center', paddingVertical: Spacing.lg },
  legacyScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  legacyOption: { alignItems: 'center', width: 72, marginHorizontal: 4 },
  optionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  optionName: { color: Colors.textSecondary, fontSize: 10, marginTop: 6, textAlign: 'center', maxWidth: 72 },
  cancelBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelText: { color: Colors.textSecondary, fontSize: FontSizes.md },

  sheetVideo: {
    zIndex: 1,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '88%',
  },
  handleLight: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  videoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  videoHeaderSpacer: { width: 40 },
  videoTitleCenter: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  videoCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  videoScroll: { paddingHorizontal: Spacing.lg },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.lg,
  },
  previewThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewThumb: { width: '100%', height: '100%' },
  previewThumbPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(30,58,138,0.5)',
    minHeight: 64,
  },
  previewTextCol: { flex: 1, minWidth: 0 },
  previewTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '700' },
  previewHandle: { color: 'rgba(255,255,255,0.48)', fontSize: FontSizes.xs, marginTop: 4 },
  previewHint: { color: 'rgba(255,255,255,0.56)', fontSize: 11, marginTop: Spacing.sm, lineHeight: 15 },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
    marginBottom: Spacing.md,
  },
  extraSocialTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extraSocialScroll: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  extraSocialChip: { alignItems: 'center', width: 72 },
  socialItem: { width: '33.33%', alignItems: 'center', marginBottom: Spacing.sm },
  socialCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  socialLabel: { color: 'rgba(255,255,255,0.62)', fontSize: FontSizes.xs, textAlign: 'center' },
  offlineSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  offlineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  offlineTitle: { color: 'rgba(255,255,255,0.78)', fontSize: FontSizes.sm, fontWeight: '600' },
  offlineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  offlineTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '47%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  offlineTileFull: { width: '100%' },
  offlineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTileText: { flex: 1, minWidth: 0 },
  offlineTileTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '600' },
  offlineTileSub: { color: 'rgba(255,255,255,0.42)', fontSize: FontSizes.xs, marginTop: 2 },

  /* Send to (followers + following dans le share sheet vidéo) */
  sendToBlock: {
    paddingTop: 4,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.md,
  },
  sendToHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
  },
  sendToTitle: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
  sendToEmpty: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSizes.xs,
    paddingVertical: 12,
  },
  sendToRow: { gap: 14, paddingRight: Spacing.lg },
  sendToItem: { width: 64, alignItems: 'center' },
  sendToAvatarWrap: { width: 56, height: 56, borderRadius: 28, overflow: 'visible', position: 'relative' },
  sendToAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sendToAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sendToAvatarLetter: { color: '#FFF', fontWeight: '800', fontSize: 18 },
  sendToBadgeSent: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#22C55E',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SHEET_VIDEO_BG,
  },
  sendToBadgeSending: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: SHEET_VIDEO_BG,
  },
  sendToName: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 64,
  },
});
