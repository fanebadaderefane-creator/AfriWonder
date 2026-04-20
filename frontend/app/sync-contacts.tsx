import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Crypto from 'expo-crypto';
import apiClient from '../src/api/client';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';

const TEXT_MAIN = '#000000';
const TEXT_MUTED = 'rgba(0,0,0,0.60)';
const DIVIDER = 'rgba(0,0,0,0.10)';
const LIVE_PINK = '#FF2D55';
const CONTACT_GREEN = '#25D366';

type Match = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_verified: boolean;
  is_following: boolean;
};

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/**
 * Écran « Sync contacts ».
 *  - Explique précisément ce qui est envoyé (hashes SHA-256 uniquement).
 *  - Toggle opt-in RGPD.
 *  - Collecte des identifiants :
 *      • web / fallback : champ multi-ligne (emails ou téléphones, séparés par virgule/retour).
 *      • natif : bouton « Importer depuis mon carnet d'adresses » (si `expo-contacts`
 *        est installé). Non-disponible sur web.
 *  - Hash local, appel `POST /friends/contacts/sync`, liste des matchs avec bouton Follow.
 */
export default function SyncContactsScreen() {
  const insets = useSafeAreaInsets();
  const [consent, setConsent] = useState(false);
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);

  const parsed = useMemo(() => {
    return String(raw || '')
      .split(/[,;\n\r\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [raw]);

  const handleSync = useCallback(async () => {
    if (!consent) {
      Alert.alert(
        'Consentement requis',
        'Activez le partage avant de lancer la synchronisation. Seuls des hash SHA-256 sont envoyés.',
      );
      return;
    }
    if (parsed.length === 0) {
      Alert.alert('Aucun contact', 'Ajoutez au moins un email ou numéro à vérifier.');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const hashes = new Set<string>();
      for (const entry of parsed.slice(0, 2000)) {
        const cleanedPhone = normalizePhone(entry);
        if (cleanedPhone.length >= 6) {
          hashes.add(await sha256Hex(cleanedPhone));
        }
        if (entry.includes('@')) {
          hashes.add(await sha256Hex(normalizeEmail(entry)));
        }
      }
      if (hashes.size === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }
      const res = await apiClient.post('/friends/contacts/sync', {
        hashes: Array.from(hashes),
      });
      const data = res.data?.data ?? res.data;
      setMatches(Array.isArray(data?.matches) ? (data.matches as Match[]) : []);
    } catch {
      setMatches([]);
      Alert.alert('Erreur', 'Synchronisation impossible. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  }, [consent, parsed]);

  const handleFollow = useCallback(async (id: string) => {
    try {
      setFollowingIds((s) => new Set([...s, id]));
      await apiClient.post(`/users/${id}/follow`);
    } catch {
      setFollowingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      Alert.alert('Erreur', 'Impossible de suivre ce compte.');
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find contacts</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.heroWrap}>
          <View style={styles.heroIcon}>
            <Ionicons name="call-outline" size={28} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Trouvez vos amis AfriWonder</Text>
          <Text style={styles.heroSubtitle}>
            Aucune donnée brute n'est envoyée. Vos emails et numéros sont transformés en
            empreintes cryptographiques (SHA-256) avant l'appel. Vous pouvez révoquer à tout
            moment.
          </Text>
        </View>

        <View style={styles.consentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.consentTitle}>Sync contacts</Text>
            <Text style={styles.consentHint}>
              Active l'envoi des empreintes pour voir qui est déjà sur AfriWonder.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setConsent((v) => !v)}
            style={[styles.switch, consent && styles.switchOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.switchThumb, consent && styles.switchThumbOn]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>
          {Platform.OS === 'web'
            ? 'Saisissez emails / numéros (séparés par virgule ou retour à la ligne)'
            : 'Saisissez ou collez vos contacts'}
        </Text>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder={'exemple@mail.com, 90000000\nami@example.com'}
          placeholderTextColor={TEXT_MUTED}
          multiline
          editable={consent}
          style={[styles.textarea, !consent && { opacity: 0.5 }]}
        />
        <Text style={styles.counter}>
          {parsed.length} entrée{parsed.length > 1 ? 's' : ''} détectée{parsed.length > 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, (!consent || parsed.length === 0) && { opacity: 0.5 }]}
          disabled={!consent || parsed.length === 0 || loading}
          onPress={() => void handleSync()}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="sync" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Lancer la synchronisation</Text>
            </>
          )}
        </TouchableOpacity>

        {searched ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Résultats</Text>
              <Text style={styles.resultCount}>
                {matches.length} correspondance{matches.length > 1 ? 's' : ''}
              </Text>
            </View>

            {matches.length === 0 && !loading ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={44} color={TEXT_MUTED} />
                <Text style={styles.emptyTitle}>Aucun contact trouvé sur AfriWonder</Text>
                <Text style={styles.emptyText}>Invitez vos amis pour qu'ils rejoignent l'app.</Text>
              </View>
            ) : (
              matches.map((u) => {
                const alreadyFollowing = u.is_following || followingIds.has(u.id);
                const avatar =
                  toAbsoluteMediaUrl(u.profile_image || '').trim() ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.username || 'User')}&background=25D366&color=fff&size=128&bold=true`;
                return (
                  <View key={u.id} style={styles.matchRow}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } } as never)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.matchName} numberOfLines={1}>
                        {u.full_name || u.username || 'Utilisateur'}
                        {u.is_verified ? '  ✓' : ''}
                      </Text>
                      <Text style={styles.matchHandle}>@{(u.username || '').replace(/^@+/, '')}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.followBtn, alreadyFollowing && styles.followBtnSecondary]}
                      onPress={() => (alreadyFollowing ? null : void handleFollow(u.id))}
                      disabled={alreadyFollowing}
                    >
                      <Text
                        style={[
                          styles.followBtnText,
                          alreadyFollowing && styles.followBtnTextSecondary,
                        ]}
                      >
                        {alreadyFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: TEXT_MAIN },
  heroWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CONTACT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: TEXT_MAIN, textAlign: 'center' },
  heroSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    backgroundColor: '#F1F1F2',
    borderRadius: 10,
  },
  consentTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700' },
  consentHint: { color: TEXT_MUTED, fontSize: 12, marginTop: 2, lineHeight: 16 },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CCC',
    padding: 2,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: CONTACT_GREEN },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  sectionLabel: {
    color: TEXT_MAIN,
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  textarea: {
    marginHorizontal: 16,
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
    color: TEXT_MAIN,
    fontSize: 14,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } : {}),
  },
  counter: { color: TEXT_MUTED, fontSize: 12, marginHorizontal: 16, marginTop: 6 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 6,
    backgroundColor: CONTACT_GREEN,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 6,
  },
  resultTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700' },
  resultCount: { color: TEXT_MUTED, fontSize: 12 },
  emptyWrap: { alignItems: 'center', padding: 30, gap: 8 },
  emptyTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: TEXT_MUTED, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE' },
  matchName: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700' },
  matchHandle: { color: TEXT_MUTED, fontSize: 13, marginTop: 1 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: LIVE_PINK,
  },
  followBtnSecondary: { backgroundColor: '#F1F1F2' },
  followBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  followBtnTextSecondary: { color: TEXT_MAIN },
});
