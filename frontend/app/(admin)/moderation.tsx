import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

type ReportRow = {
  id: string;
  status?: string;
  content_type?: string;
  content_id?: string;
  reason?: string;
  description?: string | null;
  created_at?: string;
  reporter?: { username?: string | null };
};

export default function AdminModerationScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ROUTES.MODERATION_REPORTS, {
        params: { status: 'pending', limit: 50 },
      });
      const data = res.data?.data ?? res.data;
      const list = (data?.reports ?? []) as ReportRow[];
      setReports(Array.isArray(list) ? list : []);
    } catch {
      setReports([]);
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

  const review = (id: string, status: string) => {
    Alert.alert('Confirmer', `Statut : ${status}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await apiClient.put(`/moderation/reports/${id}/review`, {
              status,
              notes: 'mobile_admin',
            });
            void load();
          } catch (e: any) {
            const msg = e?.response?.data?.error || 'Action refusée (rôle modérateur requis côté API).';
            Alert.alert('Erreur', String(msg));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminSubScreenHeader title="Modération" />
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun signalement en attente.</Text>
          }
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <Text style={styles.type}>
                {r.content_type || 'contenu'} · {r.content_id?.slice(0, 8) || '—'}
              </Text>
              <Text style={styles.reason}>{r.reason || '—'}</Text>
              {r.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {r.description}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                Par @{r.reporter?.username || '?'} · {r.status}
              </Text>
              <View style={styles.row}>
                <Pressable style={styles.btnOk} onPress={() => review(r.id, 'resolved')}>
                  <Text style={styles.btnOkText}>Résolu</Text>
                </Pressable>
                <Pressable style={styles.btnDismiss} onPress={() => review(r.id, 'dismissed')}>
                  <Text style={styles.btnDismissText}>Ignorer</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  type: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  reason: { fontSize: FontSizes.md, color: Colors.text, marginTop: Spacing.sm },
  desc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  meta: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btnOk: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: '#065F4622',
    alignItems: 'center',
  },
  btnOkText: { color: '#34D399', fontWeight: '600' },
  btnDismiss: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  btnDismissText: { color: Colors.textSecondary, fontWeight: '600' },
});
