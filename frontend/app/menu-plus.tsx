import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { goBackOrFallback } from '../src/utils/goBack';
import { featureFlags } from '../src/config/featureFlags';

const SUPER_ADMIN_EMAIL = (
  process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com'
).toLowerCase();

function isAdminUser(user: { email?: string; role?: string } | null) {
  return (
    user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'ADMIN'
  );
}

type MenuRow = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Chemin expo-router enregistré dans `app/`. */
  href: string;
  badge?: string;
  admin?: boolean;
};

type MenuSection = { title: string; items: MenuRow[] };

/** Aligné sur `MENU_SECTIONS` de la PWA (`src/components/navigation/MenuPlus.jsx`) — routes Expo équivalentes. */
const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Wallet & Paiements',
    items: [
      { label: 'Mon Wallet', icon: 'wallet-outline', href: '/wallet' },
      { label: 'Envoyer de l\'argent', icon: 'send-outline', href: '/wallet/transfer' },
      { label: 'Recharge crédit', icon: 'flash-outline', href: '/airtime', badge: 'Nouveau' },
      { label: 'Payer factures', icon: 'receipt-outline', href: '/bills', badge: 'Nouveau' },
      { label: 'Points fidélité', icon: 'ribbon-outline', href: '/loyalty' },
      { label: 'Abonnements', icon: 'diamond-outline', href: '/subscriptions' },
    ],
  },
  {
    title: 'COMMERCE & SERVICES',
    items: [
      { label: 'Marketplace', icon: 'cart-outline', href: '/(tabs)/market', badge: 'Nouveau' },
      { label: 'Événements', icon: 'ticket-outline', href: '/services/events' },
      { label: 'Transport', icon: 'car-outline', href: '/services/transport' },
      { label: 'Restauration', icon: 'restaurant-outline', href: '/services/food' },
      { label: 'Services', icon: 'flash-outline', href: '/services' },
      { label: 'Santé', icon: 'heart-outline', href: '/services/health' },
      { label: 'Immobilier', icon: 'business-outline', href: '/services/realestate' },
      { label: 'Assurances', icon: 'shield-outline', href: '/services/insurance' },
      { label: 'Prestataires', icon: 'construct-outline', href: '/seller' },
      { label: 'Actualités', icon: 'newspaper-outline', href: '/news' },
      { label: 'Microcrédit', icon: 'card-outline', href: '/wallet/microcredit' },
      { label: 'Crowdfunding', icon: 'radio-button-on-outline', href: '/crowdfunding' },
      { label: 'Emplois', icon: 'briefcase-outline', href: '/services/jobs' },
      { label: 'Mini-Apps', icon: 'apps-outline', href: '/miniapps', badge: 'Nouveau' },
    ],
  },
  {
    title: 'SOCIAL & MESSAGERIE',
    items: [
      { label: 'Publications & Sondages', icon: 'bar-chart-outline', href: '/feed' },
      { label: 'Défis', icon: 'flag-outline', href: '/challenges' },
    ],
  },
  {
    title: 'CRÉATEURS & LIVE',
    items: [
      { label: 'Créer', icon: 'add-circle-outline', href: '/(tabs)/create' },
      { label: 'Outils créateurs', icon: 'sparkles-outline', href: '/creator/earnings' },
      { label: 'Playlists', icon: 'albums-outline', href: '/playlists' },
      { label: 'Parrainage', icon: 'share-social-outline', href: '/referrals' },
      { label: 'Brand Deals', icon: 'briefcase-outline', href: '/brand-deals', badge: 'Nouveau' },
      { label: 'Mes campagnes pub', icon: 'megaphone-outline', href: '/creator/ads', badge: 'Pub' },
      ...(featureFlags.starCalls
        ? ([
            { label: 'Appels avec créateurs', icon: 'videocam-outline' as const, href: '/stars', badge: 'Talk with Stars' },
          ] as MenuRow[])
        : []),
    ],
  },
  {
    title: 'ÉDUCATION & FORMATION',
    items: [
      { label: 'Formations', icon: 'school-outline', href: '/courses' },
      { label: 'Mes Badges', icon: 'trophy-outline', href: '/badges-profile' },
      { label: 'Classement', icon: 'trending-up-outline', href: '/leaderboard' },
      { label: 'Gamification', icon: 'ribbon-outline', href: '/gamification-hub' },
    ],
  },
  {
    title: 'PARCOURS INTELLIGENT',
    items: [{ label: 'Parcours Intelligent', icon: 'sparkles-outline', href: '/assistant', badge: 'IA' }],
  },
  {
    title: 'PARAMÈTRES',
    items: [
      { label: 'Confidentialité', icon: 'lock-closed-outline', href: '/settings/privacy' },
      { label: 'Statistiques', icon: 'stats-chart-outline', href: '/creator/earnings' },
      { label: 'Notifications', icon: 'notifications-outline', href: '/notifications' },
      { label: 'Langue', icon: 'globe-outline', href: '/settings/language' },
      { label: 'Aide & Support', icon: 'help-circle-outline', href: '/faq' },
      { label: 'Mes tickets support', icon: 'chatbubbles-outline', href: '/support-page' },
      { label: 'À propos', icon: 'information-circle-outline', href: '/about' },
      { label: 'Admin', icon: 'ribbon-outline', href: '/admin-dashboard', admin: true },
    ],
  },
  {
    title: 'LÉGAL & SÉCURITÉ',
    items: [
      { label: 'Politique de confidentialité', icon: 'document-text-outline', href: '/privacy-policy' },
      { label: 'Protection des données', icon: 'lock-closed-outline', href: '/data-protection' },
    ],
  },
];

