import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';

export default function ReplayScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClip, setShowClip] = useState(false);
  const [clipStart, setClipStart] = useState('');
  const [clipEnd, setClipEnd] = useState('');
  const [clipTitle, setClipTitle] = useState('');
  const [clipping, setClipping] = useState(false);

  useEffect(() => { loadLive(); }, [id]);

  const loadLive = async () => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(String(id))}`);
      const raw = res.data?.data;
      if (raw) {
        setLive({
          ...raw,
          duration: (raw.duration_minutes != null ? raw.duration_minutes * 60 : raw.duration) || 0,
          tip_amount: raw.total_tips_amount ?? raw.tip_amount ?? 0,
          highlights: raw.replay_chapters || raw.highlights || [],
        });
      } else {
        setLive(null);
      }
    } catch {} finally { setLoading(false); }
  };

  const createHighlight = async () => {
    const start = parseFloat(clipStart); const end = parseFloat(clipEnd);
    if (!start && start !== 0 || !end || end <= start) { Alert.alert('Erreur', 'Temps invalides'); return; }
    setClipping(true);
    try {
      const res = await apiClient.post(`/live/${encodeURIComponent(String(id))}/chapters`, {
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

  if (loading) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!live) return <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: Colors.text }}>Live non trouvé</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Replay</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Video Player Placeholder */}
        <View style={styles.playerBox}>
          <Image source={{ uri: live.thumbnail_url }} style={styles.playerImage} />
          <View style={styles.playOverlay}>
            <TouchableOpacity style={styles.playBtn}><Ionicons name="play" size={40} color="#FFF" /></TouchableOpacity>
          </View>
          {live.status === 'ended' && <View style={styles.replayBadge}><Ionicons name="refresh" size={12} color="#FFF" /><Text style={styles.replayBadgeText}>REPLAY</Text></View>}
        </View>

        {/* Info */}
        <Text style={styles.title}>{live.title}</Text>
        <Text style={styles.description}>{live.description}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}><Ionicons name="time" size={16} color={Colors.textSecondary} /><Text style={styles.statText}>{formatDuration(live.duration || 0)}</Text></View>
          <View style={styles.stat}><Ionicons name="eye" size={16} color={Colors.textSecondary} /><Text style={styles.statText}>{(live.peak_viewers || 0).toLocaleString()} max</Text></View>
          <View style={styles.stat}><Ionicons name="heart" size={16} color="#E91E63" /><Text style={styles.statText}>{live.likes}</Text></View>
          <View style={styles.stat}><Ionicons name="gift" size={16} color="#FF6B00" /><Text style={styles.statText}>{(live.tip_amount || 0).toLocaleString()}</Text></View>
        </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl },
  playerBox: { width: '100%', height: 220, borderRadius: BorderRadius.xl, overflow: 'hidden', backgroundColor: Colors.surface, marginBottom: Spacing.lg },
  playerImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  replayBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, gap: 4 },
  replayBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  description: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  clipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,234,167,0.15)', borderRadius: BorderRadius.md, padding: Spacing.lg, gap: 8 },
  republishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  republishBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
  clipBtnText: { color: '#FFEAA7', fontWeight: 'bold', fontSize: FontSizes.md },
  clipForm: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.md },
  clipLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 4 },
  clipInput: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md, marginBottom: Spacing.sm },
  clipTimeRow: { flexDirection: 'row', gap: Spacing.md },
  createClipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEAA7', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm, gap: 6 },
  createClipBtnText: { color: '#000', fontWeight: 'bold' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: Spacing.xl, marginBottom: Spacing.md },
  highlightItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  highlightIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,234,167,0.15)', alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { color: Colors.text, fontWeight: '600' },
  highlightMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  repostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.primary },
  repostBtnText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
});
