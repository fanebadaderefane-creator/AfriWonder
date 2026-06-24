import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAgoraLiveRtc } from '../hooks/useAgoraLiveRtc';
import { opponentLiveIdFor } from './liveBattleTypes';
import type { LiveBattleState } from './liveBattleTypes';

const { width, height } = Dimensions.get('window');

/** Split-screen battle : vidéo principale + canal adversaire (audience). */
export function LiveBattleSplitLayout({
  battle,
  liveId,
  mainChildren,
  battleActive,
}: {
  battle: LiveBattleState | null;
  liveId: string;
  mainChildren: React.ReactNode;
  battleActive: boolean;
}) {
  const opponentId = battle ? opponentLiveIdFor(battle, liveId) : null;
  const { agoraJoined, AgoraRemoteView } = useAgoraLiveRtc({
    liveId: opponentId,
    role: 'audience',
    enabled: battleActive && !!opponentId,
  });

  if (!battleActive) return <>{mainChildren}</>;

  return (
    <View style={styles.split}>
      <View style={styles.half}>{mainChildren}</View>
      <View style={styles.half}>
        {agoraJoined && opponentId ? (
          <AgoraRemoteView style={styles.remote} />
        ) : (
          <View style={styles.remotePlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', width, height },
  half: { width: width / 2, height, overflow: 'hidden' },
  remote: { width: width / 2, height },
  remotePlaceholder: { flex: 1, backgroundColor: '#1a0a2e' },
});