export default function MenuPlusScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showAdmin = isAdminUser(user);

  const sections = useMemo(
    () =>
      MENU_SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.filter((row) => !row.admin || showAdmin),
      })),
    [showAdmin]
  );

  const displayName = user?.full_name || user?.username || 'Utilisateur';
  const handle = user?.username || (user?.email ? user.email.split('@')[0] : 'user');
  const avatarUri = user?.profile_image || user?.avatar;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => goBackOrFallback('/(tabs)')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Menu +</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
      >
        {user ? (
          <LinearGradient
            colors={['#2a1808', '#1a0f05', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileRow}>
              <View style={styles.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>{displayName[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                )}
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.profileHandle} numberOfLines={1}>
                  @{handle}
                </Text>
              </View>
            </View>
          </LinearGradient>
        ) : null}

        {user ? (
          <TouchableOpacity
            style={styles.settingsHero}
            activeOpacity={0.82}
            onPress={() => router.push('/settings' as Href)}
            accessibilityLabel="Paramètres du compte"
            accessibilityRole="button"
          >
            <View style={styles.settingsHeroIconBox}>
              <Ionicons name="settings-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.settingsHeroText}>
              <Text style={styles.settingsHeroTitle}>Paramètres</Text>
              <Text style={styles.settingsHeroSub} numberOfLines={1}>
                Compte, notifications, thème, langue…
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,107,0,0.6)" />
          </TouchableOpacity>
        ) : null}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={`${section.title}-${item.label}`}
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => router.push(item.href as Href)}
              >
                <Ionicons name={item.icon} size={22} color={Colors.primary} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                {item.admin ? (
                  <View style={styles.badgeAdmin}>
                    <Text style={styles.badgeAdminText}>Admin</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color="rgba(255,107,0,0.45)" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>AfriWonder</Text>
        <Text style={styles.footerMuted}>Made in Mali</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
  },
  topTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary },
  scrollContent: { paddingHorizontal: Spacing.lg },
  profileCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,107,0,0.22)',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,107,0,0.75)',
    borderRadius: 36,
    padding: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surface },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.primaryLight },
  profileText: { flex: 1, minWidth: 0 },
  profileName: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileHandle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, marginTop: 4 },
  settingsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
  },
  settingsHeroIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsHeroText: { flex: 1, minWidth: 0 },
  settingsHeroTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  settingsHeroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    color: 'rgba(255,107,0,0.85)',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
  },
  rowLabel: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.md, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,107,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,133,51,0.55)',
  },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primaryLight },
  badgeAdmin: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,107,0,0.18)',
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  badgeAdminText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primaryLight },
  footer: { marginTop: Spacing.xl, textAlign: 'center', color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  footerMuted: { textAlign: 'center', color: 'rgba(255,107,0,0.55)', fontSize: FontSizes.xs, marginTop: 4 },
});
