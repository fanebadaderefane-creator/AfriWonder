import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, FlatList, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - Spacing.xl * 2 - 4) / 3;

const CATEGORIES = ['Tout', 'Musique', 'Danse', 'Cuisine', 'Mode', 'Sport', 'Education', 'Comedie'];

const USERS = [
  { id: 'u1', name: 'Aminata', avatar: 'https://picsum.photos/60/60?random=70', followers: '125K' },
  { id: 'u2', name: 'Moussa', avatar: 'https://picsum.photos/60/60?random=71', followers: '98K' },
  { id: 'u3', name: 'Fatoumata', avatar: 'https://picsum.photos/60/60?random=72', followers: '234K' },
];

const RESULTS = Array.from({ length: 15 }, (_, i) => ({
  id: `r${i}`, thumbnail: `https://picsum.photos/200/300?random=${80 + i}`, views: Math.floor(Math.random() * 500000),
}));

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Rechercher..." placeholderTextColor={Colors.textMuted} value={query} onChangeText={setQuery} autoFocus />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity key={cat} style={[styles.categoryChip, activeCategory === i && styles.categoryChipActive]} onPress={() => setActiveCategory(i)}>
            <Text style={[styles.categoryText, activeCategory === i && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Users */}
        {query.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comptes</Text>
            {USERS.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userRow}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userFollowers}>{user.followers} abonnes</Text>
                </View>
                <TouchableOpacity style={styles.followBtn}>
                  <Text style={styles.followBtnText}>Suivre</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Video Results Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Videos</Text>
          <View style={styles.videosGrid}>
            {RESULTS.map((item) => (
              <TouchableOpacity key={item.id} style={styles.videoThumb}>
                <Image source={{ uri: item.thumbnail }} style={styles.videoImage} />
                <View style={styles.viewsBadge}>
                  <Ionicons name="play" size={10} color={Colors.text} />
                  <Text style={styles.viewsText}>{(item.views / 1000).toFixed(0)}K</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  categories: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, maxHeight: 40 },
  categoryChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, marginRight: Spacing.sm },
  categoryChipActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  categoryTextActive: { color: Colors.text, fontWeight: '600' },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  userFollowers: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  followBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.primary },
  followBtnText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  videoThumb: { width: GRID_SIZE, height: GRID_SIZE * 1.4, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  videoImage: { width: '100%', height: '100%' },
  viewsBadge: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  viewsText: { color: Colors.text, fontSize: 10, fontWeight: '600' },
});
