import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';

type LivePick = { id: string; title: string; creator_name?: string; viewers_count?: number };

export function LiveBattleChallengeModal({
  visible,
  liveId,
  onClose,
  onChallenged,
}: {
  visible: boolean;
  liveId: string;
  onClose: () => void;
  onChallenged: () => void;
}) {
  const [lives, setLives] = useState<LivePick[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    void (async () => {
      try {
        const res = await apiClient.get('/live', { params: { status: 'live', limit: 24, sortBy: 'viewers' } });
        const raw = res.data?.data ?? res.data;
        const list = Array.isArray(raw?.streams) ? raw.streams : [];
        setLives(
          list
            .filter((s: { id?: string }) => s.id && s.id !== liveId)
            .map((s: Record<string, unknown>) => ({
              id: String(s.id),
              title: String(s.title ?? 'Live'),
              creator_name: String((s.creator as { username?: string })?.username ?? s.creator_name ?? ''),
              viewers_count: Number(s.viewers_count ?? 0),
            })),
        );
      } catch {
        setLives([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, liveId]);

  const challenge = async (opponentLiveId: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/battle/challenge`, {
        opponent_live_id: opponentLiveId,
        duration_sec: 180,
      });
      Alert.alert('Battle', 'Défi envoyé — en attente de la réponse du créateur.');
      onChallenged();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Battle', getAlertMessageForCaughtError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Lancer un Battle 1v1</Text>
          <Text style={styles.hint}>Choisissez un live adversaire en direct. Les cadeaux comptent pour le score.</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={lives}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.empty}>Aucun autre live actif pour l’instant.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} disabled={busy} onPress={() => void challenge(item.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.creator_name} · {item.viewers_count ?? 0} spectateurs
                    </Text>
                  </View>
                  <Text style={styles.challengeBtn}>Défier</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#141520',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '800' },
  hint: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  empty: { color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowTitle: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  rowMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  challengeBtn: { color: '#FF3366', fontWeight: '800', fontSize: FontSizes.sm },
  cancel: { marginTop: Spacing.md, padding: Spacing.sm, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary },
});
