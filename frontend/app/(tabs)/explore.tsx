import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const GRID_GAP = 2;

// Stories
const STORIES = [
  { id: 'add', name: 'Votre Story', avatar: 'https://i.pravatar.cc/150?img=10', isAdd: true, hasNew: false, isLive: false },
  { id: 's1', name: 'Aminata', avatar: 'https://i.pravatar.cc/150?img=1', isAdd: false, hasNew: true, isLive: true },
  { id: 's2', name: 'Moussa', avatar: 'https://i.pravatar.cc/150?img=2', isAdd: false, hasNew: true, isLive: false },
  { id: 's3', name: 'Awa', avatar: 'https://i.pravatar.cc/150?img=3', isAdd: false, hasNew: true, isLive: false },
  { id: 's4', name: 'Ibrahim', avatar: 'https://i.pravatar.cc/150?img=4', isAdd: false, hasNew: true, isLive: false },
  { id: 's5', name: 'Fanta', avatar: 'https://i.pravatar.cc/150?img=5', isAdd: false, hasNew: false, isLive: false },
  { id: 's6', name: 'Boubacar', avatar: 'https://i.pravatar.cc/150?img=7', isAdd: false, hasNew: true, isLive: false },
  { id: 's7', name: 'Mariam', avatar: 'https://i.pravatar.cc/150?img=6', isAdd: false, hasNew: false, isLive: false },
];

// Categories
const CATEGORIES = [
  { id: 'all', name: 'Tout', icon: 'flame' },
  { id: 'food', name: 'Cuisine', icon: 'restaurant' },
  { id: 'fashion', name: 'Mode', icon: 'shirt' },
  { id: 'music', name: 'Musique', icon: 'musical-notes' },
  { id: 'sport', name: 'Sport', icon: 'football' },
  { id: 'travel', name: 'Voyage', icon: 'airplane' },
  { id: 'tech', name: 'Tech', icon: 'laptop' },
  { id: 'beauty', name: 'Beaute', icon: 'sparkles' },
];

