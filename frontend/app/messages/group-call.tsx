import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { useGroupCallRtc } from '../../src/hooks/useGroupCallRtc';
import { Colors, FontSizes, Spacing } from '../../src/theme/colors';
import { safeRouterBack } from '../../src/utils/safeRouter';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';

export default function GroupCallScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const callId = String(params.callId || '').trim();
  const callType = String(params.type || 'audio') === 'video' ? 'video' : 'audio';
  const audioOnly = callType === 'audio';

  const [joinReady, setJoinReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) {
      setLoadError('Appel introuvable.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await apiClient.post(`/group-calls/${encodeURIComponent(callId)}/join`);
        if (!cancelled) setJoinReady(true);
      } catch (e: unknown) {
        if (!cancelled) setLoadError(getAlertMessageForCaughtError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callId]);

  const {
    joined,
    error: rtcError,
    remoteUids,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    leave,
    AgoraLocalView,
    AgoraRemoteGrid,
  } = useGroupCallRtc({
    callId,
    enabled: joinReady,
    audioOnly,
  });

  const handleLeave = useCallback(() => {
    Alert.alert('Quitter l’appel', 'Voulez-vous quitter cet appel groupe ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await leave();
              if (callId) {
                await apiClient.post(`/group-calls/${encodeURIComponent(callId)}/leave`).catch(() => {});
              }
            } finally {
              safeRouterBack('/messages');
            }
          })();
        },
      },
    ]);
  }, [callId, leave]);

  const statusError = loadError || rtcError;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Appel groupe {audioOnly ? 'audio' : 'vidéo'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {statusError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{statusError}</Text>
        </View>
      ) : !joinReady || !joined ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.hint}>Connexion en cours…</Text>
        </View>
      ) : (
        <View style={styles.mediaArea}>
          {!audioOnly ? (
            <>
              <AgoraLocalView style={styles.localVideo} />
              <AgoraRemoteGrid style={styles.remoteGrid} uids={remoteUids} />
            </>
          ) : (
            <View style={styles.audioOnly}>
              <Ionicons name="people" size={48} color={Colors.primary} />
              <Text style={styles.hint}>
                {remoteUids.length + 1} participant{remoteUids.length + 1 > 1 ? 's' : ''} connecté
                {remoteUids.length + 1 > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={toggleMic} accessibilityLabel="Micro">
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={26} color="#FFF" />
        </TouchableOpacity>
        {!audioOnly ? (
          <TouchableOpacity style={styles.ctrlBtn} onPress={toggleCam} accessibilityLabel="Caméra">
            <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={26} color="#FFF" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.ctrlBtn, styles.hangup]}
          onPress={handleLeave}
          accessibilityLabel="Raccrocher"
        >
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B141A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  hint: { color: 'rgba(255,255,255,0.75)', marginTop: Spacing.md, fontSize: FontSizes.sm },
  errorText: { color: '#F87171', textAlign: 'center' },
  mediaArea: { flex: 1, padding: Spacing.sm },
  localVideo: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: Spacing.sm },
  remoteGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  audioOnly: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangup: { backgroundColor: '#E53935' },
});
