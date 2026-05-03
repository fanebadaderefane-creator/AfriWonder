import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/components/common/ToastProvider';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getMobileDeviceSettings, updateMobileDeviceSettings } from '../../src/services/mobileApiService';
import { useAuthStore } from '../../src/store/authStore';
import type { AppPalette } from '../../src/theme/themePalettes';
import { STORAGE_APP_THEME, STORAGE_FEED_AUTOPLAY } from '../../src/constants/storageKeys';
import { isExpoGoApp } from '../../src/config/expoRuntime';

type RowAction = 'none' | 'rate' | 'share' | 'version';

type SettingsRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: Href;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  detail?: string;
  action?: RowAction;
};

type SettingsSection = { title: string; items: SettingsRow[] };

function SettingTrailing({ item, colors }: { item: SettingsRow; colors: AppPalette }) {
  const detailStyles = useMemo(() => StyleSheet.create({ settingDetail: { color: colors.textSecondary, fontSize: FontSizes.md } }), [colors.textSecondary]);
  if (item.toggle && typeof item.value === 'boolean' && item.onToggle) {
    return (
      <Switch
        value={item.value}
        onValueChange={item.onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.text}
      />
    );
  }
  if (item.detail != null) {
    return <Text style={detailStyles.settingDetail}>{item.detail}</Text>;
  }
  if (item.action === 'version') {
    return <Text style={detailStyles.settingDetail}>{String(Constants.expoConfig?.version ?? '1.0.0')}</Text>;
  }
  return <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />;
}

