import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

const MODULES = [
  { id: 'm1', title: 'Introduction a React Native', duration: '45 min', completed: true },
  { id: 'm2', title: 'Composants et Props', duration: '1h 10min', completed: true },
  { id: 'm3', title: 'Navigation avec Expo Router', duration: '55 min', completed: false },
  { id: 'm4', title: 'State Management avec Zustand', duration: '1h 30min', completed: false },
  { id: 'm5', title: 'API et Fetch', duration: '1h 15min', completed: false },
  { id: 'm6', title: 'Publication sur les stores', duration: '50 min', completed: false },
];

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail du cours</Text>
        <TouchableOpacity><Ionicons name="bookmark-outline" size={24} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView key={String(id)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Image source={{ uri: 'https://picsum.photos/400/200?random=150' }} style={styles.courseImage} />
        <Text style={styles.courseTitle}>Developpement Mobile React Native</Text>
        <View style={styles.instructorRow}>
          <Image source={{ uri: 'https://picsum.photos/50/50?random=151' }} style={styles.instructorAvatar} />
          <Text style={styles.instructorName}>Moussa Keita</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Ionicons name="people" size={18} color={Colors.primary} /><Text style={styles.statText}>1 250 etudiants</Text></View>
          <View style={styles.stat}><Ionicons name="time" size={18} color={Colors.primary} /><Text style={styles.statText}>12 heures</Text></View>
          <View style={styles.stat}><Ionicons name="document-text" size={18} color={Colors.primary} /><Text style={styles.statText}>6 modules</Text></View>
        </View>

        <Text style={styles.description}>Apprenez a creer des applications mobiles professionnelles avec React Native et Expo. Ce cours couvre tous les aspects du developpement mobile, de la creation de composants a la publication sur les stores.</Text>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}><Text style={styles.progressTitle}>Progression</Text><Text style={styles.progressPercent}>33%</Text></View>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: '33%' }]} /></View>
        </View>

        {/* Modules */}
        <Text style={styles.sectionTitle}>Modules</Text>
        {MODULES.map((mod, index) => (
          <TouchableOpacity key={mod.id} style={styles.moduleCard}>
            <View style={[styles.moduleNumber, mod.completed && styles.moduleNumberDone]}>
              {mod.completed ? <Ionicons name="checkmark" size={16} color={Colors.text} /> : <Text style={styles.moduleNumberText}>{index + 1}</Text>}
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
              <Text style={styles.moduleDuration}>{mod.duration}</Text>
            </View>
            <Ionicons name={mod.completed ? 'checkmark-circle' : 'play-circle'} size={24} color={mod.completed ? Colors.success : Colors.primary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.enrollButton}>
          <Text style={styles.enrollButtonText}>S'inscrire - 15 000 FCFA</Text>
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
  courseImage: { width: '100%', height: 180, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  courseTitle: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', marginBottom: Spacing.md },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  instructorAvatar: { width: 36, height: 36, borderRadius: 18 },
  instructorName: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.accent, fontSize: FontSizes.md, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  description: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22, marginBottom: Spacing.xxl },
  progressCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.xxl },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  progressPercent: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  moduleNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  moduleNumberDone: { backgroundColor: Colors.success },
  moduleNumberText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: 'bold' },
  moduleInfo: { flex: 1 },
  moduleTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  moduleDuration: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  enrollButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  enrollButtonText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
