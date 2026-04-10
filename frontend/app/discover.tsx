import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  TextInput, RefreshControl, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';

// --- MOCK DATA ---
const TRENDING_HASHTAGS = [
  { id: 'h1', tag: '#BamakoVibes', views: '2.5M', color: '#FF6B00' },
  { id: 'h2', tag: '#AfriDance', views: '1.8M', color: '#E91E63' },
  { id: 'h3', tag: '#MaliFood', views: '980K', color: '#4CAF50' },
  { id: 'h4', tag: '#BogolonFashion', views: '750K', color: '#9C27B0' },
  { id: 'h5', tag: '#AfriMusic', views: '3.1M', color: '#2196F3' },
  { id: 'h6', tag: '#SahelStyle', views: '620K', color: '#FF9800' },
];

const TRENDING_VIDEOS = [
  { id: 'tv1', thumbnail: 'https://picsum.photos/200/350?random=120', views: '1.2M', author: 'Aminata D.', likes: '89K' },
  { id: 'tv2', thumbnail: 'https://picsum.photos/200/350?random=121', views: '890K', author: 'DJ Malien', likes: '67K' },
  { id: 'tv3', thumbnail: 'https://picsum.photos/200/350?random=122', views: '2.1M', author: 'Chef Fanta', likes: '150K' },
  { id: 'tv4', thumbnail: 'https://picsum.photos/200/350?random=123', views: '567K', author: 'Dance Crew', likes: '45K' },
  { id: 'tv5', thumbnail: 'https://picsum.photos/200/350?random=124', views: '1.5M', author: 'Mode BKO', likes: '112K' },
  { id: 'tv6', thumbnail: 'https://picsum.photos/200/350?random=125', views: '430K', author: 'Cuisine Mali', likes: '34K' },
  { id: 'tv7', thumbnail: 'https://picsum.photos/200/350?random=126', views: '780K', author: 'Artisan Sahel', likes: '56K' },
  { id: 'tv8', thumbnail: 'https://picsum.photos/200/350?random=127', views: '1.9M', author: 'Bamako Life', likes: '98K' },
];

const TRENDING_SOUNDS = [
  { id: 's1', title: 'Fatoumata Diawara - Sowa', artist: 'Fatoumata D.', uses: '45K', image: 'https://picsum.photos/80/80?random=130' },
  { id: 's2', title: 'Amadou & Mariam - Beaux', artist: 'A & Mariam', uses: '32K', image: 'https://picsum.photos/80/80?random=131' },
  { id: 's3', title: 'Salif Keita - Tomorrow', artist: 'Salif Keita', uses: '28K', image: 'https://picsum.photos/80/80?random=132' },
  { id: 's4', title: 'Aya Nakamura - Djadja', artist: 'Aya N.', uses: '120K', image: 'https://picsum.photos/80/80?random=133' },
];

const CHALLENGES = [
  { id: 'ch1', title: 'Defi Danse Mali', participants: '12.5K', image: 'https://picsum.photos/300/180?random=140', color: '#FF6B00' },
  { id: 'ch2', title: 'Cuisine 30 Secondes', participants: '8.2K', image: 'https://picsum.photos/300/180?random=141', color: '#4CAF50' },
  { id: 'ch3', title: 'Mode Bogolan', participants: '6.7K', image: 'https://picsum.photos/300/180?random=142', color: '#9C27B0' },
];

const POPULAR_CREATORS = [
  { id: 'c1', name: 'DJ Arafat Jr', avatar: 'https://picsum.photos/80/80?random=110', followers: '500K', verified: true, category: 'Musique' },
  { id: 'c2', name: 'Chef Aminata', avatar: 'https://picsum.photos/80/80?random=111', followers: '300K', verified: true, category: 'Cuisine' },
  { id: 'c3', name: 'Dance Mali', avatar: 'https://picsum.photos/80/80?random=112', followers: '180K', verified: false, category: 'Danse' },
  { id: 'c4', name: 'Bamako Fashion', avatar: 'https://picsum.photos/80/80?random=113', followers: '95K', verified: true, category: 'Mode' },
  { id: 'c5', name: 'Tech Sahel', avatar: 'https://picsum.photos/80/80?random=114', followers: '67K', verified: false, category: 'Tech' },
];

