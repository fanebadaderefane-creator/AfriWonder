import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.xl * 2 - Spacing.md) / 2;

const CATEGORIES = ['Tous', 'Finance', 'Sante', 'Education', 'Commerce', 'Jeux', 'Outils'];

const MINI_APPS = [
  { id: 'ma1', name: 'Calculateur FCFA', icon: 'calculator', color: '#FF6B6B', rating: 4.8, installs: '50K+', category: 'Finance' },
  { id: 'ma2', name: 'Meteo Mali', icon: 'partly-sunny', color: '#4ECDC4', rating: 4.5, installs: '100K+', category: 'Outils' },
  { id: 'ma3', name: 'Jeu du Wari', icon: 'game-controller', color: '#DDA0DD', rating: 4.9, installs: '200K+', category: 'Jeux' },
  { id: 'ma4', name: 'Sante Bebe', icon: 'medkit', color: '#45B7D1', rating: 4.7, installs: '30K+', category: 'Sante' },
  { id: 'ma5', name: 'Apprendre Bambara', icon: 'book', color: '#82E0AA', rating: 4.6, installs: '75K+', category: 'Education' },
  { id: 'ma6', name: 'Gestion Stock', icon: 'list', color: '#F7DC6F', rating: 4.3, installs: '25K+', category: 'Commerce' },
];

export default function MiniAppsScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Mini-Apps</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Chercher une mini-app..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity key={cat} style={[styles.categoryChip, activeCategory === i && styles.categoryChipActive]} onPress={() => setActiveCategory(i)}>
            <Text style={[styles.categoryText, activeCategory === i && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {MINI_APPS.map((app) => (
            <TouchableOpacity key={app.id} style={styles.appCard}>
              <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                <Ionicons name={app.icon as any} size={28} color="#FFF" />
              </View>
              <Text style={styles.appName}>{app.name}</Text>
              <View style={styles.appMeta}>
                <Ionicons name="star" size={12} color={Colors.accent} />
                <Text style={styles.appRating}>{app.rating}</Text>
              </View>
              <Text style={styles.appInstalls}>{app.installs}</Text>
              <TouchableOpacity style={styles.installBtn}><Text style={styles.installBtnText}>Installer</Text></TouchableOpacity>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.md },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  categories: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, maxHeight: 40 },
  categoryChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, marginRight: Spacing.sm },
  categoryChipActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  categoryTextActive: { color: Colors.text, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  appCard: { width: CARD_SIZE, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center' },
  appIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  appName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  appMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  appRating: { color: Colors.text, fontSize: FontSizes.xs },
  appInstalls: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  installBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  installBtnText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
});
