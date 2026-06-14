import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

const BAR_COUNT = 28;

/** Hauteurs pseudo-aléatoires stables par message (aspect waveform WhatsApp). */
function waveformHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const v = ((h + i * 17) % 100) / 100;
    return 0.25 + v * 0.75;
  });
}

type Props = {
  messageId: string;
  isMine: boolean;
  isPlaying: boolean;
  progress: number;
  listened?: boolean;
};

export function VoiceMessageWaveform({ messageId, isMine, isPlaying, progress, listened }: Props) {
  const heights = useMemo(() => waveformHeights(messageId), [messageId]);
  const playedBars = Math.floor(progress * BAR_COUNT);

  return (
    <View style={styles.row}>
      {heights.map((ratio, i) => {
        const active = isPlaying && i < playedBars;
        const played = !isPlaying && listened && i < BAR_COUNT * 0.85;
        const barColor = active || played
          ? isMine
            ? '#1DAA61'
            : '#53BDEB'
          : isMine
            ? 'rgba(17,27,33,0.35)'
            : 'rgba(17,27,33,0.28)';
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: 4 + ratio * 18,
                backgroundColor: barColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
    minHeight: 4,
  },
});
