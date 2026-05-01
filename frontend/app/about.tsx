import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { profileAvatarUri } from '../src/utils/avatarFallback';
import { ImageOrPlaceholder } from '../src/components/common/ImageOrPlaceholder';

const SECTIONS = [
  { title: 'Notre Mission', text: 'AfriWonder est la premiere super-application africaine, concue pour connecter les communautes du Mali, du Senegal et de la Cote d\'Ivoire. Notre plateforme reunit commerce, services, divertissement et finance dans une seule application.' },
  { title: 'Notre Vision', text: 'Creer un ecosysteme numerique unifie pour l\'Afrique de l\'Ouest, en favorisant l\'inclusion financiere, le commerce local et la creation de contenu.' },
];

const STATS = [
  { label: 'Utilisateurs', value: '500K+', icon: 'people' },
  { label: 'Vendeurs', value: '10K+', icon: 'storefront' },
  { label: 'Transactions', value: '2M+', icon: 'card' },
  { label: 'Pays', value: '3', icon: 'globe' },
];

const TEAM = [
  { name: 'Abdoulaye Fane', role: 'Fondateur & CEO' },
  { name: 'Aminata Diallo', role: 'CTO' },
  { name: 'Moussa Traore', role: 'Design Lead' },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>A propos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Ionicons name="globe" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>AfriWonder</Text>
          <Text style={styles.appSlogan}>La Super-App Africaine</Text>
          <Text style={styles.version}>Version 2.1.0</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}

        {/* Team */}
        <Text style={styles.sectionTitle}>Notre Equipe</Text>
        {TEAM.map((member, i) => (
          <View key={i} style={styles.teamMember}>
            <ImageOrPlaceholder
              uri={profileAvatarUri(undefined, member.name)}
              style={styles.memberImage}
              icon="person"
              iconSize={28}
            />
            <View>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
          </View>
        ))}
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
  logoSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  appName: { color: Colors.text, fontSize: FontSizes.display, fontWeight: 'bold' },
  appSlogan: { color: Colors.primary, fontSize: FontSizes.lg },
  version: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  section: { marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  sectionText: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  teamMember: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  memberImage: { width: 48, height: 48, borderRadius: 24 },
  memberName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  memberRole: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
