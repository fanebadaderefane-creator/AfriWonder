import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/components/common/ToastProvider';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMobileDeviceSettings, updateMobileDeviceSettings } from '../../src/services/mobileApiService';
import { useAuthStore } from '../../src/store/authStore';
import type { AppPalette } from '../../src/theme/themePalettes';

type SettingsRow = {
  icon: string;
  label: string;
  route?: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  detail?: string;
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
  return <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />;
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
  const [notifications] = useState(true);
  const [darkMode, setDarkMode] = useState(user?.theme === 'dark');
  const [dataEconomy, setDataEconomy] = useState(Boolean(user?.data_saver_mode));
  const [autoplay, setAutoplay] = useState(true);
  const [languageLabel, setLanguageLabel] = useState('Francais');

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
      } catch {
        /* keep local fallbacks */
      } finally {
        setLoading(false);
      }
    })();
  }, [updateUser]);

  const persistDeviceSettings = useCallback(async (payload: Record<string, unknown>) => {
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
      return true;
    } catch {
      return false;
    }
  }, [updateUser]);

  const darkModeToggle = useCallback(
    (value: boolean) => {
      setDarkMode(value);
      void (async () => {
        const ok = await persistDeviceSettings({ theme: value ? 'dark' : 'system' });
        if (ok) {
          showToast({ message: 'Préférence enregistrée', type: 'success' });
        } else {
          setDarkMode(!value);
          showToast({ message: 'Impossible de synchroniser. Réessayez.', type: 'error' });
        }
      })();
    },
    [persistDeviceSettings, showToast]
  );

  const autoplayToggle = useCallback((value: boolean) => {
    setAutoplay(value);
  }, []);

  const settingsSections: SettingsSection[] = [
    {
      title: 'Compte',
      items: [
        { icon: 'person', label: 'Modifier le profil', route: '/profile-edit' },
        { icon: 'lock-closed', label: 'Confidentialite', route: '/settings/privacy' },
        { icon: 'shield-checkmark', label: 'Securite', route: '/settings/security' },
        { icon: 'location', label: 'Adresses', route: '/profile-edit' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Notifications', route: '/settings/notifications', detail: notifications ? 'Activees' : 'Coupees' },
        { icon: 'moon', label: 'Mode sombre', toggle: true, value: darkMode, onToggle: darkModeToggle },
        { icon: 'cellular', label: 'Economie de donnees', route: '/settings/data-saver', detail: dataEconomy ? 'Activee' : 'Desactivee' },
        { icon: 'play-circle', label: 'Lecture auto', toggle: true, value: autoplay, onToggle: autoplayToggle },
        { icon: 'download-outline', label: 'Telechargements hors ligne', route: '/downloads' },
        { icon: 'heart', label: 'Centres d\'interet', route: '/interests' },
        { icon: 'language', label: 'Langue', route: '/settings/language', detail: languageLabel },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'FAQ', route: '/faq' },
        { icon: 'chatbubble', label: 'Support', route: '/support-page' },
        { icon: 'star', label: 'Noter l\'app' },
        { icon: 'share-social', label: 'Partager AfriWonder' },
      ],
    },
    {
      title: 'Informations',
      items: [
        { icon: 'information-circle', label: 'A propos', route: '/about' },
        { icon: 'pulse-outline', label: 'Diagnostics release', route: '/settings/release-preflight' },
        { icon: 'document-text', label: 'Conditions d\'utilisation', route: '/terms' },
        { icon: 'shield', label: 'Politique de confidentialite', route: '/privacy-policy' },
        { icon: 'code-slash', label: 'Version', detail: '2.1.0' },
      ],
    },
  ];

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
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.settingItem, index < section.items.length - 1 && styles.settingBorder]}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <SettingTrailing item={item} colors={colors} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
          <Ionicons name="log-out" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Se deconnecter</Text>
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
  });
}
