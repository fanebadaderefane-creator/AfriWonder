import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';

/** Bandeau discret : parcours alimenté par des données de démonstration (pas de partenaire réel). */
export function DemoContentBanner() {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.text}>Contenu de démonstration — données fictives</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.primary + '28',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
