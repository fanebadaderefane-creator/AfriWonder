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

  const CATEGORIES = [
    { id: 'general', name: 'General', icon: 'radio' },
    { id: 'music', name: 'Musique', icon: 'musical-notes' },
    { id: 'dance', name: 'Danse', icon: 'body' },
    { id: 'cooking', name: 'Cuisine', icon: 'restaurant' },
    { id: 'fashion', name: 'Mode', icon: 'shirt' },
    { id: 'gaming', name: 'Gaming', icon: 'game-controller' },
  ];

  const handleStartLive = () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre pour votre live');
      return;
    }
    Alert.alert(
      'Live demarre!',
      'Votre live est en cours. Cette fonctionnalite sera completement integree bientot.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={Colors.text} />
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
          maxLength={100}
        />

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
        <TouchableOpacity style={styles.startButton} onPress={handleStartLive}>
          <View style={styles.liveDot} />
          <Text style={styles.startButtonText}>Demarrer le Live</Text>
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
    marginBottom: Spacing.xxl,
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
