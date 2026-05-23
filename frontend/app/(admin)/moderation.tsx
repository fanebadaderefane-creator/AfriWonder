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
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const moderationApiMessage = (e: unknown) => {
    const err = (e as { response?: { data?: { error?: unknown; message?: string } } })?.response?.data?.error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: string }).message === 'string') {
      return (err as { message: string }).message;
    }
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return msg || 'Action refusée (droits modération requis).';
  };

  const submitReview = async (id: string, status: 'resolved' | 'dismissed') => {
    const notesByStatus: Record<'resolved' | 'dismissed', string> = {
      resolved: 'admin_action:resolve_report',
      dismissed: 'admin_action:dismiss_report',
    };

    const tryPut = (nextStatus: string) =>
      apiClient.put(API_ROUTES.MODERATION_REPORT_REVIEW(id), {
        status: nextStatus,
        notes: notesByStatus[status],
      });
    const tryPatch = (nextStatus: string) =>
      apiClient.patch(API_ROUTES.MODERATION_REPORT_REVIEW(id), {
        status: nextStatus,
        notes: notesByStatus[status],
      });

    try {
      await tryPut(status);
      return;
    } catch (firstError: unknown) {
      const code = (firstError as { response?: { status?: number } })?.response?.status;
      if (status === 'dismissed') {
        try {
          await tryPut('ignored');
          return;
        } catch {
          // continue fallback
        }
      }
      if (code !== 404 && code !== 405) throw firstError;
      try {
        await tryPatch(status);
      } catch (secondError: unknown) {
        if (status !== 'dismissed') throw secondError;
        await tryPatch('ignored');
      }
    }
  };

  const review = (id: string, status: 'resolved' | 'dismissed') => {
    Alert.alert('Confirmer', `Statut : ${status}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            setProcessingId(id);
            await submitReview(id, status);
            setReports((prev) => prev.filter((r) => r.id !== id));
            Alert.alert('OK', status === 'dismissed' ? 'Signalement ignoré.' : 'Signalement résolu.');
          } catch (e: unknown) {
            Alert.alert('Erreur', moderationApiMessage(e));
          } finally {
            setProcessingId(null);
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
                <Pressable
                  style={[styles.btnOk, processingId === r.id ? styles.btnDisabled : null]}
                  onPress={() => review(r.id, 'resolved')}
                  disabled={processingId === r.id}
                >
                  <Text style={styles.btnOkText}>Résolu</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnDismiss, processingId === r.id ? styles.btnDisabled : null]}
                  onPress={() => review(r.id, 'dismissed')}
                  disabled={processingId === r.id}
                >
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
  btnDisabled: { opacity: 0.6 },
});
