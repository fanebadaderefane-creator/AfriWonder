import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function StartLiveScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');

  /** Aligné backend `LIVE_CATEGORIES` (ids stables API). */
  const CATEGORIES = [
    { id: 'general', name: 'Général', icon: 'radio' },
    { id: 'musique', name: 'Musique', icon: 'musical-notes' },
    { id: 'gaming', name: 'Jeux', icon: 'game-controller' },
    { id: 'qa', name: 'Q&A', icon: 'help-circle' },
    { id: 'cuisine', name: 'Cuisine', icon: 'restaurant' },
    { id: 'beauty', name: 'Beauté', icon: 'sparkles' },
    { id: 'sport', name: 'Sport', icon: 'basketball' },
    { id: 'actu', name: 'Actualités', icon: 'newspaper' },
    { id: 'education', name: 'Éducation', icon: 'school' },
  ];

  const goToFullSetup = () => {
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Entrez un titre pour continuer vers la configuration complète (CDC).');
      return;
    }
    router.replace({
      pathname: '/live/stream',
      params: { prefilled_title: title.trim(), prefilled_category: category },
    } as never);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demarrer un Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Camera Preview Placeholder */}
        <View style={styles.cameraPreview}>
          <Ionicons name="camera" size={60} color={Colors.textMuted} />
          <Text style={styles.previewText}>Apercu camera</Text>
          <TouchableOpacity style={styles.flipBtn}>
            <Ionicons name="camera-reverse" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.label}>Titre du live</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Ex: Live Dance Mali"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
        <Text style={styles.hintBelow}>
          Mini assistant : la suite (miniature, hashtags, programmation, objectif, contrôle 18+, options studio) se fait
          sur l’écran studio.
        </Text>

        {/* Category */}
        <Text style={styles.label}>Categorie</Text>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={18}
                color={category === cat.id ? Colors.text : Colors.textSecondary}
              />
              <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Options */}
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name="chatbubbles" size={20} color={Colors.textSecondary} />
            <Text style={styles.optionText}>Activer les commentaires</Text>
            <View style={[styles.toggle, styles.toggleActive]}>
              <View style={[styles.toggleCircle, styles.toggleCircleActive]} />
            </View>
          </View>
          <View style={styles.optionRow}>
            <Ionicons name="gift" size={20} color={Colors.textSecondary} />
            <Text style={styles.optionText}>Activer les cadeaux</Text>
            <View style={[styles.toggle, styles.toggleActive]}>
              <View style={[styles.toggleCircle, styles.toggleCircleActive]} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity style={styles.startButton} onPress={goToFullSetup}>
          <View style={styles.liveDot} />
          <Text style={styles.startButtonText}>Continuer vers le studio</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  cameraPreview: {
    height: 250,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  previewText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    marginTop: Spacing.sm,
  },
  flipBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  hintBelow: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.xxl,
    lineHeight: 18,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.text,
  },
  optionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.text,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.live,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.text,
  },
  startButtonText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
});
