import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import apiClient from '../src/api/client';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';

const TEXT_MAIN = '#000000';
const TEXT_MUTED = 'rgba(0,0,0,0.60)';
const DIVIDER = 'rgba(0,0,0,0.10)';
const LIVE_PINK = '#FF2D55';
const CONNECT_PURPLE = '#7B4DFF';

type NearbyUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_image: string | null;
  is_verified: boolean;
  distance_m: number;
  is_following: boolean;
};

/**
 * Écran « Connect Now ».
 * Demande la permission de localisation, envoie un heartbeat toutes les 30 s
 * à `POST /friends/presence`, et interroge `GET /friends/nearby` pour lister
 * les comptes proches (rayon 500 m par défaut).
 *
 * Quand l'écran perd le focus ou l'utilisateur ferme, on `DELETE /friends/presence`
 * pour retirer immédiatement sa propre position.
 */
export default function ConnectNowScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'idle' | 'locating' | 'sharing' | 'denied' | 'unsupported'>('idle');
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const leavePresence = useCallback(async () => {
    activeRef.current = false;
    stopHeartbeat();
    try {
      await apiClient.delete('/friends/presence');
    } catch {
      /* best effort */
    }
  }, [stopHeartbeat]);

  const sendHeartbeat = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!activeRef.current) return;
      await apiClient.post('/friends/presence', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      const res = await apiClient.get('/friends/nearby', { params: { radius: 1000 } });
      const data = res.data?.data ?? res.data;
      setNearby(Array.isArray(data?.nearby) ? (data.nearby as NearbyUser[]) : []);
    } catch {
      /* silencieux : on réessaie au prochain tick */
    }
  }, []);

  const enablePresence = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setStatus('denied');
        return;
      }
      activeRef.current = true;
      setStatus('sharing');
      await sendHeartbeat();
      heartbeatRef.current = setInterval(() => void sendHeartbeat(), 30000);
    } catch {
      setStatus('denied');
    }
  }, [sendHeartbeat]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        setStatus('unsupported');
        return () => undefined;
      }
      return () => {
        void leavePresence();
      };
    }, [leavePresence])
  );

  useEffect(() => {
    return () => {
      void leavePresence();
    };
  }, [leavePresence]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await sendHeartbeat();
    setRefreshing(false);
  }, [sendHeartbeat]);

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

  const distanceLabel = (m: number) => {
    if (m < 100) return 'à quelques pas';
    if (m < 1000) return `${m} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect Now</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          status === 'sharing' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CONNECT_PURPLE} />
          ) : undefined
        }
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroIcon}>
            <Ionicons name="radio-outline" size={32} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Trouvez des amis autour de vous</Text>
          <Text style={styles.heroSubtitle}>
            AfriWonder utilise votre position approximative (5 minutes) pour afficher les
            utilisateurs à proximité. Votre position n'est jamais stockée.
          </Text>
        </View>

        {status === 'idle' ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => void enablePresence()}
            activeOpacity={0.85}
          >
            <Ionicons name="locate" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Activer la localisation</Text>
          </TouchableOpacity>
        ) : null}

        {status === 'locating' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={CONNECT_PURPLE} />
            <Text style={styles.mutedText}>Recherche de votre position…</Text>
          </View>
        ) : null}

        {status === 'denied' ? (
          <View style={styles.noteBox}>
            <Ionicons name="warning-outline" size={18} color={LIVE_PINK} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>Localisation refusée</Text>
              <Text style={styles.noteText}>
                Ouvrez les réglages pour autoriser la localisation et retentez.
              </Text>
            </View>
          </View>
        ) : null}

        {status === 'unsupported' ? (
          <View style={styles.noteBox}>
            <Ionicons name="phone-portrait-outline" size={18} color={TEXT_MAIN} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>Uniquement sur mobile</Text>
              <Text style={styles.noteText}>
                Connect Now nécessite un appareil mobile (localisation native).
              </Text>
            </View>
          </View>
        ) : null}

        {status === 'sharing' ? (
          <>
            <View style={styles.sharingRow}>
              <View style={styles.sharingDot} />
              <Text style={styles.sharingText}>Position active · mise à jour auto</Text>
              <TouchableOpacity
                onPress={() => void leavePresence().then(() => setStatus('idle'))}
                style={styles.stopBtn}
              >
                <Text style={styles.stopBtnText}>Arrêter</Text>
              </TouchableOpacity>
            </View>

            {nearby.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={48} color={TEXT_MUTED} />
                <Text style={styles.emptyTitle}>Personne dans les 1 km autour de vous</Text>
                <Text style={styles.emptyText}>
                  Invitez un ami à ouvrir « Connect Now » près de vous pour vous connecter.
                </Text>
              </View>
            ) : (
              nearby.map((u) => {
                const alreadyFollowing = u.is_following || followingIds.has(u.id);
                const avatar =
                  toAbsoluteMediaUrl(u.profile_image || '').trim() ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.username || 'User')}&background=7B4DFF&color=fff&size=128&bold=true`;
                return (
                  <View key={u.id} style={styles.nearbyRow}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } } as never)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    </TouchableOpacity>
                    <View style={styles.nearbyInfo}>
                      <Text style={styles.nearbyName} numberOfLines={1}>
                        {u.full_name || u.username || 'Utilisateur'}
                        {u.is_verified ? '  ✓' : ''}
                      </Text>
                      <Text style={styles.nearbyMeta}>
                        @{(u.username || '').replace(/^@+/, '')} · {distanceLabel(u.distance_m)}
                      </Text>
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
                        {alreadyFollowing ? 'Dans son Wonder' : 'Wonder'}
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
  heroWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CONNECT_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: TEXT_MAIN, textAlign: 'center' },
  heroSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 6,
    backgroundColor: CONNECT_PURPLE,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  centered: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  mutedText: { color: TEXT_MUTED, fontSize: 13 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.25)',
  },
  noteTitle: { color: TEXT_MAIN, fontWeight: '700' },
  noteText: { color: TEXT_MUTED, fontSize: 13, marginTop: 2 },
  sharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(123,77,255,0.08)',
  },
  sharingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CONNECT_PURPLE,
  },
  sharingText: { flex: 1, color: TEXT_MAIN, fontSize: 13, fontWeight: '600' },
  stopBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  stopBtnText: { color: LIVE_PINK, fontWeight: '700', fontSize: 12 },
  emptyWrap: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEE' },
  nearbyInfo: { flex: 1, minWidth: 0 },
  nearbyName: { color: TEXT_MAIN, fontSize: 15, fontWeight: '700' },
  nearbyMeta: { color: TEXT_MUTED, fontSize: 13, marginTop: 2 },
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
