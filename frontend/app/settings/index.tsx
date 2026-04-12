import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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

function SettingTrailing({ item }: { item: SettingsRow }) {
  if (item.toggle && typeof item.value === 'boolean' && item.onToggle) {
    return (
      <Switch
        value={item.value}
        onValueChange={item.onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.text}
      />
    );
  }
  if (item.detail != null) {
    return <Text style={styles.settingDetail}>{item.detail}</Text>;
  }
  return <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [dataEconomy, setDataEconomy] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  const settingsSections: SettingsSection[] = [
    {
      title: 'Compte',
      items: [
        { icon: 'person', label: 'Modifier le profil', route: '/profile-edit' },
        { icon: 'lock-closed', label: 'Confidentialite', route: '/privacy' },
        { icon: 'shield-checkmark', label: 'Securite', route: '/settings' },
        { icon: 'location', label: 'Adresses', route: '/settings' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Notifications', toggle: true, value: notifications, onToggle: setNotifications },
        { icon: 'moon', label: 'Mode sombre', toggle: true, value: darkMode, onToggle: setDarkMode },
        { icon: 'cellular', label: 'Economie de donnees', toggle: true, value: dataEconomy, onToggle: setDataEconomy },
        { icon: 'play-circle', label: 'Lecture auto', toggle: true, value: autoplay, onToggle: setAutoplay },
        { icon: 'heart', label: 'Centres d\'interet', route: '/interests' },
        { icon: 'language', label: 'Langue', detail: 'Francais' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'FAQ', route: '/faq' },
        { icon: 'chatbubble', label: 'Support', route: '/support' },
        { icon: 'star', label: 'Noter l\'app' },
        { icon: 'share-social', label: 'Partager AfriWonder' },
      ],
    },
    {
      title: 'Informations',
      items: [
        { icon: 'information-circle', label: 'A propos', route: '/about' },
        { icon: 'document-text', label: 'Conditions d\'utilisation', route: '/terms' },
        { icon: 'shield', label: 'Politique de confidentialite', route: '/privacy-policy' },
        { icon: 'code-slash', label: 'Version', detail: '2.1.0' },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
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
                  onPress={() => item.route && router.push(item.route as any)}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <SettingTrailing item={item} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  settingLabel: { color: Colors.text, fontSize: FontSizes.md },
  settingDetail: { color: Colors.textSecondary, fontSize: FontSizes.md },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.md },
  logoutText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '600' },
});
