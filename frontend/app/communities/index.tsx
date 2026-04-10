import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const COMMUNITIES = [
  { id: 'c1', name: 'Developpeurs Mali', members: 3200, image: 'https://picsum.photos/300/200?random=120', category: 'Tech', description: 'Communaute des developpeurs maliens' },
  { id: 'c2', name: 'Cuisine Africaine', members: 8500, image: 'https://picsum.photos/300/200?random=121', category: 'Cuisine', description: 'Recettes et partage culinaire' },
  { id: 'c3', name: 'Entrepreneurs Sahel', members: 5100, image: 'https://picsum.photos/300/200?random=122', category: 'Business', description: 'Business et entrepreneuriat au Sahel' },
  { id: 'c4', name: 'Musique Mandingue', members: 12000, image: 'https://picsum.photos/300/200?random=123', category: 'Musique', description: 'Amateurs de musique mandingue' },
  { id: 'c5', name: 'Football Mali', members: 25000, image: 'https://picsum.photos/300/200?random=124', category: 'Sport', description: 'Les Aigles du Mali et football local' },
  { id: 'c6', name: 'Mode Africaine', members: 9800, image: 'https://picsum.photos/300/200?random=125', category: 'Mode', description: 'Tendances mode et creation africaine' },
];

export default function CommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Communautes</Text>
        <TouchableOpacity><Ionicons name="add-circle" size={24} color={Colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Rechercher une communaute..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {COMMUNITIES.map((community) => (
          <TouchableOpacity key={community.id} style={styles.communityCard} onPress={() => router.push(`/communities/${community.id}`)}>
            <Image source={{ uri: community.image }} style={styles.communityImage} />
            <View style={styles.communityOverlay}>
              <View style={styles.categoryBadge}><Text style={styles.categoryText}>{community.category}</Text></View>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.communityDesc}>{community.description}</Text>
              <View style={styles.communityMeta}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.communityMembers}>{community.members.toLocaleString()} membres</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.lg },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  communityCard: { height: 160, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  communityImage: { width: '100%', height: '100%' },
  communityOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: Spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  categoryText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  communityName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  communityDesc: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  communityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  communityMembers: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
});
