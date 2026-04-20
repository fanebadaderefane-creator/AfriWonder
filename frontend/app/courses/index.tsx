import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const CATEGORIES = ['Tout', 'Tech', 'Business', 'Langue', 'Art', 'Sante'];

const COURSES = [
  { id: 'co1', title: 'Developpement Mobile React Native', instructor: 'Moussa Keita', image: 'https://picsum.photos/400/200?random=140', price: 15000, rating: 4.8, students: 1250, duration: '12h', level: 'Intermediaire' },
  { id: 'co2', title: 'Marketing Digital pour l\'Afrique', instructor: 'Aminata Sangare', image: 'https://picsum.photos/400/200?random=141', price: 10000, rating: 4.6, students: 890, duration: '8h', level: 'Debutant' },
  { id: 'co3', title: 'Francais des affaires', instructor: 'Prof. Diallo', image: 'https://picsum.photos/400/200?random=142', price: 0, rating: 4.9, students: 3400, duration: '20h', level: 'Tout niveau' },
  { id: 'co4', title: 'Design Graphique avec Figma', instructor: 'Fanta Coulibaly', image: 'https://picsum.photos/400/200?random=143', price: 8000, rating: 4.7, students: 670, duration: '10h', level: 'Debutant' },
  { id: 'co5', title: 'Agriculture moderne au Mali', instructor: 'Dr. Traore', image: 'https://picsum.photos/400/200?random=144', price: 5000, rating: 4.5, students: 2100, duration: '6h', level: 'Tout niveau' },
];

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formations</Text>
        <TouchableOpacity><Ionicons name="search" size={24} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity key={cat} style={[styles.categoryChip, activeCategory === i && styles.categoryChipActive]} onPress={() => setActiveCategory(i)}>
            <Text style={[styles.categoryText, activeCategory === i && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {COURSES.map((course) => (
          <TouchableOpacity key={course.id} style={styles.courseCard} onPress={() => router.push(`/courses/${course.id}`)}>
            <Image source={{ uri: course.image }} style={styles.courseImage} />
            <View style={styles.courseInfo}>
              <View style={styles.levelBadge}><Text style={styles.levelText}>{course.level}</Text></View>
              <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
              <Text style={styles.courseInstructor}>{course.instructor}</Text>
              <View style={styles.courseMeta}>
                <View style={styles.metaItem}><Ionicons name="star" size={12} color={Colors.accent} /><Text style={styles.metaText}>{course.rating}</Text></View>
                <View style={styles.metaItem}><Ionicons name="people" size={12} color={Colors.textSecondary} /><Text style={styles.metaText}>{course.students}</Text></View>
                <View style={styles.metaItem}><Ionicons name="time" size={12} color={Colors.textSecondary} /><Text style={styles.metaText}>{course.duration}</Text></View>
              </View>
              <Text style={styles.coursePrice}>{course.price === 0 ? 'Gratuit' : course.price.toLocaleString() + ' FCFA'}</Text>
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
  categories: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, maxHeight: 40 },
  categoryChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, marginRight: Spacing.sm },
  categoryChipActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  categoryTextActive: { color: Colors.text, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  courseCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  courseImage: { width: '100%', height: 140 },
  courseInfo: { padding: Spacing.lg },
  levelBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  levelText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  courseTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 4 },
  courseInstructor: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  courseMeta: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  coursePrice: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
