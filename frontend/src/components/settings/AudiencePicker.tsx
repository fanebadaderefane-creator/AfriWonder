import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Liste exclusive type "audience" (Everyone / Friends / Only me / No one).
 * Réutilisée par : Activity status, Wonder list, Liked videos, Mentions, Comments, Direct messages.
 */
export type AudienceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export function AudiencePicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: AudienceOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.card}>
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        const last = idx === options.length - 1;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.6}
            onPress={() => onChange(opt.value)}
            style={[styles.row, !last && styles.rowDivider]}
          >
            <View style={styles.left}>
              <Text style={styles.label}>{opt.label}</Text>
              {opt.description ? <Text style={styles.desc}>{opt.description}</Text> : null}
            </View>
            {selected ? <Ionicons name="checkmark" size={22} color="#FF2D55" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 18,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.07)' },
  left: { flex: 1, minWidth: 0, paddingRight: 12 },
  label: { color: '#111', fontSize: 16, fontWeight: '600' },
  desc: { color: '#8C8C8C', fontSize: 13, marginTop: 4 },
});

export default AudiencePicker;
