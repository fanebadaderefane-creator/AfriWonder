import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions, FlatList } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

// Mock user data
const MOCK_USER = {
  firstName: 'Aminata',
  lastName: 'Diallo',
  username: 'aminata.diallo',
  avatar: 'https://i.pravatar.cc/300?img=1',
  coverImage: 'https://picsum.photos/800/400?random=cover',
  bio: 'Creatrice de contenu Bamako | Mode & Culture africaine | Ambassadrice AfriWonder',
  website: 'afriwonder.com/aminata',
  location: 'Bamako, Mali',
  isVerified: true,
  stats: {
    posts: 234,
    followers: 45200,
    following: 890,
    likes: 1200000,
  },
};

const MOCK_POSTS = Array.from({ length: 18 }, (_, i) => ({
  id: `p${i}`,
  image: `https://picsum.photos/300/300?random=${i + 50}`,
  isVideo: i % 3 === 0,
  views: Math.floor(Math.random() * 100000) + 5000,
  likes: Math.floor(Math.random() * 10000) + 100,
  isPinned: i < 2,
}));

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

type ContentTab = 'posts' | 'reels' | 'saved' | 'tagged';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');

  const profileData = isAuthenticated && user ? {
    ...MOCK_USER,
    firstName: user.firstName || MOCK_USER.firstName,
    lastName: user.lastName || MOCK_USER.lastName,
  } : MOCK_USER;

  const handleLogout = () => {
    Alert.alert('Deconnexion', 'Etes-vous sur de vouloir vous deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Deconnexion', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#1A1A1A', '#000']} style={styles.loginContainer}>
          <View style={styles.loginIconContainer}>
            <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.loginIconGradient}>
              <Ionicons name="person" size={50} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.loginTitle}>Rejoignez AfriWonder</Text>
          <Text style={styles.loginSubtitle}>Creez, partagez et connectez avec la communaute africaine</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.loginBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.loginBtnText}>Se connecter</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Creer un compte</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const tabs: { key: ContentTab; icon: string; iconActive: string }[] = [
    { key: 'posts', icon: 'grid-outline', iconActive: 'grid' },
    { key: 'reels', icon: 'play-circle-outline', iconActive: 'play-circle' },
    { key: 'saved', icon: 'bookmark-outline', iconActive: 'bookmark' },
    { key: 'tagged', icon: 'pricetag-outline', iconActive: 'pricetag' },
  ];

  const renderGridItem = ({ item }: { item: typeof MOCK_POSTS[0] }) => (
    <TouchableOpacity style={styles.gridItem} activeOpacity={0.8}>
      <Image source={{ uri: item.image }} style={styles.gridImage} />
      {item.isVideo && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={12} color="#FFF" />
          <Text style={styles.videoViews}>{formatNumber(item.views)}</Text>
        </View>
      )}
      {item.isPinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={10} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Ionicons name="lock-closed" size={14} color="#FFF" />
            <Text style={styles.topBarUsername}>{profileData.username}</Text>
            {profileData.isVerified && <Ionicons name="checkmark-circle" size={16} color="#3897F0" />}
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.topBarBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="menu-outline" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Avatar + Stats Row */}
          <View style={styles.profileRow}>
            {/* Avatar with story ring */}
            <TouchableOpacity>
              <LinearGradient colors={['#FF6B00', '#FF3D00', '#FF006E']} style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.posts)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.followers)}</Text>
                <Text style={styles.statLabel}>Abonnes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profileData.stats.following)}</Text>
                <Text style={styles.statLabel}>Suivi(e)s</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name + Bio */}
          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profileData.firstName} {profileData.lastName}</Text>
              {profileData.isVerified && <Ionicons name="checkmark-circle" size={16} color="#3897F0" />}
            </View>
            <Text style={styles.bio}>{profileData.bio}</Text>
            <TouchableOpacity>
              <Text style={styles.website}>{profileData.website}</Text>
            </TouchableOpacity>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.location}>{profileData.location}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editProfileBtn} activeOpacity={0.7}>
              <Text style={styles.editProfileText}>Modifier le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareProfileBtn} activeOpacity={0.7}>
              <Text style={styles.shareProfileText}>Partager le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addFriendBtn} activeOpacity={0.7}>
              <Ionicons name="person-add-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Story Highlights */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer} contentContainerStyle={styles.highlightsContent}>
            <TouchableOpacity style={styles.highlightItem}>
              <View style={styles.highlightNew}>
                <Ionicons name="add" size={28} color="#FFF" />
              </View>
              <Text style={styles.highlightName}>Nouveau</Text>
            </TouchableOpacity>
            {['Mode', 'Cuisine', 'Voyage', 'Bamako', 'Famille'].map((name, i) => (
              <TouchableOpacity key={i} style={styles.highlightItem}>
                <View style={styles.highlightCircle}>
                  <Image source={{ uri: `https://picsum.photos/100/100?random=${i + 80}` }} style={styles.highlightImage} />
                </View>
                <Text style={styles.highlightName}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Tabs */}
        <View style={styles.contentTabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.contentTab, activeTab === tab.key && styles.contentTabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={(activeTab === tab.key ? tab.iconActive : tab.icon) as any}
                size={24}
                color={activeTab === tab.key ? '#FFF' : '#666'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Grid */}
        <FlatList
          data={MOCK_POSTS}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'wallet', label: 'Portefeuille', route: '/wallet', color: '#FF6B00' },
            { icon: 'receipt', label: 'Commandes', route: '/orders', color: '#4ECDC4' },
            { icon: 'storefront', label: 'Ma boutique', route: '/seller', color: '#9B59B6' },
            { icon: 'gift', label: 'Parrainage', route: '/referrals', color: '#FF6B6B' },
          ].map((action, i) => (
            <TouchableOpacity key={i} style={styles.quickAction} onPress={() => router.push(action.route as any)}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4757" />
          <Text style={styles.logoutText}>Deconnexion</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AfriWonder v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Login state
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginIconContainer: {
    marginBottom: 24,
  },
  loginIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarUsername: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: Spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#000',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // Bio
  bioSection: {
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  bio: {
    fontSize: 14,
    color: '#DDD',
    lineHeight: 20,
    marginBottom: 4,
  },
  website: {
    fontSize: 14,
    color: '#3897F0',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: '#888',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  editProfileBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareProfileBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareProfileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addFriendBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Highlights
  highlightsContainer: {
    marginBottom: Spacing.lg,
  },
  highlightsContent: {
    gap: Spacing.lg,
  },
  highlightItem: {
    alignItems: 'center',
    width: 68,
  },
  highlightNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#444',
    overflow: 'hidden',
    marginBottom: 4,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightName: {
    color: '#CCC',
    fontSize: 11,
    textAlign: 'center',
  },

  // Content Tabs
  contentTabs: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  contentTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  contentTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFF',
  },

  // Grid
  gridRow: {
    gap: 2,
    marginBottom: 2,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoViews: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Actions
  quickActions: {
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1A1A',
    gap: Spacing.md,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,71,87,0.1)',
    borderRadius: 12,
  },
  logoutText: {
    color: '#FF4757',
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    marginVertical: Spacing.xxl,
  },
});
