import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontSizes, BorderRadius } from '../../theme/colors';

/** Réactions vidéo (API `POST /videos/:id/like` body `type`) — sans ❤️ : le like reste sur la colonne d’actions. */
export const VIDEO_REACTION_TYPES = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'laugh', emoji: '😂', label: 'Rire' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'moving', emoji: '😢', label: 'Émouvant' },
  { type: 'strong', emoji: '💪', label: 'Force' },
  { type: 'african', emoji: '🌍', label: 'Africain' },
] as const;

type Props = {
  reactionCounts?: Record<string, number> | null;
  myReaction?: string | null;
  onPick: (type: string) => void | Promise<void>;
};

export function reactionEmojiForType(type: string): string {
  if (type === 'like') return '❤️';
  const row = VIDEO_REACTION_TYPES.find((r) => r.type === type);
  return row?.emoji ?? '✨';
}

export default function VideoReactionBar({ reactionCounts, myReaction, onPick }: Props) {
  return (
    <View style={styles.row}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {VIDEO_REACTION_TYPES.map((r) => {
          const count = reactionCounts?.[r.type] ?? 0;
          const active = myReaction === r.type;
          return (
            <TouchableOpacity
              key={r.type}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onPick(r.type)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${r.label}${count ? `, ${count}` : ''}`}
            >
              <Text style={styles.emoji}>{r.emoji}</Text>
              {count > 0 ? <Text style={styles.count}>{count > 99 ? '99+' : count}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    maxHeight: 52,
  },
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 6,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,193,7,0.18)',
  },
  emoji: {
    fontSize: 18,
  },
  count: {
    marginLeft: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
});
