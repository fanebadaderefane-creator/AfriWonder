import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const MENU_SECTIONS = [
  {
    title: 'Wallet & Paiements',
    items: [
      { icon: 'wallet', label: 'Mon Wallet', color: '#16a34a', page: 'Wallet' },
    ],
  },
  {
    title: 'COMMERCE & SERVICES',
    items: [
      { icon: 'cart', label: 'Marketplace', color: '#2563eb', badge: 'Nouveau', page: 'Marketplace' },
      { icon: 'ticket', label: 'Événements', color: '#9333ea', page: 'Events' },
      { icon: 'car', label: 'Transport', color: '#2563eb', page: 'Transport' },
      { icon: 'restaurant', label: 'Restauration', color: '#2563eb', page: 'FoodDelivery' },
      { icon: 'flash', label: 'Services', color: '#ca8a04', page: 'Utilities' },
      { icon: 'heart', label: 'Santé', color: '#dc2626', page: 'Telemedicine' },
      { icon: 'business', label: 'Immobilier', color: '#0d9488', page: 'RealEstate' },
      { icon: 'shield-checkmark', label: 'Assurances', color: '#4f46e5', page: 'Insurance' },
      { icon: 'construct', label: 'Prestataires', color: '#2563eb', page: 'Marketplace' },
      { icon: 'newspaper', label: 'Actualités', color: '#4b5563', page: 'News' },
      { icon: 'card', label: 'Microcrédit', color: '#059669', page: 'Microcredit' },
      { icon: 'flag', label: 'Crowdfunding', color: '#db2777', page: 'Crowdfunding' },
      { icon: 'briefcase', label: 'Emplois', color: '#2563eb', page: 'Jobs' },
      { icon: 'grid', label: 'Mini-Apps', color: '#2563eb', badge: 'Nouveau', page: 'MiniAppsStore' },
    ],
  },
  {
    title: 'CRÉATEURS & LIVE',
    items: [
      { icon: 'compass', label: 'Découvrir', color: '#3b82f6', page: 'Discover' },
      { icon: 'add-circle', label: 'Créer', color: '#3b82f6', page: 'Create' },
      { icon: 'radio', label: 'Regarder les lives', color: '#db2777', badge: 'Live', page: 'Live' },
      { icon: 'videocam', label: 'Démarrer un live', color: '#db2777', page: 'StartLive' },
      { icon: 'sparkles', label: 'Outils créateurs', color: '#ca8a04', page: 'CreatorTools' },
      { icon: 'share-social', label: 'Parrainage', color: '#2563eb', page: 'Referrals' },
      { icon: 'megaphone', label: 'Mes campagnes pub', color: '#2563eb', badge: 'Pub', page: 'AdvertiserDashboard' },
    ],
  },
  {
    title: 'ÉDUCATION & FORMATION',
    items: [
      { icon: 'school', label: 'Formations', color: '#16a34a', page: 'Courses' },
      { icon: 'trophy', label: 'Mes Badges', color: '#ca8a04', page: 'BadgesProfile' },
      { icon: 'bar-chart', label: 'Classement', color: '#9333ea', page: 'Leaderboard' },
      { icon: 'trophy', label: 'Gamification', color: '#2563eb', page: 'GamificationHub' },
    ],
  },
  {
    title: 'PARCOURS INTELLIGENT',
    items: [
      { icon: 'sparkles', label: 'Parcours Intelligent', color: '#2563eb', badge: 'IA', page: 'MatchingCenter' },
    ],
  },
  {
    title: 'PARAMÈTRES',
    items: [
      { icon: 'person', label: 'Profil', color: '#4b5563', page: 'Profile' },
      { icon: 'settings', label: 'Paramètres', color: '#4b5563', page: 'Settings' },
      { icon: 'bar-chart', label: 'Statistiques', color: '#9333ea', page: 'Analytics' },
      { icon: 'notifications', label: 'Notifications', color: '#2563eb', page: 'Notifications' },
      { icon: 'globe', label: 'Langue', color: '#2563eb', page: 'Language' },
      { icon: 'help-circle', label: 'Aide & Support', color: '#4b5563', page: 'Help' },
      { icon: 'chatbubbles', label: 'Mes tickets support', color: '#4b5563', page: 'Support' },
      { icon: 'information-circle', label: 'À propos', color: '#4b5563', page: 'About' },
      { icon: 'shield', label: 'Admin', color: '#ca8a04', admin: true, page: 'AdminDashboard' },
    ],
  },
  {
    title: 'LÉGAL & SÉCURITÉ',
    items: [
      { icon: 'document-text', label: 'Politique de confidentialité', color: '#4b5563', page: 'PrivacyPolicy' },
      { icon: 'lock-closed', label: 'Protection des données', color: '#4b5563', page: 'DataProtection' },
    ],
  },
];

