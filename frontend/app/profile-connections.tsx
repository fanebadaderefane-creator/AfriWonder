import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../src/api/client';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';
import { Colors, Spacing, FontSizes, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';

type Row = {
  id: string;
  username?: string;
  full_name?: string;
  profile_image?: string | null;
  is_following?: boolean;
};

export default function ProfileConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string | string[] }>();
  const m = (Array.isArray(mode) ? mode[0] : mode) === 'following' ? 'following' : 'followers';
  const { user } = useAuthStore();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const path = m === 'following' ? `/users/${user.id}/following` : `/users/${user.id}/followers`;
      const res = await apiClient.get(path, { params: { page: 1, limit: 100 } });
      const data = res.data?.data ?? res.data;
      const list = m === 'following' ? data?.following : data?.followers;
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Erreur';
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, m]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = async (item: Row) => {
    if (!user?.id || item.id === user.id) return;
    setFollowBusyId(item.id);
    try {
      const res = await apiClient.post(`/users/${item.id}/follow`, {});
      const d = res.data?.data ?? res.data;
      if (d?.requestPending) {
        Alert.alert('Compte privé', 'Demande de suivi envoyée. Vous serez abonné après acceptation.');
        return;
      }
      const next = Boolean(d?.following);
      setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, is_following: next } : r)));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } | string } } };
      const raw = ax.response?.data?.error;
      const msg =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && 'message' in raw
            ? String((raw as { message: string }).message)
            : 'Action impossible';
      Alert.alert('Erreur', String(msg).slice(0, 200));
    } finally {
      setFollowBusyId(null);
    }
  };

  const confirmUnfollow = (item: Row) => {
    Alert.alert('Ne plus suivre', `@${item.username || item.full_name || 'ce compte'} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ne plus suivre', style: 'destructive', onPress: () => void toggleFollow(item) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{m === 'following' ? 'Suivi(e)s' : 'Abonnés'}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} size="large" />
      ) : err ? (
        <Text style={styles.err}>{err}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const uri = toAbsoluteMediaUrl(item.profile_image || '').trim() || `https://i.pravatar.cc/100?u=${item.id}`;
            const q = item.username ? `@${item.username}` : item.full_name || '';
            const isSelf = user?.id === item.id;
            const showFollow = Boolean(user?.id) && !isSelf;
            const following = Boolean(item.is_following);
            const busy = followBusyId === item.id;

            return (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => {
                    if (q) router.push({ pathname: '/search', params: { q } });
                  }}
                  activeOpacity={0.75}
                >
                  <Image source={{ uri }} style={styles.avatar} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.full_name || item.username || '—'}
                    </Text>
                    {item.username ? (
                      <Text style={styles.handle} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                {showFollow ? (
                  <TouchableOpacity
                    style={[styles.followBtn, following && styles.followBtnOutline]}
                    onPress={() => (following ? confirmUnfollow(item) : void toggleFollow(item))}
                    disabled={busy}
                    activeOpacity={0.85}
                    accessibilityLabel={following ? 'Ne plus suivre' : 'Suivre en retour'}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={following ? Colors.primary : '#FFF'} />
                    ) : (
                      <Text style={[styles.followBtnText, following && styles.followBtnTextOutline]}>
                        {following ? 'Abonné' : m === 'followers' ? 'Suivre en retour' : 'Suivre'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Aucun compte pour l’instant.</Text>}
        />
      )}
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
    borderBottomColor: '#222',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  err: { color: '#FF6B6B', padding: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a1a',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 0,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface },
  name: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  handle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  followBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
  },
  followBtnText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '700' },
  followBtnTextOutline: { color: Colors.text },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl },
});
