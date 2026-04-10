import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const STORIES = [
  { id: 's1', user: 'Aminata', avatar: 'https://picsum.photos/60/60?random=90', isNew: true },
  { id: 's2', user: 'Moussa', avatar: 'https://picsum.photos/60/60?random=91', isNew: true },
  { id: 's3', user: 'Fanta', avatar: 'https://picsum.photos/60/60?random=92', isNew: true },
  { id: 's4', user: 'Ibrahima', avatar: 'https://picsum.photos/60/60?random=93', isNew: false },
  { id: 's5', user: 'Mariam', avatar: 'https://picsum.photos/60/60?random=94', isNew: false },
];

const FEATURED_TOPICS = [
  { id: 'f1', title: 'Musique Malienne', image: 'https://picsum.photos/400/200?random=100', count: '125 videos' },
  { id: 'f2', title: 'Cuisine Africaine', image: 'https://picsum.photos/400/200?random=101', count: '89 videos' },
  { id: 'f3', title: 'Mode & Fashion', image: 'https://picsum.photos/400/200?random=102', count: '234 videos' },
];

const POPULAR_CREATORS = [
  { id: 'c1', name: 'DJ Arafat Jr', avatar: 'https://picsum.photos/80/80?random=110', followers: '500K', verified: true },
  { id: 'c2', name: 'Chef Aminata', avatar: 'https://picsum.photos/80/80?random=111', followers: '300K', verified: true },
  { id: 'c3', name: 'Dance Mali', avatar: 'https://picsum.photos/80/80?random=112', followers: '180K', verified: false },
  { id: 'c4', name: 'Bamako Fashion', avatar: 'https://picsum.photos/80/80?random=113', followers: '95K', verified: false },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Decouvrir</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesRow}>
          <TouchableOpacity style={styles.storyAdd}>
            <View style={styles.storyAddCircle}>
              <Ionicons name="add" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.storyName}>Ajouter</Text>
          </TouchableOpacity>
          {STORIES.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyItem}>
              <View style={[styles.storyCircle, story.isNew && styles.storyCircleNew]}>
                <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{story.user}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sujets en vedette</Text>
          {FEATURED_TOPICS.map((topic) => (
            <TouchableOpacity key={topic.id} style={styles.topicCard}>
              <Image source={{ uri: topic.image }} style={styles.topicImage} />
              <View style={styles.topicOverlay}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicCount}>{topic.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Creators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Createurs populaires</Text>
          {POPULAR_CREATORS.map((creator) => (
            <TouchableOpacity key={creator.id} style={styles.creatorRow}>
              <Image source={{ uri: creator.avatar }} style={styles.creatorAvatar} />
              <View style={styles.creatorInfo}>
                <View style={styles.creatorNameRow}>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  {creator.verified && <Ionicons name="checkmark-circle" size={16} color={Colors.info} />}
                </View>
                <Text style={styles.creatorFollowers}>{creator.followers} abonnes</Text>
              </View>
              <TouchableOpacity style={styles.followBtn}>
                <Text style={styles.followBtnText}>Suivre</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  storiesRow: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  storyAdd: { alignItems: 'center', marginRight: Spacing.lg },
  storyAddCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  storyItem: { alignItems: 'center', marginRight: Spacing.lg, width: 64 },
  storyCircle: { width: 60, height: 60, borderRadius: 30, padding: 2, marginBottom: 4 },
  storyCircleNew: { borderWidth: 2, borderColor: Colors.primary },
  storyAvatar: { width: '100%', height: '100%', borderRadius: 28 },
  storyName: { color: Colors.text, fontSize: FontSizes.xs, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  topicCard: { height: 120, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  topicImage: { width: '100%', height: '100%' },
  topicOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: Spacing.lg },
  topicTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  topicCount: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  creatorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  creatorAvatar: { width: 50, height: 50, borderRadius: 25 },
  creatorInfo: { flex: 1 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  creatorFollowers: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  followBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: Colors.primary },
  followBtnText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
});
