import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';

const { width } = Dimensions.get('window');

export type TopFanRow = {
  rank?: number;
  sender_id?: string;
  user_id?: string;
  sender_name?: string;
  total_amount_fcfa?: number;
  total_amount?: number;
  gift_events?: number;
};

function formatCoins(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.round(n).toLocaleString('fr-FR');
}

function PodiumSlot({
  row,
  place,
  heightPct,
  delay,
}: {
  row: TopFanRow | null;
  place: 1 | 2 | 3;
  heightPct: number;
  delay: number;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [delay, opacity, scale]);

  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
  const name = row
    ? String(row.sender_name || '?').slice(0, 16)
    : '—';
  const coins = row ? Number(row.total_amount_fcfa ?? row.total_amount ?? 0) || 0 : 0;

  return (
    <Animated.View style={[styles.podiumCol, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.podiumName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.podiumCoins}>{formatCoins(coins)} FCFA</Text>
      <View style={[styles.podiumPedestal, { height: 56 * heightPct, borderColor: place === 1 ? '#D4AF37' : 'rgba(255,255,255,0.2)' }]}>
        <Text style={styles.podiumMedal}>{medal}</Text>
        <Text style={styles.podiumPlace}>{place}</Text>
      </View>
    </Animated.View>
  );
}

export function LiveTopFansSheet({
  liveId,
  visible,
  onClose,
}: {
  liveId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(420)).current;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TopFanRow[]>([]);

  const load = useCallback(async () => {
    if (!liveId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/top-donors?limit=10`);
      const raw = res.data?.data ?? res.data;
      setRows(Array.isArray(raw) ? raw : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    if (!visible || !liveId) return;
    void load();
    Animated.spring(slide, { toValue: 0, friction: 9, useNativeDriver: true }).start();
    return () => {
      slide.setValue(420);
    };
  }, [visible, liveId, load, slide]);

  const totalLive = rows.reduce((s, r) => s + (Number(r.total_amount_fcfa ?? r.total_amount ?? 0) || 0), 0);
  const top3: [TopFanRow | null, TopFanRow | null, TopFanRow | null] = [
    rows[1] ?? null,
    rows[0] ?? null,
    rows[2] ?? null,
  ];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: slide }] },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="trophy" size={22} color="#D4AF37" />
                <Text style={styles.sheetTitle}>Top Fans</Text>
              </View>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Fermer">
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#D4AF37" style={{ marginVertical: 24 }} />
            ) : rows.length === 0 ? (
              <Text style={styles.empty}>Aucun cadeau pour l’instant — soyez le premier !</Text>
            ) : (
              <ScrollView style={{ maxHeight: width * 1.1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.podiumRow}>
                  <PodiumSlot row={top3[0]} place={2} heightPct={0.75} delay={80} />
                  <PodiumSlot row={top3[1]} place={1} heightPct={1} delay={0} />
                  <PodiumSlot row={top3[2]} place={3} heightPct={0.6} delay={160} />
                </View>

                {rows.slice(3).map((r, i) => {
                  const rank = (r.rank ?? i + 4) as number;
                  const coins = Number(r.total_amount_fcfa ?? r.total_amount ?? 0) || 0;
                  return (
                    <View key={`${r.sender_id || r.user_id || rank}`} style={styles.listRow}>
                      <Text style={styles.listRank}>{rank}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {String(r.sender_name || '?')}
                        </Text>
                      </View>
                      <Text style={styles.listCoins}>{formatCoins(coins)} FCFA</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.footerTotal}>
              Total FCFA offerts ce live :{' '}
              <Text style={styles.footerGold}>{formatCoins(totalLive)}</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Contenu Top Fans embarqué dans l’onglet du gift shop (sans Modal). */
export function LiveTopFansEmbedded({ liveId }: { liveId: string }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TopFanRow[]>([]);

  const load = useCallback(async () => {
    if (!liveId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/top-donors?limit=10`);
      const raw = res.data?.data ?? res.data;
      setRows(Array.isArray(raw) ? raw : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalLive = rows.reduce((s, r) => s + (Number(r.total_amount_fcfa ?? r.total_amount ?? 0) || 0), 0);
  const top3: [TopFanRow | null, TopFanRow | null, TopFanRow | null] = [
    rows[1] ?? null,
    rows[0] ?? null,
    rows[2] ?? null,
  ];

  if (loading) {
    return <ActivityIndicator color="#D4AF37" style={{ marginVertical: 20 }} />;
  }
  if (rows.length === 0) {
    return <Text style={styles.empty}>Pas encore de tops donateurs sur ce live.</Text>;
  }

  return (
    <View>
      <View style={styles.podiumRow}>
        <PodiumSlot row={top3[0]} place={2} heightPct={0.75} delay={40} />
        <PodiumSlot row={top3[1]} place={1} heightPct={1} delay={0} />
        <PodiumSlot row={top3[2]} place={3} heightPct={0.6} delay={80} />
      </View>
      {rows.slice(3).map((r, i) => {
        const rank = (r.rank ?? i + 4) as number;
        const coins = Number(r.total_amount_fcfa ?? r.total_amount ?? 0) || 0;
        return (
          <View key={`${r.sender_id || rank}-emb`} style={styles.listRow}>
            <Text style={styles.listRank}>{rank}</Text>
            <Text style={[styles.listName, { flex: 1 }]} numberOfLines={1}>
              {String(r.sender_name || '?')}
            </Text>
            <Text style={styles.listCoins}>{formatCoins(coins)} FCFA</Text>
          </View>
        );
      })}
      <Text style={styles.footerTotal}>
        Total FCFA ce live : <Text style={styles.footerGold}>{formatCoins(totalLive)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1612',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    paddingHorizontal: Spacing.lg,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text },
  empty: { color: Colors.textMuted, textAlign: 'center', marginVertical: 20, fontSize: FontSizes.sm },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  podiumCol: { alignItems: 'center', width: (width - 80) / 3 },
  podiumName: { color: Colors.text, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  podiumCoins: { color: '#D4AF37', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  podiumPedestal: {
    width: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  podiumMedal: { fontSize: 22 },
  podiumPlace: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  listRank: { width: 28, color: Colors.textMuted, fontWeight: '800' },
  listName: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.sm },
  listCoins: { color: '#D4AF37', fontWeight: '800', fontSize: FontSizes.sm },
  footerTotal: {
    marginTop: Spacing.md,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  footerGold: { color: '#D4AF37', fontWeight: '900' },
});
