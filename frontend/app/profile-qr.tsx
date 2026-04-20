import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';

const TEXT_MAIN = '#000000';
const TEXT_MUTED = 'rgba(0,0,0,0.60)';
const DIVIDER = 'rgba(0,0,0,0.10)';
const LIVE_PINK = '#FF2D55';

type QrPayload = {
  type: string;
  user_id: string;
  username: string;
  app_link: string;
  web_link: string;
};

/** QR visuel via API publique (évite d'ajouter une dépendance native `react-native-qrcode-svg`). */
function buildQrImageUri(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=M&data=${encodeURIComponent(data)}`;
}

export default function ProfileQrScreen() {
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<'my' | 'scan'>('my');
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);

  const loadQr = useCallback(async () => {
    try {
      const res = await apiClient.get('/friends/qrcode');
      const data = res.data?.data ?? res.data;
      setPayload((data?.payload || null) as QrPayload | null);
    } catch {
      /** Fallback 100% local si l'endpoint n'est pas dispo (pas de perte de fonctionnalité). */
      const handle = (authUser?.username || '').replace(/^@+/, '');
      setPayload({
        type: 'afriwonder.user',
        user_id: authUser?.id || '',
        username: handle,
        app_link: authUser?.id ? `afriwonder://user/${authUser.id}` : '',
        web_link: handle
          ? `https://afri-wonder.vercel.app/user/${encodeURIComponent(handle)}`
          : 'https://afri-wonder.vercel.app/',
      });
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, authUser?.username]);

  useEffect(() => {
    void loadQr();
  }, [loadQr]);

  const qrValue = useMemo(() => {
    if (!payload) return '';
    // On encode un payload JSON simple — lisible par toute lecture QR :
    // un client AfriWonder le reconnaît, les autres lecteurs ouvrent directement le lien web.
    return payload.web_link || payload.app_link || '';
  }, [payload]);

  const qrUri = qrValue ? buildQrImageUri(qrValue) : '';

  const handleShare = async () => {
    if (!payload) return;
    const msg = `Suis-moi sur AfriWonder — @${payload.username}\n${payload.web_link}`;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'AfriWonder', text: msg, url: payload.web_link });
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        await Clipboard.setStringAsync(msg);
        Alert.alert('QR', 'Lien copié dans le presse-papiers.');
      } catch {
        /* annulé */
      }
      return;
    }
    try {
      await Share.share({ title: 'AfriWonder', message: msg });
    } catch {
      /* annulé */
    }
  };

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await Clipboard.setStringAsync(payload.web_link);
      Alert.alert('QR', 'Lien profil copié.');
    } catch {
      /* annulé */
    }
  };

  const handleScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanLocked) return;
      setScanLocked(true);
      const raw = String(data || '').trim();
      if (!raw) {
        setScanLocked(false);
        return;
      }
      /** afriwonder://user/:id — ou URL web afri-wonder.vercel.app/user/:handle. */
      const matchApp = raw.match(/afriwonder:\/\/user\/([A-Za-z0-9-_]+)/i);
      const matchWeb = raw.match(/\/user\/([A-Za-z0-9_.-]+)(?:[/?#]|$)/i);
      const matchProfile = raw.match(/_userId=([A-Za-z0-9-_]+)/i);
      if (matchApp) {
        router.replace({ pathname: '/user/[id]', params: { id: matchApp[1] } } as never);
        return;
      }
      if (matchWeb) {
        router.replace({ pathname: '/search', params: { q: matchWeb[1] } } as never);
        return;
      }
      if (matchProfile) {
        router.replace({ pathname: '/user/[id]', params: { id: matchProfile[1] } } as never);
        return;
      }
      Alert.alert(
        'QR non reconnu',
        'Ce QR ne correspond pas à un profil AfriWonder. Contenu : ' + raw.slice(0, 120),
        [
          { text: 'Réessayer', onPress: () => setScanLocked(false) },
          { text: 'Fermer', style: 'cancel', onPress: () => router.back() },
        ],
      );
    },
    [scanLocked],
  );

  const webScanFallback = Platform.OS === 'web';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={12} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR code</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('my')}>
          <Text style={[styles.tabLabel, tab === 'my' && styles.tabLabelActive]}>My code</Text>
          {tab === 'my' ? <View style={styles.tabUnderline} /> : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('scan')}>
          <Text style={[styles.tabLabel, tab === 'scan' && styles.tabLabelActive]}>Scan</Text>
          {tab === 'scan' ? <View style={styles.tabUnderline} /> : null}
        </TouchableOpacity>
      </View>

      {tab === 'my' ? (
        <View style={styles.myCodeWrap}>
          {loading ? (
            <ActivityIndicator color={LIVE_PINK} />
          ) : qrUri ? (
            <>
              <View style={styles.qrFrame}>
                <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
              </View>
              <Text style={styles.qrHandle}>@{payload?.username}</Text>
              {payload?.web_link ? (
                <Text style={styles.qrLink} numberOfLines={1}>
                  {payload.web_link.replace(/^https?:\/\//i, '')}
                </Text>
              ) : null}
              <View style={styles.qrActions}>
                <TouchableOpacity style={styles.qrActionBtn} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={TEXT_MAIN} />
                  <Text style={styles.qrActionLabel}>Copier le lien</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.qrActionBtn, styles.qrActionBtnPrimary]} onPress={handleShare}>
                  <Ionicons name="share-social" size={18} color="#FFF" />
                  <Text style={styles.qrActionLabelPrimary}>Partager</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Impossible de générer votre QR.</Text>
          )}
        </View>
      ) : (
        <View style={styles.scanWrap}>
          {webScanFallback ? (
            <View style={styles.scanFallback}>
              <Ionicons name="scan-outline" size={64} color={TEXT_MUTED} />
              <Text style={styles.scanFallbackTitle}>Scan indisponible sur le web</Text>
              <Text style={styles.scanFallbackText}>
                Ouvrez AfriWonder sur mobile pour scanner un QR code.
              </Text>
            </View>
          ) : !permission ? (
            <View style={styles.scanFallback}>
              <ActivityIndicator color={LIVE_PINK} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.scanFallback}>
              <Ionicons name="camera-outline" size={64} color={TEXT_MUTED} />
              <Text style={styles.scanFallbackTitle}>Autoriser la caméra</Text>
              <Text style={styles.scanFallbackText}>
                AfriWonder a besoin de la caméra pour scanner un QR code.
              </Text>
              <TouchableOpacity style={styles.scanPermBtn} onPress={() => void requestPermission()}>
                <Text style={styles.scanPermBtnText}>Autoriser</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanLocked ? undefined : handleScanned}
              />
              <View style={styles.scanOverlay} pointerEvents="none">
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Alignez le QR AfriWonder dans le cadre</Text>
              </View>
            </View>
          )}
        </View>
      )}
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { color: TEXT_MUTED, fontSize: 15, fontWeight: '600' },
  tabLabelActive: { color: TEXT_MAIN, fontWeight: '700' },
  tabUnderline: {
    marginTop: 6,
    width: 40,
    height: 2,
    backgroundColor: TEXT_MAIN,
    borderRadius: 1,
  },
  myCodeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  qrFrame: {
    width: 280,
    height: 280,
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  qrImage: { width: '100%', height: '100%' },
  qrHandle: { marginTop: 16, fontSize: 17, fontWeight: '700', color: TEXT_MAIN },
  qrLink: { color: TEXT_MUTED, fontSize: 13, marginTop: 4, maxWidth: 260 },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F1F2',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 6,
  },
  qrActionBtnPrimary: { backgroundColor: LIVE_PINK },
  qrActionLabel: { color: TEXT_MAIN, fontSize: 14, fontWeight: '700' },
  qrActionLabelPrimary: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyText: { color: TEXT_MUTED, fontSize: 14 },

  scanWrap: { flex: 1, backgroundColor: '#000' },
  scanFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFF',
  },
  scanFallbackTitle: { color: TEXT_MAIN, fontSize: 17, fontWeight: '700', marginTop: 12 },
  scanFallbackText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  scanPermBtn: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: LIVE_PINK,
  },
  scanPermBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cameraContainer: { flex: 1, backgroundColor: '#000', position: 'relative' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 16,
  },
  scanHint: {
    position: 'absolute',
    bottom: 80,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
