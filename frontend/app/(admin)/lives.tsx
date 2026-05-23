import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

type Stream = {
  id: string;
  title?: string | null;
  creator_id?: string;
  viewer_count?: number;
  status?: string;
};

export default function AdminLivesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<Stream[]>([]);
  const [history, setHistory] = useState<Stream[]>([]);

  const load = useCallback(async () => {
    try {
      const [a, h] = await Promise.all([
        apiClient.get(API_ROUTES.ADMIN_LIVES_ACTIVE),
        apiClient.get(API_ROUTES.ADMIN_LIVES_HISTORY, { params: { page: 1, limit: 20 } }),
      ]);
      const ad = a.data?.data ?? a.data;
      const hd = h.data?.data ?? h.data;
      const alist = (ad?.streams ?? []) as Stream[];
      const hlist = (hd?.streams ?? []) as Stream[];
      setActive(Array.isArray(alist) ? alist : []);
      setHistory(Array.isArray(hlist) ? hlist : []);
    } catch {
      setActive([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const terminate = (id: string) => {
    Alert.alert('Couper le live', 'Confirmer la fin du stream côté serveur ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(API_ROUTES.ADMIN_LIVE_TERMINATE(id), { reason: 'admin_mobile' });
            void load();
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Échec');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminSubScreenHeader title="Lives" />
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
        >
          <Text style={styles.h}>En direct</Text>
          {active.length === 0 ? (
            <Text style={styles.empty}>Aucun live actif.</Text>
          ) : null}
          {active.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.title}>{s.title || 'Live sans titre'}</Text>
              <Text style={styles.meta}>
                ID {s.id.slice(0, 8)}… · viewers ~{s.viewer_count ?? '—'}
              </Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => router.push(`/live/${s.id}` as never)}
                >
                  <Text style={styles.btnPrimaryText}>Ouvrir</Text>
                </Pressable>
                <Pressable style={styles.btnDanger} onPress={() => terminate(s.id)}>
                  <Text style={styles.btnDangerText}>Couper</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Text style={[styles.h, { marginTop: Spacing.xl }]}>Historique</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>Aucun historique récent.</Text>
          ) : null}
          {history.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.title}>{s.title || 'Live'}</Text>
              <Text style={styles.meta}>{s.status || 'ended'}</Text>
              <Pressable
                style={styles.btnGhost}
                onPress={() =>
                  router.push({ pathname: '/live/replay', params: { id: s.id } } as never)
                }
              >
                <Text style={styles.btnGhostText}>Replay (si dispo)</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  h: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  empty: { color: Colors.textMuted, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  meta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnDanger: {
    flex: 1,
    backgroundColor: '#B91C1C44',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnDangerText: { color: '#FCA5A5', fontWeight: '700' },
  btnGhost: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  btnGhostText: { color: Colors.primary, fontWeight: '600' },
});
