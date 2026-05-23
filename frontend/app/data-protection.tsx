import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';

/** Écran « Protection des données » — équivalent PWA `DataProtection` ; détail juridique aussi sur la politique. */
export default function DataProtectionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Protection des données</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.xxl }]}>
        <Text style={styles.p}>
          AfriWonder applique les mêmes principes de traitement des données personnelles que sur la PWA : finalités
          limitées, minimisation, sécurité et droits d’accès, de rectification et de suppression lorsque la loi
          l’exige.
        </Text>
        <Text style={styles.p}>
          Pour l’exhaustivité des engagements et mentions légales, consultez également la politique de confidentialité.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/privacy-policy')} activeOpacity={0.8}>
          <Ionicons name="document-text-outline" size={20} color={Colors.background} />
          <Text style={styles.linkBtnText}>Politique de confidentialité</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.lg },
  p: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  linkBtnText: { color: Colors.background, fontWeight: '700', fontSize: FontSizes.md },
});