const SEARCH_SUGGESTIONS = ['Danse malienne', 'Recettes', 'Bogolan', 'Musique live', 'Mode africaine', 'Bamako'];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const videoWidth = (screenWidth - 48) / 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Decouvrir</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="scan" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher videos, sons, hashtags..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Suggestions */}
      {searchFocused && searchQuery.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          <View style={styles.suggestionsWrap}>
            {SEARCH_SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionPill} onPress={() => setSearchQuery(s)}>
                <Ionicons name="trending-up" size={12} color="#888" />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }} tintColor={Colors.primary} />}
      >
        {/* Trending Hashtags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="trending-up" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Hashtags tendance</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hashtagsRow}>
            {TRENDING_HASHTAGS.map(h => (
              <TouchableOpacity key={h.id} style={styles.hashtagCard} activeOpacity={0.85}>
                <LinearGradient
                  colors={[h.color, h.color + '88']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hashtagGradient}
                >
                  <Text style={styles.hashtagTag}>{h.tag}</Text>
                  <Text style={styles.hashtagViews}>{h.views} vues</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trending Videos Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="flame" size={16} color="#FF3D00" />
              <Text style={styles.sectionTitle}>Videos tendance</Text>
            </View>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>
          <View style={styles.videoGrid}>
            {TRENDING_VIDEOS.map(video => (
              <TouchableOpacity
                key={video.id}
                style={[styles.videoCard, { width: videoWidth, height: videoWidth * 1.6 }]}
                activeOpacity={0.85}
              >
                <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.videoOverlay}>
                  <View style={styles.videoStats}>
                    <View style={styles.videoStatRow}>
                      <Ionicons name="play" size={10} color="#FFF" />
                      <Text style={styles.videoStatText}>{video.views}</Text>
                    </View>
                    <View style={styles.videoStatRow}>
                      <Ionicons name="heart" size={10} color="#FF4757" />
                      <Text style={styles.videoStatText}>{video.likes}</Text>
                    </View>
                  </View>
                  <Text style={styles.videoAuthor}>@{video.author}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trending Sounds */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="musical-notes" size={16} color="#E91E63" />
              <Text style={styles.sectionTitle}>Sons populaires</Text>
            </View>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>
          {TRENDING_SOUNDS.map((sound, i) => (
            <TouchableOpacity key={sound.id} style={styles.soundCard} activeOpacity={0.85}>
              <Text style={styles.soundRank}>{i + 1}</Text>
              <Image source={{ uri: sound.image }} style={styles.soundImage} />
              <View style={styles.soundInfo}>
                <Text style={styles.soundTitle} numberOfLines={1}>{sound.title}</Text>
                <Text style={styles.soundArtist}>{sound.artist}</Text>
              </View>
              <View style={styles.soundUses}>
                <Ionicons name="videocam" size={12} color="#888" />
                <Text style={styles.soundUsesText}>{sound.uses}</Text>
              </View>
              <TouchableOpacity style={styles.soundPlayBtn}>
                <Ionicons name="play" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.sectionTitle}>Defis du moment</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengesRow}>
            {CHALLENGES.map(ch => (
              <TouchableOpacity key={ch.id} style={styles.challengeCard} activeOpacity={0.85}>
                <Image source={{ uri: ch.image }} style={styles.challengeImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.challengeOverlay}>
                  <View style={[styles.challengeBadge, { backgroundColor: ch.color }]}>
                    <Ionicons name="trophy" size={10} color="#FFF" />
                    <Text style={styles.challengeBadgeText}>DEFI</Text>
                  </View>
                  <Text style={styles.challengeTitle}>{ch.title}</Text>
                  <View style={styles.challengeParticipants}>
                    <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.challengeParticipantsText}>{ch.participants} participants</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Creators */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="star" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Createurs populaires</Text>
            </View>
          </View>
          {POPULAR_CREATORS.map(creator => (
            <TouchableOpacity key={creator.id} style={styles.creatorCard} activeOpacity={0.85}>
              <Image source={{ uri: creator.avatar }} style={styles.creatorAvatar} />
              <View style={styles.creatorInfo}>
                <View style={styles.creatorNameRow}>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  {creator.verified && <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />}
                </View>
                <View style={styles.creatorMeta}>
                  <Text style={styles.creatorFollowers}>{creator.followers} abonnes</Text>
                  <View style={styles.creatorCatBadge}>
                    <Text style={styles.creatorCatText}>{creator.category}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.followBtn}>
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.followBtnGradient}>
                  <Text style={styles.followBtnText}>Suivre</Text>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  // Suggestions
  suggestionsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  suggestionsTitle: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  suggestionText: { color: '#CCC', fontSize: 12 },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  seeAll: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  // Hashtags
  hashtagsRow: { paddingHorizontal: 16, gap: 10 },
  hashtagCard: { borderRadius: 12, overflow: 'hidden' },
  hashtagGradient: { paddingHorizontal: 18, paddingVertical: 14, minWidth: 140 },
  hashtagTag: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  hashtagViews: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 },

  // Video Grid
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 4 },
  videoCard: { borderRadius: 8, overflow: 'hidden' },
  videoThumb: { width: '100%', height: '100%' },
  videoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6, paddingTop: 20,
  },
  videoStats: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  videoStatRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  videoStatText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  videoAuthor: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '500' },

  // Sounds
  soundCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111', gap: 10,
  },
  soundRank: { color: '#888', fontSize: 14, fontWeight: '800', width: 20, textAlign: 'center' },
  soundImage: { width: 44, height: 44, borderRadius: 8 },
  soundInfo: { flex: 1 },
  soundTitle: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  soundArtist: { color: '#888', fontSize: 11, marginTop: 1 },
  soundUses: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  soundUsesText: { color: '#888', fontSize: 11 },
  soundPlayBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  // Challenges
  challengesRow: { paddingHorizontal: 16, gap: 10 },
  challengeCard: { width: 220, height: 130, borderRadius: 14, overflow: 'hidden' },
  challengeImage: { width: '100%', height: '100%' },
  challengeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 40,
  },
  challengeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4,
  },
  challengeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  challengeTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  challengeParticipants: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  challengeParticipantsText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },

  // Creators
  creatorCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    paddingVertical: 10, gap: 10,
  },
  creatorAvatar: { width: 50, height: 50, borderRadius: 25 },
  creatorInfo: { flex: 1 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  creatorMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  creatorFollowers: { color: '#888', fontSize: 12 },
  creatorCatBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  creatorCatText: { color: '#999', fontSize: 10 },
  followBtn: { borderRadius: 8, overflow: 'hidden' },
  followBtnGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  followBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
