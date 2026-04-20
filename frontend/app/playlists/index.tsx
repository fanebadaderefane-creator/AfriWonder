import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../src/theme/colors';
import { SmartThumbnail } from '../../src/components/SmartThumbnail';
import { goBackOrFallback } from '../../src/utils/goBack';

type PlaylistPreview = {
  id: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  videos_count?: number | null;
  items?: { video?: any | null }[];
};

export default function MyPlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistPreview[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/playlists', { params: { page: 1, limit: 60 } });
      const pkg = res.data?.data ?? res.data;
      const list = Array.isArray(pkg?.playlists) ? pkg.playlists : [];
      setPlaylists(list);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  const create = useCallback(async () => {
    if (!canCreate || busy) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim().slice(0, 80),
        description: description.trim().slice(0, 400) || undefined,
        isPublic,
      };
      const res = await apiClient.post('/playlists', payload);
      const created = res.data?.data ?? res.data;
      setShowCreate(false);
      setName('');
      setDescription('');
      setIsPublic(true);
      await load();
      if (created?.id) {
        router.push({ pathname: '/playlist/[id]', params: { id: created.id } });
      }
    } catch (e: any) {
      Alert.alert('Playlists', String(e?.response?.data?.error?.message || 'Création impossible').slice(0, 220));
    } finally {
      setBusy(false);
    }
  }, [busy, canCreate, description, isPublic, load, name]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrFallback('/menu-plus')} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Playlists</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={styles.addBtn}
          accessibilityLabel="Créer une playlist"
        >
          <Ionicons name="add" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 28 }} color={Colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {playlists.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucune playlist</Text>
              <Text style={styles.emptySub}>Crée ta première playlist depuis ce menu.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Créer une playlist</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {playlists.map((pl) => {
                const firstVideo = pl.items?.[0]?.video;
                const posterUrl = typeof firstVideo?.thumbnail_url === 'string' ? firstVideo.thumbnail_url : '';
                const videoUrl =
                  typeof firstVideo?.low_quality_url === 'string'
                    ? firstVideo.low_quality_url
                    : typeof firstVideo?.video_url === 'string'
                      ? firstVideo.video_url
                      : typeof firstVideo?.hls_url === 'string'
                        ? firstVideo.hls_url
                        : '';
                const uri = posterUrl || videoUrl || '';
                const deletePl = () => {
                  const msg = `Supprimer « ${(pl.name || 'Playlist').slice(0, 60)} » ?`;
                  const run = () => {
                    void (async () => {
                      try {
                        setBusy(true);
                        await apiClient.delete(`/playlists/${encodeURIComponent(pl.id)}`);
                        await load();
                      } catch (e: any) {
                        const err = String(e?.response?.data?.error?.message || 'Suppression impossible').slice(0, 220);
                        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
                          window.alert(err);
                        } else {
                          Alert.alert('Playlists', err);
                        }
                      } finally {
                        setBusy(false);
                      }
                    })();
                  };
                  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
                    if (window.confirm(msg)) run();
                  } else {
                    Alert.alert('Supprimer', msg, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: run },
                    ]);
                  }
                };
                return (
                  <View key={pl.id} style={styles.rowWrap}>
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.88}
                      onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: pl.id } })}
                    >
                      <View style={styles.thumb}>
                        {uri ? (
                          <SmartThumbnail
                            posterUrl={posterUrl}
                            uri={uri}
                            videoUrl={videoUrl}
                            style={{ width: '100%', height: '100%' }}
                            tileSize={84}
                            tileHeight={54}
                          />
                        ) : null}
                      </View>
                      <View style={styles.textCol}>
                        <Text style={styles.title} numberOfLines={1}>
                          {pl.name || 'Playlist'}
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>
                          {(pl.videos_count != null ? `${pl.videos_count} vidéo(s)` : '') +
                            (pl.is_public ? ' · Publique' : ' · Privée')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <Pressable
                      style={({ pressed }) => [styles.rowTrash, pressed && { opacity: 0.7 }]}
                      onPress={deletePl}
                      hitSlop={10}
                      accessibilityLabel="Supprimer la playlist"
                      disabled={busy}
                    >
                      <Ionicons name="trash-outline" size={20} color="#f87171" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle playlist</Text>

            <Text style={styles.label}>Nom</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Concerts"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              autoFocus
            />

            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: mes meilleurs lives"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, { height: 74 }]}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Publique</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowCreate(false)} disabled={busy}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!canCreate || busy) && { opacity: 0.5 }]}
                onPress={() => void create()}
                disabled={!canCreate || busy}
              >
                <Text style={styles.btnPrimaryText}>{busy ? 'Création…' : 'Créer'}</Text>
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  emptySub: { marginTop: 6, color: Colors.textMuted, textAlign: 'center' },
  primaryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '800' },
  list: { padding: Spacing.md, gap: 10 },
  rowWrap: { position: 'relative' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingRight: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rowTrash: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  thumb: { width: 84, height: 54, borderRadius: 10, overflow: 'hidden', backgroundColor: '#222' },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontWeight: '800' },
  sub: { marginTop: 3, color: Colors.textMuted, fontSize: 12 },
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
  modalTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
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

