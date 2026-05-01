/**
 * Web : react-native-agora est natif uniquement. Placeholder aligné sur l'API
 * native pour que les écrans rides/stars compilent sur le bundle web.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import type { StarCallRtcOptions, StarCallRtcResult } from './useStarCallRtc.d';

export function useStarCallRtc(_opts: StarCallRtcOptions): StarCallRtcResult {
  const LocalView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => (
    <View style={[styles.placeholder, style as ViewStyle]}>
      <Text style={styles.text}>Appel vidéo : utilisez l'application mobile</Text>
    </View>
  ), []);
  const RemoteView = useCallback(({ style }: { style?: StyleProp<ViewStyle> }) => (
    <View style={[styles.placeholder, style as ViewStyle]} />
  ), []);
  return {
    joined: false,
    error: 'Appel vidéo non disponible sur le web',
    remoteJoined: false,
    audioFallback: false,
    LocalView,
    RemoteView,
  };
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  text: { color: '#ccc', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
});
