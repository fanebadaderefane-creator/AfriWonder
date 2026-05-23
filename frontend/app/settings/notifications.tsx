import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import notificationService from '../../src/services/notificationService';
import { useAuthStore } from '../../src/store/authStore';

const ITEMS = [
  { key: 'messages', label: 'Messages', detail: 'Push et notifications locales pour les nouveaux messages.' },
  { key: 'interactions', label: 'Likes et commentaires', detail: 'Alerte quand quelqu’un interagit avec votre contenu.' },
  { key: 'lives', label: 'Lives', detail: 'Recevoir les démarrages de live et les cadeaux.' },
  { key: 'admin', label: 'Messages AfriWonder', detail: 'Annonces plateforme, modération et retraits.' },
];

const PLACEHOLDER_EAS_PROJECT_ID = '00000000-0000-4000-8000-000000000000';

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [syncing, setSyncing] = useState(false);

  const onSyncPush = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Notifications', 'Les push Web nécessitent une configuration VAPID dans app.json.');
      return;
    }
    if (Constants.appOwnership === 'expo') {
      Alert.alert(
        'Expo Go',
        'Les notifications distantes nécessitent un development build (EAS) avec un vrai projectId.',
      );
      return;
    }
    const raw =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const projectId = typeof raw === 'string' ? raw.trim() : '';
    if (!projectId || projectId === PLACEHOLDER_EAS_PROJECT_ID) {
      Alert.alert(
        'Configuration EAS',
        'Renseignez un vrai `extra.eas.projectId` dans app.json (Expo Dashboard → Project ID), puis rebuild.',
      );
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour enregistrer le token sur le serveur.');
      return;
    }
    setSyncing(true);
    try {
      const mod = await import('expo-notifications');
      const { status: existing } = await mod.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await mod.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission refusée', 'Activez les notifications dans les réglages du téléphone.');
        return;
      }
      await notificationService.syncPushTokenWithBackend();
      if (!notificationService.token) {
        Alert.alert('Token indisponible', 'Vérifiez le projectId EAS et refaites un build natif.');
        return;
      }
      Alert.alert('OK', 'Token push synchronisé avec le compte.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Synchronisation impossible.');
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.intro}>
          Après connexion, le token est envoyé au backend (`POST /api/mobile/push-token`). Si vous vous connectez après
          le premier lancement, utilisez le bouton ci-dessous. Un development build EAS avec un vrai `projectId` est
          requis pour FCM/APNs (pas Expo Go).
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void onSyncPush()}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel="Synchroniser les notifications push"
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Autoriser et synchroniser le push</Text>
          )}
        </TouchableOpacity>
        {ITEMS.map((item) => (
          <View key={item.key} style={styles.card}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
          </View>
        ))}
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  intro: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: 6 },
  detail: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
});
