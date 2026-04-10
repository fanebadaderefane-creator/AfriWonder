import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const INTERESTS = [
  { id: 'music', label: 'Musique', icon: 'musical-notes', color: '#E91E63' },
  { id: 'dance', label: 'Danse', icon: 'body', color: '#FF6B00' },
  { id: 'food', label: 'Cuisine', icon: 'restaurant', color: '#4CAF50' },
  { id: 'fashion', label: 'Mode', icon: 'shirt', color: '#9C27B0' },
  { id: 'sport', label: 'Sport', icon: 'football', color: '#2196F3' },
  { id: 'tech', label: 'Tech', icon: 'hardware-chip', color: '#00BCD4' },
  { id: 'beauty', label: 'Beauté', icon: 'sparkles', color: '#FF4081' },
  { id: 'culture', label: 'Culture', icon: 'globe', color: '#FF9800' },
  { id: 'business', label: 'Business', icon: 'briefcase', color: '#607D8B' },
  { id: 'education', label: 'Éducation', icon: 'school', color: '#3F51B5' },
  { id: 'comedy', label: 'Humour', icon: 'happy', color: '#FFEB3B' },
  { id: 'art', label: 'Art', icon: 'color-palette', color: '#E040FB' },
  { id: 'travel', label: 'Voyage', icon: 'airplane', color: '#4ECDC4' },
  { id: 'health', label: 'Santé', icon: 'fitness', color: '#F44336' },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller', color: '#7C4DFF' },
  { id: 'news', label: 'Actualités', icon: 'newspaper', color: '#795548' },
];

export default function InterestsScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Qu'est-ce qui vous passionne ?</Text>
        <Text style={styles.subtitle}>Sélectionnez au moins 3 centres d'intérêt pour personnaliser votre expérience</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {INTERESTS.map(interest => {
          const isSelected = selected.includes(interest.id);
          return (
            <TouchableOpacity key={interest.id} style={[styles.card, isSelected && { borderColor: interest.color, borderWidth: 2 }]} onPress={() => toggle(interest.id)}>
              <View style={[styles.iconCircle, { backgroundColor: interest.color + '20' }]}>
                <Ionicons name={interest.icon as any} size={28} color={interest.color} />
              </View>
              <Text style={[styles.cardLabel, isSelected && { color: interest.color }]}>{interest.label}</Text>
              {isSelected && <View style={[styles.checkBadge, { backgroundColor: interest.color }]}><Ionicons name="checkmark" size={14} color="#FFF" /></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.countText}>{selected.length}/3 minimum</Text>
        <TouchableOpacity
          style={[styles.continueBtn, selected.length < 3 && { opacity: 0.4 }]}
          disabled={selected.length < 3}
          onPress={() => router.replace('/(tabs)')}
        >
          <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueBtnGradient}>
            <Text style={styles.continueBtnText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  title: { color: Colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: 120 },
  card: { width: '30.5%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'transparent' },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600', textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.background, paddingHorizontal: Spacing.xl, paddingBottom: 34, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border },
  countText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: 8, fontSize: FontSizes.sm },
  continueBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  continueBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, gap: 8 },
  continueBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
});