function openAppStore() {
  const android = 'com.afriwonder.app';
  const playHttps = `https://play.google.com/store/apps/details?id=${android}`;
  if (Platform.OS === 'android') {
    void Linking.openURL(`market://details?id=${android}`).catch(() => Linking.openURL(playHttps));
    return;
  }
  if (Platform.OS === 'ios') {
    const id = (Constants.expoConfig?.extra as { appStoreId?: string } | undefined)?.appStoreId;
    if (id) {
      void Linking.openURL(`https://apps.apple.com/app/id${id}`);
    } else {
      void Linking.openURL('https://apps.apple.com/search?term=AfriWonder');
    }
    return;
  }
  void Linking.openURL(playHttps);
}

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  const [notifLabel, setNotifLabel] = useState('…');
  const [darkMode, setDarkMode] = useState(user?.theme === 'dark');
  const [dataEconomy, setDataEconomy] = useState(Boolean(user?.data_saver_mode));
  const [autoplay, setAutoplay] = useState(true);
  const [languageLabel, setLanguageLabel] = useState('Francais');

  const refreshNotifLabel = useCallback(() => {
    if (Platform.OS === 'web') {
      setNotifLabel('Web');
      return;
    }
    if (isExpoGoApp()) {
      setNotifLabel('Expo Go');
      return;
    }
    void (async () => {
      try {
        const mod = await import('expo-notifications');
        const { status } = await mod.getPermissionsAsync();
        setNotifLabel(status === 'granted' ? 'Activées' : 'Désactivées');
      } catch {
        setNotifLabel('—');
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNotifLabel();
    }, [refreshNotifLabel])
  );

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_FEED_AUTOPLAY).then((v) => {
      if (v !== null) setAutoplay(v === '1');
    });
  }, []);

  useEffect(() => {
    if (user?.theme != null) setDarkMode(user.theme === 'dark');
  }, [user?.theme]);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getMobileDeviceSettings();
        setDataEconomy(Boolean(settings.data_saver_mode));
        setDarkMode(settings.theme === 'dark');
        if (settings.preferred_language === 'en') setLanguageLabel('English');
        else if (settings.preferred_language === 'bm') setLanguageLabel('Bambara');
        else if (settings.preferred_language === 'wo') setLanguageLabel('Wolof');
        else setLanguageLabel('Francais');
        updateUser({
          data_saver_mode: settings.data_saver_mode,
          preferred_language: settings.preferred_language,
          timezone: settings.timezone,
          theme: settings.theme,
          preferred_categories: settings.preferred_categories,
          messaging_e2e_enabled: settings.messaging_e2e_enabled,
          messaging_read_receipts_enabled: settings.messaging_read_receipts_enabled,
          messaging_cdc_moderation: settings.messaging_cdc_moderation,
        });
        const th0 = String(settings.theme || '').trim();
        if (th0 === 'dark' || th0 === 'light' || th0 === 'system') {
          void AsyncStorage.setItem(STORAGE_APP_THEME, th0);
        }
      } catch {
        /* keep local fallbacks */
      } finally {
        setLoading(false);
      }
    })();
  }, [updateUser]);

  const persistDeviceSettings = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const updated = await updateMobileDeviceSettings(payload);
        updateUser({
          data_saver_mode: updated.data_saver_mode,
          preferred_language: updated.preferred_language,
          timezone: updated.timezone,
          theme: updated.theme,
          preferred_categories: updated.preferred_categories,
          messaging_e2e_enabled: updated.messaging_e2e_enabled,
          messaging_read_receipts_enabled: updated.messaging_read_receipts_enabled,
          messaging_cdc_moderation: updated.messaging_cdc_moderation,
        });
        const th = String(updated.theme || '').trim();
        if (th === 'dark' || th === 'light' || th === 'system') {
          void AsyncStorage.setItem(STORAGE_APP_THEME, th);
        }
        return true;
      } catch {
        return false;
      }
    },
    [updateUser]
  );

  const darkModeToggle = useCallback(
    (value: boolean) => {
      const nextTheme = value ? 'dark' : 'light';
      setDarkMode(value);
      updateUser({ theme: nextTheme });
      void AsyncStorage.setItem(STORAGE_APP_THEME, nextTheme);
      void (async () => {
        const ok = await persistDeviceSettings({ theme: nextTheme });
        if (ok) {
          showToast({ message: 'Préférence enregistrée', type: 'success' });
        } else {
          // Mobile (Android/iOS): garder le thème local même si la synchro backend échoue.
          // L'utilisateur ne doit pas perdre son choix visuel à cause du réseau.
          showToast({ message: 'Mode appliqué localement. Synchronisation en attente.', type: 'info' });
        }
      })();
    },
    [persistDeviceSettings, showToast, updateUser]
  );

  const autoplayToggle = useCallback((value: boolean) => {
    setAutoplay(value);
    void AsyncStorage.setItem(STORAGE_FEED_AUTOPLAY, value ? '1' : '0');
  }, []);

  const onRowAction = useCallback(
    (item: SettingsRow) => {
      if (item.action === 'rate') {
        openAppStore();
        return;
      }
      if (item.action === 'share') {
        void Share.share({
          message: 'Découvrez AfriWonder — la plateforme des créateurs africains.',
          title: 'AfriWonder',
        });
        return;
      }
      if (item.route) {
        router.push(item.route);
      }
    },
    []
  );

  const settingsSections: SettingsSection[] = useMemo(
    () => [
      {
        title: 'Compte',
        items: [
          { icon: 'person', label: 'Modifier le profil', route: '/profile-edit' },
          { icon: 'lock-closed', label: 'Confidentialite', route: '/settings/privacy' },
          { icon: 'shield-checkmark', label: 'Securite', route: '/settings/security' },
          { icon: 'location', label: 'Adresses', route: '/settings/addresses' },
        ],
      },
      {
        title: 'Preferences',
        items: [
          { icon: 'notifications', label: 'Notifications', route: '/settings/notifications', detail: notifLabel },
          { icon: 'moon', label: 'Mode sombre', toggle: true, value: darkMode, onToggle: darkModeToggle },
          { icon: 'cellular', label: 'Economie de donnees', route: '/settings/data-saver', detail: dataEconomy ? 'Activee' : 'Desactivee' },
          { icon: 'play-circle', label: 'Lecture auto', toggle: true, value: autoplay, onToggle: autoplayToggle },
          { icon: 'download-outline', label: 'Telechargements hors ligne', route: '/downloads' },
          { icon: 'heart', label: "Centres d'interet", route: '/interests' },
          { icon: 'language', label: 'Langue', route: '/settings/language', detail: languageLabel },
        ],
      },
      {
        title: 'Support',
        items: [
          { icon: 'alert-circle-outline', label: 'Signaler un probleme', route: '/settings/feedback' },
          { icon: 'help-circle', label: 'FAQ', route: '/faq' },
          { icon: 'chatbubble', label: 'Support', route: '/support-page' },
          { icon: 'star', label: "Noter l'app", action: 'rate' as const },
          { icon: 'share-social', label: 'Partager AfriWonder', action: 'share' as const },
        ],
      },
      {
        title: 'Informations',
        items: [
          { icon: 'information-circle', label: 'A propos', route: '/about' },
          { icon: 'pulse-outline', label: 'Diagnostics release', route: '/settings/release-preflight' },
          { icon: 'document-text', label: "Conditions d'utilisation", route: '/terms' },
          { icon: 'shield', label: 'Politique de confidentialite', route: '/privacy-policy' },
          { icon: 'code-slash', label: 'Version', action: 'version' as const },
        ],
      },
    ],
    [notifLabel, darkMode, darkModeToggle, dataEconomy, autoplay, autoplayToggle, languageLabel]
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parametres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;
                const canNavigate = Boolean(item.route) && !item.toggle;
                const isPressable = item.toggle
                  ? false
                  : Boolean(item.route) || item.action === 'rate' || item.action === 'share' || false;

                const inner = (
                  <>
                    <View style={styles.settingLeft}>
                      <Ionicons name={item.icon} size={22} color={colors.primary} />
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <SettingTrailing item={item} colors={colors} />
                  </>
                );

                if (item.toggle) {
                  return (
                    <View
                      key={`${section.title}-${item.label}`}
                      style={[styles.settingItem, !isLast && styles.settingBorder]}
                      accessibilityLabel={item.label}
                    >
                      {inner}
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={`${section.title}-${item.label}`}
                    style={[styles.settingItem, !isLast && styles.settingBorder]}
                    onPress={() => (isPressable ? onRowAction(item) : undefined)}
                    activeOpacity={canNavigate || item.action ? 0.7 : 1}
                    disabled={!isPressable}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    {inner}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
          <Ionicons name="log-out" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => router.push('/settings/delete-account' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Supprimer définitivement mon compte"
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createSettingsStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
    },
    backBtn: {
      minWidth: MIN_TOUCH_TARGET,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: colors.text },
    content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
    section: { marginBottom: Spacing.xxl },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: FontSizes.sm,
      fontWeight: '600',
      marginBottom: Spacing.sm,
      textTransform: 'uppercase',
    },
    sectionCard: { backgroundColor: colors.surface, borderRadius: BorderRadius.lg },
    settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
    settingBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    settingLabel: { color: colors.text, fontSize: FontSizes.md },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.md,
    },
    logoutText: { color: colors.error, fontSize: FontSizes.md, fontWeight: '600' },
    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      marginTop: Spacing.sm,
    },
    deleteAccountText: { color: colors.error, fontSize: FontSizes.sm, fontWeight: '500', textDecorationLine: 'underline' },
  });
}
