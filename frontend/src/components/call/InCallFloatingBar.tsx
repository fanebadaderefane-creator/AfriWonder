import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCallDurationCompact } from '../../call/callStatusLine';
import { navigateToActiveAgoraCallScreen } from '../../call/navigateToActiveAgoraCallScreen';
import { logAfwCall } from '../../call/callDiagnosticLog';
import { useAgoraDmCallUiStore } from '../../call/agoraDmCallUiStore';

/** Bandeau vert « appel en cours » (style WhatsApp) quand l’écran d’appel est réduit. */
export function InCallFloatingBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = useAgoraDmCallUiStore((s) => s.active);
  const minimized = useAgoraDmCallUiStore((s) => s.minimized);
  const peerName = useAgoraDmCallUiStore((s) => s.peerName);
  const durationSeconds = useAgoraDmCallUiStore((s) => s.durationSeconds);
  const callState = useAgoraDmCallUiStore((s) => s.callState);
  const isVideoCall = useAgoraDmCallUiStore((s) => s.isVideoCall);

  const onCallScreen = pathname?.includes('/messages/call') ?? false;

  useEffect(() => {
    if (!active || onCallScreen) return;
    const id = setInterval(() => {
      const cur = useAgoraDmCallUiStore.getState();
      if (cur.callState === 'connected') {
        useAgoraDmCallUiStore.setState({ durationSeconds: cur.durationSeconds + 1 });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, callState, onCallScreen]);

  if (!active || callState === 'ended' || onCallScreen) return null;

  const label =
    callState === 'connected'
      ? formatCallDurationCompact(durationSeconds)
      : callState === 'connecting'
        ? 'Connexion…'
        : 'Appel…';

  const returnToCall = () => {
    logAfwCall('NAVIGATION', {
      action: 'floating_bar_resume',
      pathname,
      minimized,
      callState,
    });
    navigateToActiveAgoraCallScreen();
  };

  return (
    <TouchableOpacity
      style={[styles.bar, { top: insets.top + 4 }]}
      onPress={returnToCall}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel="Revenir à l’appel"
    >
      <Ionicons name={isVideoCall ? 'videocam' : 'call'} size={18} color="#FFF" />
      <Text style={styles.name} numberOfLines={1}>
        {peerName}
      </Text>
      <Text style={styles.timer}>{label}</Text>
      <Ionicons name="chevron-up" size={18} color="#FFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#128C7E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  name: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  timer: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '500' },
});
