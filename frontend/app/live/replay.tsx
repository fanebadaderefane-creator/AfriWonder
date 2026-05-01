import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { replayScreenStyles as styles } from '../../src/screens/live/replay.styles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';

/** Même ordre que `pickLiveReplaySrc` côté serveur (hors RTMP). */
function pickLiveReplayPlaybackUrl(live: Record<string, unknown>): string {
  const candidates = [live.replay_url, live.playback_url, live.stream_url]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  for (const c of candidates) {
    if (c.startsWith('rtmp://') || c.startsWith('rtmps://')) continue;
    const abs = toAbsoluteMediaUrl(c);
    if (abs) return abs;
  }
  return '';
}

function LiveReplayVideoView({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
    };
  }, [player]);

  return (
    <View style={styles.playerBox}>
      <VideoView style={styles.playerVideo} player={player} contentFit="contain" nativeControls />
      <View style={styles.replayBadge}>
        <Ionicons name="refresh" size={12} color="#FFF" />
        <Text style={styles.replayBadgeText}>REPLAY</Text>
      </View>
    </View>
  );
}

export default function ReplayScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClip, setShowClip] = useState(false);
  const [clipStart, setClipStart] = useState('');
  const [clipEnd, setClipEnd] = useState('');
  const [clipTitle, setClipTitle] = useState('');
  const [clipping, setClipping] = useState(false);
  const [replayInput, setReplayInput] = useState('');
  const [sendingReplay, setSendingReplay] = useState(false);

  const loadLive = useCallback(async () => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(String(id))}`);
      const raw = res.data?.data ?? res.data;
      if (raw) {
        setLive({
          ...raw,
          duration: (raw.duration_minutes != null ? raw.duration_minutes * 60 : raw.duration) || 0,
          tip_amount: raw.total_tips_amount ?? raw.tip_amount ?? 0,
          highlights: raw.replay_chapters || raw.highlights || [],
          replay_comments: Array.isArray(raw.replay_chat_messages) ? raw.replay_chat_messages : [],
        });
      } else {
        setLive(null);
      }
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  const sendReplayComment = async () => {
    const msg = replayInput.trim();
    if (!msg || !id) return;
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour commenter le replay.');
      return;
    }
    if (msg.length > 150) {
      Alert.alert('Replay', '150 caractères max.');
      return;
    }
    setSendingReplay(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(String(id))}/replay/chat`, { message: msg });
      setReplayInput('');
      await loadLive();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || e.response?.data?.message || 'Envoi impossible');
    } finally {
      setSendingReplay(false);
    }
  };

  const createHighlight = async () => {
    const start = parseFloat(clipStart); const end = parseFloat(clipEnd);
    if (!start && start !== 0 || !end || end <= start) { Alert.alert('Erreur', 'Temps invalides'); return; }
    setClipping(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(String(id))}/chapters`, {
        title: clipTitle.trim() || 'Moment fort',
        start_seconds: start,
        end_seconds: end,
      });
      Alert.alert('Moment fort créé!', 'Le clip est prêt à être reposté dans votre feed.', [{ text: 'OK' }]);
      setShowClip(false); setClipStart(''); setClipEnd(''); setClipTitle('');
      loadLive();
    } catch (e: any) { Alert.alert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setClipping(false); }
  };

  const formatDuration = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}min` : `${m}min`; };

  const playbackUri = useMemo(() => {
    if (!live || typeof live !== 'object') return '';
    return pickLiveReplayPlaybackUrl(live as Record<string, unknown>);
  }, [live]);

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!live) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: Colors.text }}>Live non trouvé</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Replay</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {playbackUri ? (
          <LiveReplayVideoView key={playbackUri} uri={playbackUri} />
        ) : (
          <View style={styles.playerBox}>
            {String(live.thumbnail_url || '').trim() ? (
              <Image
                source={{ uri: toAbsoluteMediaUrl(String(live.thumbnail_url)) }}
                style={styles.playerImage}
              />
            ) : (
              <View style={[styles.playerImage, { backgroundColor: '#111' }]} />
            )}
            <View style={styles.playOverlay}>
              <Ionicons name="videocam-off-outline" size={36} color="#FFF" />
              <Text style={styles.noVodText}>
                Aucun fichier replay (URL) pour le moment. Le créateur peut l’associer après encodage ou enregistrement
                cloud.
              </Text>
            </View>
          </View>
        )}

        {/* Info */}
        <Text style={styles.title}>{live.title}</Text>
        <Text style={styles.description}>{live.description}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}><Ionicons name="time" size={16} color={Colors.textSecondary} /><Text style={styles.statText}>{formatDuration(live.duration || 0)}</Text></View>
          <View style={styles.stat}><Ionicons name="eye" size={16} color={Colors.textSecondary} /><Text style={styles.statText}>{(live.peak_viewers || 0).toLocaleString()} max</Text></View>
          <View style={styles.stat}><Ionicons name="heart" size={16} color="#E91E63" /><Text style={styles.statText}>{live.total_likes ?? live.likes ?? 0}</Text></View>
          <View style={styles.stat}><Ionicons name="gift" size={16} color="#FF6B00" /><Text style={styles.statText}>{(live.total_gifts_amount ?? live.tip_amount ?? 0).toLocaleString()}</Text></View>
        </View>

        <View style={styles.recapBox}>
          <Text style={styles.sectionTitle}>Récap post-live</Text>
          <Text style={styles.recapLine}>Pic spectateurs : {(live.peak_viewers ?? 0).toLocaleString()}</Text>
          <Text style={styles.recapLine}>Cadeaux (FCFA) : {(live.total_gifts_amount ?? 0).toLocaleString()}</Text>
          <Text style={styles.recapLine}>Rétention replay : {live.replay_retention_days ?? 72} jours (premium prolongé côté serveur)</Text>
        </View>

        {live.status === 'ended' && (
          <View style={styles.replayCommentsBox}>
            <Text style={styles.sectionTitle}>Commentaires replay</Text>
            <Text style={styles.replayHint}>Séparés du chat live d’origine (CDC 6.5).</Text>
            {(live.replay_comments || []).length === 0 ? (
              <Text style={styles.replayEmpty}>Aucun commentaire replay pour l’instant.</Text>
            ) : (
              (live.replay_comments as any[]).map((c: any, i: number) => (
                <View key={c.id || i} style={styles.replayRow}>
                  <Text style={styles.replayAuthor}>{c.sender_name || 'Anonyme'}</Text>
                  <Text style={styles.replayMsg}>{c.message}</Text>
                </View>
              ))
            )}
            <TextInput
              style={styles.replayInput}
              placeholder={isAuthenticated ? 'Votre commentaire (max 150)' : 'Connectez-vous pour commenter'}
              placeholderTextColor={Colors.textMuted}
              value={replayInput}
              onChangeText={(t) => setReplayInput(t.slice(0, 150))}
              editable={isAuthenticated}
              maxLength={150}
            />
            <Text style={styles.replayCount}>{replayInput.length}/150</Text>
            <TouchableOpacity
              style={[styles.replaySend, sendingReplay && { opacity: 0.5 }]}
              onPress={() => void sendReplayComment()}
              disabled={!isAuthenticated || sendingReplay}
            >
              <Text style={styles.replaySendText}>Publier</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Republish full live */}
        {live.status === 'ended' && (
          <TouchableOpacity style={styles.republishBtn} onPress={async () => {
            try {
              Alert.alert('Non disponible', 'Aucun endpoint « republier le live » côté API Node pour le moment.');
            } catch (e: any) { Alert.alert('Erreur', e.response?.data?.detail || 'Erreur'); }
          }}>
            <Ionicons name="share-social" size={20} color="#FFF" />
            <Text style={styles.republishBtnText}>Republier le live complet</Text>
          </TouchableOpacity>
        )}

        {/* Clip Highlights Button */}
        {live.status === 'ended' && (
          <TouchableOpacity style={styles.clipBtn} onPress={() => setShowClip(!showClip)}>
            <Ionicons name="cut" size={20} color="#FFEAA7" />
            <Text style={styles.clipBtnText}>Découper un moment fort</Text>
          </TouchableOpacity>
        )}

        {/* Clip Form */}
        {showClip && (
          <View style={styles.clipForm}>
            <Text style={styles.clipLabel}>Titre du clip (optionnel)</Text>
            <TextInput style={styles.clipInput} placeholder="Moment fort" placeholderTextColor={Colors.textMuted} value={clipTitle} onChangeText={setClipTitle} />
            <View style={styles.clipTimeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.clipLabel}>Début (sec)</Text>
                <TextInput style={styles.clipInput} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={clipStart} onChangeText={setClipStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clipLabel}>Fin (sec)</Text>
                <TextInput style={styles.clipInput} placeholder="60" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={clipEnd} onChangeText={setClipEnd} />
              </View>
            </View>
            <TouchableOpacity style={[styles.createClipBtn, clipping && { opacity: 0.5 }]} onPress={createHighlight} disabled={clipping}>
              {clipping ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="cut" size={18} color="#FFF" /><Text style={styles.createClipBtnText}>Créer le clip</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* Existing Highlights */}
        {(live.highlights || []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Moments forts ({live.highlights.length})</Text>
            {live.highlights.map((h: any, i: number) => (
              <View key={h.id || i} style={styles.highlightItem}>
                <View style={styles.highlightIcon}><Ionicons name="star" size={18} color="#FFEAA7" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightTitle}>{h.title}</Text>
                  <Text style={styles.highlightMeta}>Clip prêt à reposter</Text>
                </View>
                <TouchableOpacity style={styles.repostBtn}><Ionicons name="share-social" size={16} color={Colors.primary} /><Text style={styles.repostBtnText}>Reposter</Text></TouchableOpacity>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
