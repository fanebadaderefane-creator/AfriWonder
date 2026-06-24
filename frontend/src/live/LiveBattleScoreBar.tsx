import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import type { LiveBattleState } from './liveBattleTypes';
import { battleSideForViewer } from './liveBattleTypes';

function formatScore(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

export function LiveBattleScoreBar({
  battle,
  liveId,
  topInset = 0,
}: {
  battle: LiveBattleState;
  liveId: string;
  topInset?: number;
}) {
  const total = Math.max(1, battle.challenger_score + battle.opponent_score);
  const leftPct = (100 * battle.challenger_score) / total;
  const remSec = Math.ceil((battle.remaining_ms ?? 0) / 1000);
  const mm = String(Math.floor(remSec / 60)).padStart(2, '0');
  const ss = String(remSec % 60).padStart(2, '0');
  const mySide = battleSideForViewer(battle, liveId);

  return (
    <View style={[styles.wrap, { top: topInset }]} pointerEvents="none">
      <View style={styles.timerRow}>
        <Text style={styles.vs}>VS</Text>
        <Text style={styles.timer}>
          {mm}:{ss}
        </Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, mySide === 'challenger' && styles.scoreHighlight]}>
          {formatScore(battle.challenger_score)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.leftFill, { width: `${leftPct}%` }]} />
          <View style={[styles.rightFill, { width: `${100 - leftPct}%` }]} />
        </View>
        <Text style={[styles.score, mySide === 'opponent' && styles.scoreHighlight]}>
          {formatScore(battle.opponent_score)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 14,
  },
  timerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 4 },
  vs: { color: '#FF3366', fontWeight: '900', fontSize: FontSizes.sm },
  timer: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, borderRadius: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  score: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm, minWidth: 36, textAlign: 'center' },
  scoreHighlight: { color: '#FDE68A' },
  track: { flex: 1, height: 8, borderRadius: BorderRadius.full, flexDirection: 'row', overflow: 'hidden' },
  leftFill: { height: '100%', backgroundColor: '#3B82F6' },
  rightFill: { height: '100%', backgroundColor: '#FF3366' },
});
