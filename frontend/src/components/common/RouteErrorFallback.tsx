import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import { MIN_TOUCH_TARGET } from '../../theme/designSystem';

export function RouteErrorFallback({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="warning-outline" size={64} color={Colors.warning} accessibilityHidden />
      <Text style={styles.title}>Une erreur est survenue</Text>
      <Text style={styles.sub} numberOfLines={5}>
        {error?.message || 'Réessayez dans un instant.'}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => void retry()} accessibilityRole="button" accessibilityLabel="Réessayer">
        <Ionicons name="refresh" size={22} color="#000" />
        <Text style={styles.btnText}>Réessayer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.link} onPress={() => router.replace('/(tabs)')} accessibilityRole="button" accessibilityLabel="Retour à l’accueil">
        <Text style={styles.linkText}>Accueil</Text>
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
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: '800', marginTop: Spacing.lg, textAlign: 'center' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.md, textAlign: 'center' },
  btn: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BorderRadius.pill,
    paddingVertical: 12,
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: FontSizes.lg },
  link: { marginTop: Spacing.lg, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  linkText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '600' },
});
