import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';

export type FeedPollPayload = {
  id: string;
  options: string[];
  counts?: number[];
  total_votes: number;
  expires_at: string;
  expired: boolean;
  my_vote: number | null;
};

type Props = {
  poll: FeedPollPayload | null | 'loading';
  voting?: boolean;
  onVote: (optionIndex: number) => void | Promise<void>;
};

export default function FeedPollCard({ poll, voting, onVote }: Props) {
  const counts = useMemo(() => {
    if (poll === 'loading' || !poll) return [] as number[];
    return Array.isArray(poll.counts) ? poll.counts : [];
  }, [poll]);

  const sumCounts = useMemo(() => {
    if (poll === 'loading' || !poll) return 0;
    return counts.reduce((a, b) => a + (Number(b) || 0), 0);
  }, [counts, poll]);

  if (poll === 'loading') {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }
  if (!poll || poll.expired || !poll.options?.length) return null;

  return (
    <View style={styles.wrap} accessibilityLabel="Sondage vidéo">
      <Text style={styles.title}>Sondage</Text>
      {poll.options.map((label, i) => {
        const c = counts[i] ?? 0;
        const pct = sumCounts <= 0 ? 0 : Math.round((c / sumCounts) * 100);
        const selected = poll.my_vote === i;
        return (
          <TouchableOpacity
            key={`${poll.id}-opt-${i}`}
            style={[styles.optionRow, selected && styles.optionRowSelected]}
            onPress={() => void onVote(i)}
            disabled={voting || poll.my_vote === i}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Voter ${label}, ${pct} pour cent`}
          >
            <View style={[styles.optionFill, { width: `${pct}%` }]} />
            <View style={styles.optionInner}>
              <Text style={styles.optionLabel} numberOfLines={2}>
                {label}
              </Text>
              <Text style={styles.optionPct}>{pct}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.meta}>
        {sumCounts} vote{sumCounts > 1 ? 's' : ''} · 24h max
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    maxWidth: 280,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  optionRow: {
    borderRadius: BorderRadius.md,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 40,
    justifyContent: 'center',
  },
  optionRowSelected: {
    borderColor: Colors.primary,
  },
  optionFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,193,7,0.22)',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  optionLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginRight: 8,
  },
  optionPct: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  meta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
});
