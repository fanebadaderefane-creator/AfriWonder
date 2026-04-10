import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const PETITIONS = [
  { id: 'p1', title: 'Plus d\'ecoles dans les zones rurales', signatures: 15600, goal: 20000, image: 'https://picsum.photos/100/100?random=190' },
  { id: 'p2', title: 'Ameliorer l\'acces a l\'eau potable', signatures: 8900, goal: 10000, image: 'https://picsum.photos/100/100?random=191' },
  { id: 'p3', title: 'Protection de l\'environnement au Sahel', signatures: 3400, goal: 5000, image: 'https://picsum.photos/100/100?random=192' },
];

const PROJECTS = [
  { id: 'pr1', title: 'Nettoyage du fleuve Niger', date: '15 Juillet 2025', participants: 250, icon: 'water' },
  { id: 'pr2', title: 'Plantation d\'arbres a Bamako', date: '22 Juillet 2025', participants: 180, icon: 'leaf' },
  { id: 'pr3', title: 'Cours d\'alphabetisation', date: '1er Aout 2025', participants: 45, icon: 'book' },
];

export default function CivicScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Engagement civique</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Impact Card */}
        <View style={styles.impactCard}>
          <Ionicons name="heart" size={32} color={Colors.primary} />
          <Text style={styles.impactTitle}>Votre impact</Text>
          <Text style={styles.impactValue}>3 petitions signees, 2 projets soutenus</Text>
        </View>

        {/* Petitions */}
        <Text style={styles.sectionTitle}>Petitions en cours</Text>
        {PETITIONS.map((petition) => (
          <TouchableOpacity key={petition.id} style={styles.petitionCard}>
            <Image source={{ uri: petition.image }} style={styles.petitionImage} />
            <View style={styles.petitionInfo}>
              <Text style={styles.petitionTitle}>{petition.title}</Text>
              <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${(petition.signatures / petition.goal) * 100}%` }]} /></View>
              <Text style={styles.petitionSignatures}>{petition.signatures.toLocaleString()} / {petition.goal.toLocaleString()} signatures</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Community Projects */}
        <Text style={styles.sectionTitle}>Projets communautaires</Text>
        {PROJECTS.map((project) => (
          <TouchableOpacity key={project.id} style={styles.projectCard}>
            <View style={styles.projectIcon}><Ionicons name={project.icon as any} size={24} color={Colors.primary} /></View>
            <View style={styles.projectInfo}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectDate}>{project.date}</Text>
              <Text style={styles.projectParticipants}>{project.participants} participants</Text>
            </View>
            <TouchableOpacity style={styles.joinBtn}><Text style={styles.joinBtnText}>Rejoindre</Text></TouchableOpacity>
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
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  impactCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  impactTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: Spacing.sm },
  impactValue: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  petitionCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  petitionImage: { width: 60, height: 60, borderRadius: BorderRadius.sm },
  petitionInfo: { flex: 1 },
  petitionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.sm },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  petitionSignatures: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  projectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  projectIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  projectInfo: { flex: 1 },
  projectTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  projectDate: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  projectParticipants: { color: Colors.textMuted, fontSize: FontSizes.xs },
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  joinBtnText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
});
