import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { DEFAULT_BACKEND_ORIGIN, getBackendOrigin } from '../src/config/backendBase';

const SUPER_ADMIN_EMAIL = (
  process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com'
).toLowerCase();

function isSuperAdmin(user: { email?: string } | null) {
  return user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
}

/**
 * Accès réservé — même email que la PWA (`VITE_SUPER_ADMIN_EMAIL`).
 * La console admin riche reste sur le web ; l’app mobile ouvre l’origine backend ou une URL PWA si configurée.
 */
export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const allowed = isSuperAdmin(user);

  const openAdminWeb = () => {
    const pwa = (process.env.EXPO_PUBLIC_WEB_APP_URL || '').replace(/\/$/, '');
    let origin = pwa || getBackendOrigin();
    if (!origin && typeof window !== 'undefined' && window.location?.origin) {
      origin = window.location.origin;
    }
    if (!origin) origin = DEFAULT_BACKEND_ORIGIN;
    const url = `${origin.replace(/\/$/, '')}/admin`;
    void Linking.openURL(url).catch(() => {});
  };

  if (!allowed) {
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
          <Text style={styles.headerTitle}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.denied}>Accès réservé au super-administrateur.</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Console admin</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.body, { paddingBottom: insets.bottom }]}>
        <Text style={styles.p}>
          L’interface d’administration complète est celle de la PWA. Vous pouvez ouvrir la console dans le navigateur
          (même session compte que sur mobile si SSO / cookie — sinon connectez-vous sur le web).
        </Text>
        <Pressable
          onPress={openAdminWeb}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryBtnText}>Ouvrir dans le navigateur</Text>
        </Pressable>
      </View>
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
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  body: { padding: Spacing.xl, gap: Spacing.lg },
  p: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  denied: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSizes.md },
});
