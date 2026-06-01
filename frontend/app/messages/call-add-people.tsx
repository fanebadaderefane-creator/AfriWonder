import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouterBack } from '../../src/utils/safeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import socketService from '../../src/services/socketService';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, FontSizes, Spacing } from '../../src/theme/colors';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';

type RowUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  profile_image: string | null;
  subtitle: string;
};

export default function CallAddPeopleScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const callId = String(params.callId || '').trim();
  const otherUserId = String(params.otherUserId || '').trim();
  const callType = String(params.type || 'audio') === 'video' ? 'video' : 'audio';

  const user = useAuthStore((s) => s.user);
  const myUserId = String(user?.id || '');
  const inviterName =
    (typeof user?.full_name === 'string' && user.full_name.trim()) ||
    (typeof user?.username === 'string' && user.username.trim()) ||
    'Vous';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [frequent, setFrequent] = useState<RowUser[]>([]);
  const [others, setOthers] = useState<RowUser[]>([]);

  const excludeIds = useMemo(() => new Set([myUserId, otherUserId].filter(Boolean)), [myUserId, otherUserId]);

  const load = useCallback(async () => {
    if (!myUserId) return;
    setLoading(true);
    setError(null);
    try {
      const [convRes, folRes] = await Promise.all([
        apiClient.get('/messages/conversations', { params: { page: 1, limit: 100, inbox: 'primary' } }),
        apiClient.get(`/users/${encodeURIComponent(myUserId)}/following`, { params: { page: 1, limit: 200 } }),
      ]);

      const convPayload = convRes.data?.data ?? convRes.data;
      const rawConvs = Array.isArray(convPayload?.conversations) ? convPayload.conversations : [];

      const frequentRows: RowUser[] = [];
      const seenFreq = new Set<string>();
      for (const c of rawConvs) {
        if (c?.is_group) continue;
        const other = c?.other;
        if (!other?.id || excludeIds.has(other.id)) continue;
        const lastText = typeof c.last_message_text === 'string' ? c.last_message_text.trim() : '';
        frequentRows.push({
          id: other.id,
          full_name: other.full_name ?? null,
          username: other.username ?? null,
          profile_image: other.profile_image ?? null,
          subtitle: lastText.length > 0 ? lastText.slice(0, 56) : other.username ? `@${other.username}` : '',
        });
        seenFreq.add(other.id);
      }

      const folPayload = folRes.data?.data ?? folRes.data;
      const rawFollowing = Array.isArray(folPayload?.following) ? folPayload.following : [];

      const otherRows: RowUser[] = [];
      for (const u of rawFollowing) {
        if (!u?.id || excludeIds.has(u.id) || seenFreq.has(u.id)) continue;
        otherRows.push({
          id: u.id,
          full_name: u.full_name ?? null,
          username: u.username ?? null,
          profile_image: u.profile_image ?? null,
          subtitle: u.username ? `@${u.username}` : '',
        });
      }

      setFrequent(frequentRows);
      setOthers(otherRows);
    } catch (e: unknown) {
      setError(getAlertMessageForCaughtError(e));
    } finally {
      setLoading(false);
    }
  }, [myUserId, excludeIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterRows = useCallback(
    (rows: RowUser[]) => {
      const q = query.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter((r) => {
        const name = (r.full_name || r.username || '').toLowerCase();
        const sub = r.subtitle.toLowerCase();
        return name.includes(q) || sub.includes(q);
      });
    },
    [query],
  );

  const sections = useMemo(() => {
    const f = filterRows(frequent);
    const o = filterRows(others);
    const out: { title: string; data: RowUser[] }[] = [];
    if (f.length > 0) out.push({ title: 'Contacts fréquents', data: f });
    if (o.length > 0) out.push({ title: 'Autres contacts', data: o });
    return out;
  }, [frequent, others, filterRows]);

  const totalContacts = frequent.length + others.length;

  const invite = useCallback(
    (row: RowUser) => {
      const label = row.full_name || row.username || 'Contact';
      const mediaLabel = callType === 'video' ? 'vidéo' : 'audio';
      const msg = `${label} recevra une notification pour rejoindre cet appel ${mediaLabel}.`;
      Alert.alert('Invitation', msg, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: () => {
            void (async () => {
              try {
                const ok = await socketService.ensureConnectedEmit('call:participant-invite', {
                  callId,
                  fromUserId: myUserId,
                  invitedUserId: row.id,
                  peerUserId: otherUserId,
                  type: callType,
                  inviterName,
                });
                if (!ok) {
                  Alert.alert('Invitation', 'Connexion temps réel indisponible. Réessayez.');
                  return;
                }
                router.back();
              } catch (e: unknown) {
                Alert.alert('Invitation', getAlertMessageForCaughtError(e));
              }
            })();
          },
        },
      ]);
    },
    [callId, callType, inviterName, myUserId, otherUserId],
  );

  const filteredTotal = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerHit}
          onPress={() => safeRouterBack('/messages')}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Ajouter des personnes</Text>
          <Text style={styles.headerSub}>
            {loading ? '…' : `${filteredTotal} contact${filteredTotal !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerHit}
          onPress={() => setSearchOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Rechercher"
        >
          <Ionicons name="search" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      {searchOpen ? (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un contact…"
            placeholderTextColor="#889095"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => {
            const displayName = item.full_name || item.username || 'Contact';
            const uri = profileAvatarUri(item.profile_image, displayName);
            return (
              <TouchableOpacity style={styles.row} onPress={() => invite(item)} activeOpacity={0.75}>
                <Image source={{ uri }} style={styles.avatarImg} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {totalContacts === 0
                ? 'Aucun contact à afficher. Suivez des personnes ou envoyez des messages pour les voir ici.'
                : 'Aucun résultat pour cette recherche.'}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: FontSizes.sm, color: '#667781', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: '#111', paddingVertical: 4 },
  errorText: { color: '#C62828', paddingHorizontal: Spacing.lg, marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: {
    fontSize: FontSizes.sm,
    color: '#667781',
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: '#F0F2F5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  rowText: { flex: 1, marginLeft: Spacing.md },
  rowName: { fontSize: FontSizes.lg, fontWeight: '600', color: '#111' },
  rowSub: { fontSize: FontSizes.sm, color: '#667781', marginTop: 2 },
  empty: {
    textAlign: 'center',
    color: '#667781',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    fontSize: FontSizes.md,
  },
});
