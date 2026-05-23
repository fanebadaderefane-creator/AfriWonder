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
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

type MonReq = {
  id: string;
  creator_id?: string;
  creator?: { username?: string; full_name?: string; email?: string };
};

type Verif = {
  id: string;
  status?: string;
  user_id?: string;
  user?: { username?: string; email?: string; full_name?: string };
};

export default function AdminCreatorsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monetization, setMonetization] = useState<MonReq[]>([]);
  const [verifications, setVerifications] = useState<Verif[]>([]);

  const load = useCallback(async () => {
    try {
      const [m, v] = await Promise.all([
        apiClient.get(API_ROUTES.ADMIN_MONETIZATION_REQUESTS),
        apiClient.get(API_ROUTES.ADMIN_VERIFICATIONS, { params: { page: 1, limit: 30 } }),
      ]);
      const md = m.data?.data ?? m.data;
      const vd = v.data?.data ?? v.data;
      setMonetization(Array.isArray(md) ? md : []);
      const vlist = vd?.verifications as Verif[] | undefined;
      setVerifications(Array.isArray(vlist) ? vlist : []);
    } catch {
      setMonetization([]);
      setVerifications([]);
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

  const approveMon = (id: string) => {
    Alert.alert('Approuver la monétisation', id.slice(0, 8), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Approuver',
        onPress: async () => {
          try {
            await apiClient.post(`/admin/monetization-requests/${id}/approve`, {});
            void load();
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Échec');
          }
        },
      },
    ]);
  };

  const rejectMon = (id: string) => {
    Alert.alert('Rejeter la demande', 'Raison par défaut : non éligible (mobile).', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/admin/monetization-requests/${id}/reject`, {
              reason: 'Rejet depuis console mobile admin',
            });
            void load();
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Échec');
          }
        },
      },
    ]);
  };

  const patchVerif = (id: string, status: 'approved' | 'rejected') => {
    Alert.alert('Vérification', status, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await apiClient.patch(`/admin/verifications/${id}`, { status });
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
      <AdminSubScreenHeader title="Créateurs" />
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
        >
          <Text style={styles.h}>Demandes de monétisation</Text>
          {monetization.length === 0 ? (
            <Text style={styles.empty}>Aucune demande en attente.</Text>
          ) : null}
          {monetization.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.title}>
                {r.creator?.full_name || r.creator?.username || r.creator_id}
              </Text>
              <Text style={styles.meta}>{r.creator?.email}</Text>
              <View style={styles.row}>
                <Pressable style={styles.btnOk} onPress={() => approveMon(r.id)}>
                  <Text style={styles.btnOkText}>Approuver</Text>
                </Pressable>
                <Pressable style={styles.btnNo} onPress={() => rejectMon(r.id)}>
                  <Text style={styles.btnNoText}>Rejeter</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Text style={[styles.h, { marginTop: Spacing.xl }]}>Vérifications (KYC / vendeur)</Text>
          {verifications.length === 0 ? (
            <Text style={styles.empty}>Aucune entrée récente.</Text>
          ) : null}
          {verifications.map((x) => (
            <View key={x.id} style={styles.card}>
              <Text style={styles.title}>
                {x.user?.full_name || x.user?.username || x.user_id || x.id.slice(0, 8)}
              </Text>
              <Text style={styles.meta}>{x.user?.email || x.status || '—'}</Text>
              <View style={styles.row}>
                <Pressable style={styles.btnOk} onPress={() => patchVerif(x.id, 'approved')}>
                  <Text style={styles.btnOkText}>Approuver</Text>
                </Pressable>
                <Pressable style={styles.btnNo} onPress={() => patchVerif(x.id, 'rejected')}>
                  <Text style={styles.btnNoText}>Rejeter</Text>
                </Pressable>
              </View>
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
  title: { color: Colors.text, fontWeight: '600' },
  meta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btnOk: {
    flex: 1,
    backgroundColor: '#065F4622',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnOkText: { color: '#34D399', fontWeight: '700' },
  btnNo: {
    flex: 1,
    backgroundColor: '#7F1D1D33',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnNoText: { color: '#FCA5A5', fontWeight: '700' },
});
