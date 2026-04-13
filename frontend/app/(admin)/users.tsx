import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { AdminSubScreenHeader } from '../../src/components/admin/AdminSubScreenHeader';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { API_ROUTES } from '../../src/config/api';

type AdminUserRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  account_suspended?: boolean | null;
  created_at?: string;
};

export default function AdminUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(
    async (p: number, append: boolean) => {
      try {
        const res = await apiClient.get(API_ROUTES.ADMIN_USERS, {
          params: { page: p, limit: 30 },
        });
        const data = res.data?.data ?? res.data;
        const users = (data?.users ?? []) as AdminUserRow[];
        const tp = Number(data?.pagination?.totalPages) || 1;
        setTotalPages(tp);
        setPage(p);
        setItems((prev) => (append ? [...prev, ...users] : users));
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1, false).finally(() => setRefreshing(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q),
    );
  }, [items, query]);

  const banUser = (u: AdminUserRow) => {
    Alert.alert(
      'Suspendre le compte',
      `${u.email || u.username} — durée 7 jours (modifiable côté API).`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Suspendre',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post(`/admin/users/${u.id}/ban`, {
                banType: 'suspend',
                reason: 'moderation_mobile',
                description: 'Action depuis console mobile admin',
                durationDays: 7,
              });
              Alert.alert('OK', 'Compte suspendu.');
              void load(1, false);
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.error || 'Échec');
            }
          },
        },
      ],
    );
  };

  const restoreUser = (u: AdminUserRow) => {
    Alert.alert('Restaurer', u.email || u.username || u.id, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Restaurer',
        onPress: async () => {
          try {
            await apiClient.put(`/admin/users/${u.id}/restore`, {});
            Alert.alert('OK', 'Compte restauré.');
            void load(1, false);
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Échec');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminSubScreenHeader title="Utilisateurs" />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Filtrer email, pseudo, nom…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          onEndReached={() => {
            if (page < totalPages) void load(page + 1, true);
          }}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun utilisateur (ou filtre trop strict).</Text>
          }
          renderItem={({ item: u }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{u.full_name || u.username || '—'}</Text>
              <Text style={styles.meta}>{u.email}</Text>
              <Text style={styles.metaSmall}>
                Rôle : {u.role || '—'} · {u.account_suspended ? 'Suspendu' : 'Actif'}
              </Text>
              <View style={styles.actions}>
                {u.account_suspended ? (
                  <Pressable style={styles.btnSecondary} onPress={() => restoreUser(u)}>
                    <Text style={styles.btnSecondaryText}>Restaurer</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.btnDanger} onPress={() => banUser(u)}>
                    <Text style={styles.btnDangerText}>Suspendre</Text>
                  </Pressable>
                )}
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
  searchWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  search: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  name: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  meta: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4 },
  metaSmall: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm },
  btnDanger: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: '#B91C1C33',
  },
  btnDangerText: { color: '#FCA5A5', fontWeight: '600', fontSize: FontSizes.sm },
  btnSecondary: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '33',
  },
  btnSecondaryText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.sm },
});
