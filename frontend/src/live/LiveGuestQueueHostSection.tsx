import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontSizes, Spacing } from '../theme/colors';
import type { LiveGuestQueueRow } from './useLiveGuests';

export function LiveGuestQueueHostSection({
  queue,
  onAccept,
  onReject,
}: {
  queue: LiveGuestQueueRow[];
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
}) {
  if (queue.length === 0) {
    return <Text style={styles.muted}>File multi-guest vide — les spectateurs peuvent demander une place (8 max).</Text>;
  }

  return (
    <ScrollView style={{ maxHeight: 200 }}>
      {queue.map((q) => (
        <View key={q.user_id} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {q.username || 'Spectateur'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.accept} onPress={() => onAccept(q.user_id)}>
              <Text style={styles.btnText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reject} onPress={() => onReject(q.user_id)}>
              <Text style={styles.btnText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  muted: { color: Colors.textMuted, fontSize: FontSizes.sm },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  name: { color: Colors.text, fontWeight: '600', marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 8 },
  accept: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reject: { backgroundColor: 'rgba(248,113,113,0.35)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '700' },
});