const SUPER_ADMIN_EMAIL = (process.env.EXPO_PUBLIC_SUPER_ADMIN_EMAIL || 'fanebadaderefane@gmail.com').toLowerCase();
const isSuperAdmin = (user) => user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

export default function MenuPlusScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const onClose = () => navigation.goBack();
  const [userStats, setUserStats] = useState({ followers: 0, following: 0 });
  const [likedCount, setLikedCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const [stats, liked] = await Promise.all([
          api.users.getStats(user.id).catch(() => ({ followers: 0, following: 0 })),
          api.users.getLikedVideos(user.id, { limit: 0 }).catch(() => []),
        ]);
        if (mounted) {
          setUserStats({
            followers: stats?.followers ?? stats?.stats?.followers ?? 0,
            following: stats?.following ?? stats?.stats?.following ?? 0,
          });
          setLikedCount(Array.isArray(liked) ? liked.length : (liked?.videos?.length ?? 0));
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const handleItem = (item) => {
    if (item.admin && !isSuperAdmin(user)) return;
    onClose?.();
    const screen = item.page;
    const known = ['Wallet', 'Settings', 'Notifications', 'Support', 'StartLive', 'LiveStream', 'LiveView', 'Inbox', 'Marketplace', 'Events', 'Transport', 'FoodDelivery', 'Utilities', 'Telemedicine', 'RealEstate', 'Insurance', 'News', 'Microcredit', 'Crowdfunding', 'Jobs', 'Referrals', 'CreatorTools', 'MiniAppsStore', 'Courses', 'Leaderboard', 'GamificationHub', 'BadgesProfile', 'MatchingCenter', 'Language', 'Help', 'About', 'PrivacyPolicy', 'DataProtection', 'AdvertiserDashboard', 'Analytics', 'AdminDashboard'];
    if (screen === 'Profile') {
      navigation.navigate('App', { screen: 'profile' });
      return;
    }
    if (screen === 'Create') {
      navigation.navigate('App', { screen: 'create' });
      return;
    }
    if (screen === 'Discover') {
      navigation.navigate('App', { screen: 'discover' });
      return;
    }
    if (screen === 'Live') {
      navigation.navigate('App', { screen: 'lives' });
      return;
    }
    if (known.includes(screen)) {
      navigation.navigate(screen);
      return;
    }
    navigation.navigate('Module', { module: screen, title: item.label });
  };

  const renderSection = ({ item: section }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items
        .filter((i) => !i.admin || isSuperAdmin(user))
        .map((menuItem) => (
          <TouchableOpacity
            key={`${section.title}-${menuItem.label}`}
            style={styles.menuRow}
            onPress={() => handleItem(menuItem)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: menuItem.color + '20' }]}>
              <Ionicons name={menuItem.icon} size={20} color={menuItem.color} />
            </View>
            <Text style={styles.menuLabel}>{menuItem.label}</Text>
            {menuItem.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{menuItem.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}
    </View>
  );

  const listData = MENU_SECTIONS;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.root}>
        <View style={styles.header}>
        {user ? (
          <>
            <View style={styles.profileRow}>
              {user.profile_image || user.avatar ? (
                <Image source={{ uri: user.profile_image || user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{(user.full_name || user.username || 'U')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>{user.full_name || user.username || 'Utilisateur'}</Text>
                <Text style={styles.profileHandle} numberOfLines={1}>@{user.username || (user.email || '').split('@')[0] || 'user'}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{userStats.followers}</Text>
                <Text style={styles.statLabel}>Wonderers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{userStats.following}</Text>
                <Text style={styles.statLabel}>Dans leur Wonder</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{likedCount}</Text>
                <Text style={styles.statLabel}>J'aime</Text>
              </View>
            </View>
          </>
        ) : null}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1e40af" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={listData}
          keyExtractor={(s) => s.title}
          renderItem={renderSection}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.footer}>
          <Text style={styles.footerText}>AfriWonder v1.0.0</Text>
          <Text style={styles.footerText}>🇲🇱 Made in Mali</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  root: {
    width: Math.min(Dimensions.get('window').width * 0.9, 360),
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileHandle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  listContent: { paddingBottom: 24 },
  section: { marginBottom: 16, paddingHorizontal: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  footer: { padding: 24, paddingBottom: 32 },
  footerText: { fontSize: 12, color: '#9ca3af' },
});
