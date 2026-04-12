import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | null;

const REACTIONS = [
  { type: 'like' as const, emoji: '👍', label: 'Aimer' },
  { type: 'love' as const, emoji: '❤️', label: 'Adorer' },
  { type: 'haha' as const, emoji: '😂', label: 'Haha' },
  { type: 'wow' as const, emoji: '😮', label: 'Wow' },
  { type: 'sad' as const, emoji: '😢', label: 'Triste' },
  { type: 'angry' as const, emoji: '😡', label: 'Grr' },
];

interface ReactionsProps {
  currentReaction: ReactionType;
  onReact: (reaction: ReactionType) => void;
  counts: Record<string, number>;
  totalCount: number;
  /** Si défini : tap sur « Commenter » (Moments / feed). */
  onCommentPress?: () => void;
  /** Si défini : tap sur « Partager ». */
  onSharePress?: () => void;
}

export function ReactionsBar({
  currentReaction,
  onReact,
  counts,
  totalCount,
  onCommentPress,
  onSharePress,
}: ReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const getReactionDisplay = () => {
    if (!currentReaction) return { emoji: '👍', label: 'Aimer', color: '#888' };
    const r = REACTIONS.find(r => r.type === currentReaction);
    return { emoji: r?.emoji || '👍', label: r?.label || 'Aimer', color: Colors.primary };
  };

  const display = getReactionDisplay();
  const topReactions = Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => REACTIONS.find(r => r.type === type)?.emoji || '👍');

  return (
    <View>
      {/* Reaction Picker Popup */}
      {showPicker && (
        <View style={styles.pickerContainer}>
          <View style={styles.picker}>
            {REACTIONS.map((reaction, i) => (
              <TouchableOpacity
                key={reaction.type}
                style={[
                  styles.pickerItem,
                  currentReaction === reaction.type && styles.pickerItemActive,
                ]}
                onPress={() => {
                  onReact(currentReaction === reaction.type ? null : reaction.type);
                  setShowPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Reaction Summary */}
      {totalCount > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryEmojis}>
            {topReactions.map((emoji, i) => (
              <Text key={i} style={[styles.summaryEmoji, { marginLeft: i > 0 ? -4 : 0 }]}>{emoji}</Text>
            ))}
          </View>
          <Text style={styles.summaryCount}>{totalCount}</Text>
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.65}
          onPress={() => {
            if (currentReaction) {
              onReact(null);
            } else {
              onReact('like');
            }
          }}
          onLongPress={() => setShowPicker(true)}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityLabel="Réagir"
        >
          <Text style={[styles.actionEmoji, { fontSize: currentReaction ? 18 : 16 }]}>
            {currentReaction ? display.emoji : '👍'}
          </Text>
          <Text
            style={[styles.actionLabel, { color: currentReaction ? Colors.primary : '#888' }]}
            numberOfLines={1}
          >
            {display.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.65}
          onPress={() => onCommentPress?.()}
          accessibilityRole="button"
          accessibilityLabel="Commenter"
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel} numberOfLines={1}>Commenter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.65}
          onPress={() => onSharePress?.()}
          accessibilityRole="button"
          accessibilityLabel="Partager"
        >
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionLabel}>Partager</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    position: 'absolute',
    bottom: 50,
    left: 8,
    zIndex: 100,
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pickerItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemActive: {
    backgroundColor: '#333',
    transform: [{ scale: 1.2 }],
  },
  pickerEmoji: {
    fontSize: 26,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  summaryEmojis: {
    flexDirection: 'row',
  },
  summaryEmoji: {
    fontSize: 16,
  },
  summaryCount: {
    color: '#888',
    fontSize: 13,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#222',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    gap: 4,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
