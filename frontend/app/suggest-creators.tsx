import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../src/theme/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setSuggestCreatorsDone, setPersonalizationPending } from '../src/utils/onboardingFlow';

type CreatorRow = { id: string; name: string; handle: string; avatar: string; followers: string };

const SEED: CreatorRow[] = [
  { id: '1', name: 'Aminata K.', handle: '@aminata_official', avatar: 'https://i.pravatar.cc/150?img=32', followers: '120k' },
  { id: '2', name: 'Ibrahim D.', handle: '@ibrahim_live', avatar: 'https://i.pravatar.cc/150?img=12', followers: '89k' },
  { id: '3', name: 'Fatou M.', handle: '@fatou_style', avatar: 'https://i.pravatar.cc/150?img=45', followers: '210k' },
  { id: '4', name: 'Kwame T.', handle: '@kwame_beats', avatar: 'https://i.pravatar.cc/150?img=60', followers: '56k' },
  { id: '5', name: 'Aïcha B.', handle: '@aicha_cuisine', avatar: 'https://i.pravatar.cc/150?img=47', followers: '340k' },
];

export default function SuggestCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setFollowing((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const finish = async () => {
    await setSuggestCreatorsDone();
    await setPersonalizationPending(false);
    router.replace('/(tabs)');
  };

  const renderItem = ({ item }: { item: CreatorRow }) => {
    const isF = following[item.id];
    return (
      <View style={styles.row}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} accessibilityLabel={item.name} />
        <View style={styles.meta}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.handle}>{item.handle}</Text>
          <Text style={styles.followers}>{item.followers} abonnés</Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, isF && styles.followBtnActive, { minHeight: MIN_TOUCH_TARGET, minWidth: 100, justifyContent: 'center' }]}
          onPress={() => toggle(item.id)}
          accessibilityRole="button"
          accessibilityLabel={isF ? `Ne plus suivre ${item.name}` : `Suivre ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.followBtnText, isF && styles.followBtnTextActive]}>{isF ? 'Abonné' : 'Suivre'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Créateurs pour vous</Text>
        <Text style={styles.subtitle}>Suivez des profils alignés avec vos centres d’intérêt. Vous pourrez ajuster plus tard.</Text>
      </View>

      <FlatList
        data={SEED}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity onPress={finish} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Passer cette étape">
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finish} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Découvrir le fil AfriWonder">
          <LinearGradient colors={['#FF6B00', '#FF3D00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Text style={styles.ctaText}>Découvrir le fil</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 8, lineHeight: 22 },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 140 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.card },
  meta: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  handle: { color: Colors.textMuted, fontSize: FontSizes.sm },
  followers: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  followBtnActive: { backgroundColor: Colors.primary + '22' },
  followBtnText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  followBtnTextActive: { color: Colors.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.xl, gap: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: BorderRadius.lg },
  ctaText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: '800' },
});
