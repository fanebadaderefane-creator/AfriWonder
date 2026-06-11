import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  name: string;
  text: string;
  isMine: boolean;
  onPress: () => void;
};

/** Citation de réponse dans une bulle — style WhatsApp, cliquable. */
export function ReplyQuoteBlock({ name, text, isMine, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.quote, isMine ? styles.quoteMine : styles.quoteTheirs]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Aller au message de ${name}`}
    >
      <View style={[styles.bar, isMine ? styles.barMine : styles.barTheirs]} />
      <View style={styles.content}>
        <Text style={[styles.name, isMine ? styles.nameMine : styles.nameTheirs]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.snippet} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  quote: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  quoteMine: { backgroundColor: 'rgba(0,92,75,0.08)' },
  quoteTheirs: { backgroundColor: 'rgba(0,0,0,0.05)' },
  bar: { width: 4 },
  barMine: { backgroundColor: '#06CF9C' },
  barTheirs: { backgroundColor: '#1FA855' },
  content: { flex: 1, paddingHorizontal: 8, paddingVertical: 6 },
  name: { fontSize: 12.5, fontWeight: '600', marginBottom: 2 },
  nameMine: { color: '#06CF9C' },
  nameTheirs: { color: '#1FA855' },
  snippet: { color: '#667781', fontSize: 12, lineHeight: 16 },
});