// Services
const SERVICES_ROW1 = [
  { id: 'food', name: 'Livraison', icon: 'fast-food', color: '#FF6B6B', route: '/services/food' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#4ECDC4', route: '/services/transport' },
  { id: 'health', name: 'Sante', icon: 'medkit', color: '#45B7D1', route: '/services/health' },
  { id: 'wallet', name: 'Wallet', icon: 'wallet', color: '#FF6B00', route: '/wallet' },
];
const SERVICES_ROW2 = [
  { id: 'education', name: 'Cours', icon: 'school', color: '#82E0AA', route: '/courses' },
  { id: 'news', name: 'Actus', icon: 'newspaper', color: '#E67E22', route: '/news' },
  { id: 'voyage', name: 'Voyage', icon: 'airplane', color: '#3498DB', route: '/services/voyage' },
  { id: 'more', name: 'Tout', icon: 'apps', color: '#9B59B6', route: '/services' },
];

// Grid items
const EXPLORE_ITEMS = Array.from({ length: 24 }, (_, i) => ({
  id: `e${i}`,
  image: `https://picsum.photos/${300 + i}/${400 + i}?random=${i + 20}`,
  type: i % 7 === 0 ? 'reel' as const : i % 5 === 0 ? 'live' as const : 'photo' as const,
  views: Math.floor(Math.random() * 500000) + 1000,
  likes: Math.floor(Math.random() * 50000) + 100,
}));

const formatNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { width: screenWidth } = useWindowDimensions();

  const tileSize = Math.floor((screenWidth - GRID_GAP * 2) / 3);
  const tileHeight = Math.floor(tileSize * 1.35);

  const renderServiceRow = (services: typeof SERVICES_ROW1) => (
    <View style={{ flexDirection: 'row', marginBottom: 8, width: '100%' }}>
      {services.map((s) => (
        <TouchableOpacity key={s.id} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }} onPress={() => router.push(s.route as any)} activeOpacity={0.7}>
          <View style={[styles.serviceIcon, { backgroundColor: s.color + '18' }]}>
            <Ionicons name={s.icon as any} size={24} color={s.color} />
          </View>
          <Text style={styles.serviceName}>{s.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Build grid rows (3 items per row)
  const gridRows: (typeof EXPLORE_ITEMS)[] = [];
  for (let i = 0; i < EXPLORE_ITEMS.length; i += 3) {
    gridRows.push(EXPLORE_ITEMS.slice(i, i + 3));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Decouvrir</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput style={styles.searchInput} placeholder="Rechercher personnes, videos, sons..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#666" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={styles.qrBtn}>
          <Ionicons name="qr-code-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
          {STORIES.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyItem} onPress={() => router.push('/stories')}>
              {story.isAdd ? (
                <View style={styles.storyAddContainer}>
                  <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  <View style={styles.storyAddBadge}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
              ) : (
                <LinearGradient
                  colors={story.isLive ? ['#FF0000', '#FF4444'] : story.hasNew ? ['#FF6B00', '#FF006E'] : ['#444', '#333']}
                  style={styles.storyRing}
                >
                  <View style={styles.storyRingInner}>
                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                  </View>
                  {story.isLive && (
                    <View style={styles.storyLiveBadge}><Text style={styles.storyLiveText}>LIVE</Text></View>
                  )}
                </LinearGradient>
              )}
              <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services Mini Programs (horizontal scroll like WeChat) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesContent}>
          {[...SERVICES_ROW1, ...SERVICES_ROW2].map((s) => (
            <TouchableOpacity key={s.id} style={styles.serviceItem} onPress={() => router.push(s.route as any)} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={24} color={s.color} />
              </View>
              <Text style={styles.serviceName}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Promo Banner */}
        <TouchableOpacity style={styles.promoBanner} activeOpacity={0.8} onPress={() => router.push('/wallet')}>
          <LinearGradient colors={['#FF6B00', '#FF3D00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoLeft}>
              <View style={styles.promoNewBadge}><Text style={styles.promoNewText}>NOUVEAU</Text></View>
              <Text style={styles.promoTitle}>AfriWonder Pay</Text>
              <Text style={styles.promoSubtitle}>Envoyez de l'argent instantanement</Text>
            </View>
            <Ionicons name="wallet" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Moments Feed Banner */}
        <TouchableOpacity style={styles.momentsBanner} activeOpacity={0.8} onPress={() => router.push('/feed')}>
          <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoGradient}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoTitle}>Moments</Text>
              <Text style={styles.promoSubtitle}>Decouvrez ce que font vos amis</Text>
            </View>
            <Ionicons name="people" size={36} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, activeCategory === cat.id && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={14} color={activeCategory === cat.id ? '#FFF' : '#888'} />
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="trending-up" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Tendances</Text>
          </View>
          <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
        </View>

        {/* Grid */}
        <View>
          {gridRows.map((row, ri) => (
            <View key={ri} style={{ width: screenWidth, height: tileHeight + GRID_GAP, overflow: 'hidden' }}>
              {row.map((item, ci) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={{
                    position: 'absolute',
                    left: ci * (tileSize + GRID_GAP),
                    top: 0,
                    width: tileSize,
                    height: tileHeight,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: tileSize, height: tileHeight }}
                    resizeMode="cover"
                  />
                  {item.type === 'reel' && (
                    <View style={styles.reelBadge}>
                      <Ionicons name="play" size={10} color="#FFF" />
                      <Text style={styles.badgeText}>Reel</Text>
                    </View>
                  )}
                  {item.type === 'live' && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.badgeText}>LIVE</Text>
                    </View>
                  )}
                  <View style={[styles.gridOverlay, { position: 'absolute', bottom: 0, left: 0, width: tileSize, height: 36 }]}>
                    <View style={styles.gridStat}>
                      <Ionicons name="play" size={10} color="#FFF" />
                      <Text style={styles.gridStatText}>{formatNum(item.views)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D00', borderWidth: 1.5, borderColor: '#000' },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  qrBtn: { width: 42, height: 42, backgroundColor: '#1A1A1A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Stories
  storiesContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  storyItem: { alignItems: 'center', width: 68 },
  storyAddContainer: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyAddBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  storyRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  storyRingInner: { width: 63, height: 63, borderRadius: 31.5, borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  storyLiveBadge: { position: 'absolute', bottom: -2, alignSelf: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1.5, borderColor: '#000' },
  storyLiveText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  storyName: { color: '#CCC', fontSize: 11, marginTop: 4, textAlign: 'center' },

  // Services (horizontal scroll)
  servicesContent: { paddingHorizontal: 16, gap: 20, paddingBottom: 16 },
  serviceItem: { alignItems: 'center' as const, width: 64 },
  serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 6 },
  serviceName: { color: '#CCC', fontSize: 11, fontWeight: '500' as const, textAlign: 'center' as const },

  // Promo
  promoBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  momentsBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  promoGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  promoLeft: { flex: 1 },
  promoNewBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  promoNewText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  promoTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  promoSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  // Categories
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', gap: 6 },
  categoryPillActive: { backgroundColor: Colors.primary },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#FFF' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Grid
  gridContainer: { gap: GRID_GAP },
  gridRow: { flexDirection: 'row', gap: GRID_GAP },
  gridItem: { position: 'relative', overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, justifyContent: 'flex-end', paddingHorizontal: 6, paddingBottom: 4 },
  gridStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridStatText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  reelBadge: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  liveBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
