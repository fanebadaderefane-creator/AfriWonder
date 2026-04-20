import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  FlatList,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/theme/colors';
import { SmartThumbnail } from '../../src/components/SmartThumbnail';
import { useAuthStore } from '../../src/store/authStore';
import { goBackOrFallback } from '../../src/utils/goBack';

type PlaylistItem = {
  id: string;
  position?: number;
  video?: any;
};

type Playlist = {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  videos_count?: number | null;
  user?: { id: string; username?: string | null };
  items?: PlaylistItem[];
};

function creatorLine(v: any): string {
  if (!v) return '';
  const u = v.creator;
  if (u?.username) return String(u.username);
  if (u?.full_name) return String(u.full_name);
  if (typeof v.creator_name === 'string' && v.creator_name) return v.creator_name;
  return '';
}

/** Sur le web, `Alert.alert` multi-boutons est souvent inopérant — on utilise `window.confirm` ou une modale. */
function confirmRemoveVideo(onConfirm: () => void, title: string) {
  const msg = `Retirer « ${title.slice(0, 60)} » de la playlist ?`;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(msg)) onConfirm();
    return;
  }
  Alert.alert('Retirer de la playlist', msg, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Retirer', style: 'destructive', onPress: onConfirm },
  ]);
}

function confirmDeletePlaylist(onConfirm: () => void) {
  const msg = 'Supprimer cette playlist ? Cette action est définitive.';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(msg)) onConfirm();
    return;
  }
  Alert.alert('Supprimer la playlist', 'Cette action est définitive.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function PlaylistScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const playlistId = (Array.isArray(id) ? id[0] : id) || '';
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [loadingMyVideos, setLoadingMyVideos] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublic, setEditPublic] = useState(true);

  const load = useCallback(async () => {
    if (!playlistId) {
      setErr('Playlist introuvable');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await apiClient.get(`/playlists/${encodeURIComponent(playlistId)}`);
      const pkg = res.data?.data ?? res.data;
      setPlaylist(pkg || null);
    } catch (e: any) {
      setPlaylist(null);
      setErr(String(e?.response?.data?.error?.message || 'Impossible de charger la playlist').slice(0, 220));
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = useMemo(() => {
    const uid = user?.id;
    const p = playlist;
    if (!uid || !p) return false;
    return p.user_id === uid || p.user?.id === uid;
  }, [user?.id, playlist]);

  const videos = useMemo(() => (Array.isArray(playlist?.items) ? playlist!.items : []), [playlist]);
  const videoIdsInPlaylist = useMemo(() => new Set(videos.map((it) => it.video?.id).filter(Boolean) as string[]), [videos]);

  const openEdit = useCallback(() => {
    if (!playlist) return;
    setEditName(playlist.name || '');
    setEditDescription(playlist.description || '');
    setEditPublic(Boolean(playlist.is_public));
    setShowEdit(true);
  }, [playlist]);

  const saveEdit = useCallback(async () => {
    if (!playlistId || !editName.trim() || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/playlists/${encodeURIComponent(playlistId)}`, {
        name: editName.trim().slice(0, 200),
        description: editDescription.trim() ? editDescription.trim().slice(0, 2000) : null,
        isPublic: editPublic,
      });
      setShowEdit(false);
      await load();
    } catch (e: any) {
      Alert.alert('Playlist', String(e?.response?.data?.error?.message || 'Enregistrement impossible').slice(0, 220));
    } finally {
      setBusy(false);
    }
  }, [playlistId, editName, editDescription, editPublic, busy, load]);

  const runDeletePlaylist = useCallback(async () => {
    if (!playlistId || busy) return;
    setBusy(true);
    try {
      await apiClient.delete(`/playlists/${encodeURIComponent(playlistId)}`);
      goBackOrFallback('/playlists');
    } catch (e: any) {
      const msg = String(e?.response?.data?.error?.message || 'Suppression impossible').slice(0, 220);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(msg);
      } else {
        Alert.alert('Playlist', msg);
      }
    } finally {
      setBusy(false);
    }
  }, [playlistId, busy]);

  const deletePlaylist = useCallback(() => {
    confirmDeletePlaylist(() => {
      void runDeletePlaylist();
    });
  }, [runDeletePlaylist]);

  const loadMyVideos = useCallback(async () => {
    if (!user?.id) return;
    setLoadingMyVideos(true);
    try {
      const res = await apiClient.get('/videos', {
        params: { creator_id: user.id, page: 1, limit: 80, visibility: 'creator' },
      });
      const pkg = res.data?.data ?? res.data;
      const list = Array.isArray(pkg?.videos) ? pkg.videos : [];
      setMyVideos(list);
    } catch {
      setMyVideos([]);
    } finally {
      setLoadingMyVideos(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (showAdd && user?.id) void loadMyVideos();
  }, [showAdd, user?.id, loadMyVideos]);

  const addVideo = useCallback(
    async (videoId: string) => {
      if (!playlistId || busy) return;
      setBusy(true);
      try {
        await apiClient.post(`/playlists/${encodeURIComponent(playlistId)}/videos`, { videoId });
        setShowAdd(false);
        await load();
      } catch (e: any) {
        const msg = String(e?.response?.data?.error?.message || e?.message || 'Ajout impossible');
        Alert.alert('Playlist', msg.slice(0, 220));
      } finally {
        setBusy(false);
      }
    },
    [playlistId, busy, load],
  );

  const removeVideo = useCallback(
    (videoId: string, title: string) => {
      if (!playlistId || busy) return;
      confirmRemoveVideo(() => {
        void (async () => {
          setBusy(true);
          try {
            await apiClient.delete(
              `/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`,
            );
            await load();
          } catch (e: any) {
            const msg = String(e?.response?.data?.error?.message || 'Erreur').slice(0, 220);
            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
              window.alert(msg);
            } else {
              Alert.alert('Playlist', msg);
            }
          } finally {
            setBusy(false);
          }
        })();
      }, title);
    },
    [playlistId, busy, load],
  );

  const pickableVideos = useMemo(
    () => myVideos.filter((v) => v?.id && !videoIdsInPlaylist.has(v.id)),
    [myVideos, videoIdsInPlaylist],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrFallback('/playlists')} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {playlist?.name || 'Playlist'}
        </Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={() => setShowOwnerMenu(true)}
            style={styles.headerAction}
            accessibilityLabel="Options playlist"
            disabled={busy}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 28 }} color={Colors.primary} />
      ) : err || !playlist ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{err || 'Playlist introuvable'}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {playlist.description ? <Text style={styles.desc}>{playlist.description}</Text> : null}
          <Text style={styles.meta}>
            {playlist.videos_count != null ? `${playlist.videos_count} vidéo(s)` : `${videos.length} vidéo(s)`}
            {playlist.is_public ? ' · Publique' : ' · Privée'}
          </Text>

          {isOwner ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionChip} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.actionChipText}>Ajouter des vidéos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionChip} onPress={() => openEdit()} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={18} color={Colors.text} />
                <Text style={styles.actionChipText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.list}>
            {videos.length === 0 ? (
              <Text style={styles.emptyList}>Aucune vidéo dans cette liste pour l’instant.</Text>
            ) : null}
            {videos.map((it, idx) => {
              const v = it.video;
              const posterUrl = typeof v?.thumbnail_url === 'string' ? v.thumbnail_url : '';
              const videoUrl =
                typeof v?.low_quality_url === 'string'
                  ? v.low_quality_url
                  : typeof v?.video_url === 'string'
                    ? v.video_url
                    : typeof v?.hls_url === 'string'
                      ? v.hls_url
                      : '';
              const uri = posterUrl || videoUrl || '';
              const title = String(v?.title || 'Vidéo').trim() || 'Vidéo';
              const vid = v?.id as string | undefined;
              return (
                <View key={it.id || `${playlist.id}-${idx}`} style={styles.rowWrap}>
                  <TouchableOpacity
                    style={[styles.row, isOwner ? styles.rowOwner : null]}
                    activeOpacity={0.88}
                    onPress={() => vid && router.push({ pathname: '/watch/[id]', params: { id: vid } })}
                    accessibilityLabel={`Lire ${title}`}
                  >
                    <View style={styles.thumb}>
                      {uri ? (
                        <SmartThumbnail
                          posterUrl={posterUrl}
                          uri={uri}
                          videoUrl={videoUrl}
                          style={{ width: '100%', height: '100%' }}
                          tileSize={92}
                          tileHeight={58}
                        />
                      ) : null}
                    </View>
                    <View style={styles.textCol}>
                      <Text style={styles.title} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={styles.sub} numberOfLines={1}>
                        {creatorLine(v)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {isOwner && vid ? (
                    <Pressable
                      style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        removeVideo(vid, title);
                      }}
                      hitSlop={12}
                      accessibilityLabel="Retirer de la playlist"
                    >
                      <Ionicons name="trash-outline" size={20} color="#f87171" />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal visible={showOwnerMenu} transparent animationType="fade" onRequestClose={() => setShowOwnerMenu(false)}>
        <View style={styles.ownerMenuOverlay}>
          <Pressable style={styles.ownerMenuBackdrop} onPress={() => setShowOwnerMenu(false)} />
          <View style={styles.ownerMenuCard}>
            <Text style={styles.ownerMenuTitle}>Playlist</Text>
            <TouchableOpacity
              style={styles.ownerMenuRow}
              onPress={() => {
                setShowOwnerMenu(false);
                setShowAdd(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.ownerMenuText}>Ajouter des vidéos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ownerMenuRow}
              onPress={() => {
                setShowOwnerMenu(false);
                openEdit();
              }}
            >
              <Ionicons name="create-outline" size={22} color={Colors.text} />
              <Text style={styles.ownerMenuText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ownerMenuRow}
              onPress={() => {
                setShowOwnerMenu(false);
                deletePlaylist();
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#f87171" />
              <Text style={[styles.ownerMenuText, { color: '#f87171' }]}>Supprimer la playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ownerMenuCancel} onPress={() => setShowOwnerMenu(false)}>
              <Text style={styles.btnGhostText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Ajouter des vidéos</Text>
            <Text style={styles.modalHint}>Tes vidéos publiées (et brouillons) — celles déjà dans la liste sont masquées.</Text>
            {loadingMyVideos ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
            ) : pickableVideos.length === 0 ? (
              <Text style={styles.modalEmpty}>Aucune vidéo à ajouter. Publie d’abord du contenu depuis l’onglet Créer.</Text>
            ) : (
              <FlatList
                data={pickableVideos}
                keyExtractor={(item) => String(item.id)}
                style={{ marginTop: 12, maxHeight: 420 }}
                renderItem={({ item }) => {
                  const posterUrl = typeof item.thumbnail_url === 'string' ? item.thumbnail_url : '';
                  const videoUrl =
                    typeof item.low_quality_url === 'string'
                      ? item.low_quality_url
                      : typeof item.video_url === 'string'
                        ? item.video_url
                        : typeof item.hls_url === 'string'
                          ? item.hls_url
                          : '';
                  const uri = posterUrl || videoUrl || '';
                  const t = String(item.title || 'Vidéo').trim();
                  return (
                    <TouchableOpacity
                      style={styles.pickRow}
                      onPress={() => item.id && addVideo(String(item.id))}
                      disabled={busy}
                    >
                      <View style={styles.thumbSm}>
                        {uri ? (
                          <SmartThumbnail
                            posterUrl={posterUrl}
                            uri={uri}
                            videoUrl={videoUrl}
                            style={{ width: '100%', height: '100%' }}
                            tileSize={72}
                            tileHeight={46}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.pickTitle} numberOfLines={2}>
                        {t}
                      </Text>
                      <Ionicons name="add-circle" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAdd(false)}>
              <Text style={styles.btnGhostText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier la playlist</Text>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description (optionnel)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, { height: 80 }]}
              multiline
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Publique</Text>
              <Switch value={editPublic} onValueChange={setEditPublic} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowEdit(false)} disabled={busy}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!editName.trim() || busy) && { opacity: 0.5 }]}
                onPress={() => void saveEdit()}
                disabled={!editName.trim() || busy}
              >
                <Text style={styles.btnPrimaryText}>{busy ? '…' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null),
  },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  center: { padding: 24, alignItems: 'center' },
  errText: { color: Colors.textSecondary, textAlign: 'center' },
  desc: { paddingHorizontal: Spacing.md, paddingTop: 14, color: Colors.textSecondary, lineHeight: 20 },
  meta: { paddingHorizontal: Spacing.md, paddingTop: 6, paddingBottom: 8, color: Colors.textMuted, fontSize: 12 },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionChipText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  emptyList: { paddingHorizontal: Spacing.md, paddingVertical: 8, color: Colors.textMuted, fontSize: 13 },
  list: { paddingHorizontal: Spacing.md, gap: 10 },
  rowWrap: { position: 'relative' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rowOwner: { paddingRight: 44 },
  removeBtn: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : null),
  },
  ownerMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ownerMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  ownerMenuCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#141414',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    zIndex: 1,
  },
  ownerMenuTitle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ownerMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ownerMenuText: { color: Colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  ownerMenuCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  thumb: { width: 92, height: 58, borderRadius: 10, overflow: 'hidden', backgroundColor: '#222' },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  sub: { marginTop: 2, color: Colors.textMuted, fontSize: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#0f0f0f',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
  },
  modalTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  modalHint: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  modalEmpty: { marginTop: 12, color: Colors.textMuted, fontSize: 13 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  thumbSm: { width: 72, height: 46, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  pickTitle: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: '600' },
  modalClose: { marginTop: 14, alignSelf: 'center', padding: 10 },
  label: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  switchLabel: { color: Colors.text, fontWeight: '800' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  btnGhost: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  btnGhostText: { color: Colors.text, fontWeight: '800' },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary },
  btnPrimaryText: { color: '#FFF', fontWeight: '900' },
});
