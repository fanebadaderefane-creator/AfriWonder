import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../src/theme/designSystem';

/**
 * Phase 8 — Route inconnue (404) mobile.
 */
export default function NotFoundScreen() {
  return (
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={72} color={Colors.textMuted} accessibilityHidden />
        <Text style={styles.title}>Page introuvable</Text>
        <Text style={styles.sub}>Ce contenu n’existe pas ou a été déplacé.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
        >
          <Ionicons name="home-outline" size={22} color="#000" />
          <Text style={styles.btnText}>Retour à l’accueil</Text>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: { color: Colors.text, fontSize: FontSizes.xxxl, fontWeight: '800', marginTop: Spacing.lg, textAlign: 'center' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 12,
    borderRadius: BorderRadius.pill,
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: FontSizes.lg },
});
