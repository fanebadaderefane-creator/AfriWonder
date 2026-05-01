import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../src/theme/designSystem';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setSuggestCreatorsDone, setPersonalizationPending } from '../src/utils/onboardingFlow';
import apiClient from '../src/api/client';
import { profileAvatarUri } from '../src/utils/avatarFallback';
import { ImageOrPlaceholder } from '../src/components/common/ImageOrPlaceholder';

type CreatorRow = { id: string; name: string; handle: string; avatar: string; followers: string };

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export default function SuggestCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/me/friends-suggestions', { params: { limit: 24 } });
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        const mapped: CreatorRow[] = (list as any[]).map((u) => {
          const username = String(u.username || '').trim() || 'user';
          const name = String(u.full_name || username).trim();
          const fc = Number(u.followers_count ?? u._count?.follows ?? 0) || 0;
          return {
            id: String(u.id),
            name,
            handle: `@${username}`,
            avatar: profileAvatarUri(u.profile_image, u.id),
            followers: formatFollowers(fc),
          };
        });
        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = useCallback(async (id: string) => {
    const next = !following[id];
    setFollowing((prev) => ({ ...prev, [id]: next }));
    if (!next) return;
    try {
      await apiClient.post(`/users/${encodeURIComponent(id)}/follow`, {});
    } catch {
      setFollowing((prev) => ({ ...prev, [id]: false }));
      Alert.alert('Suivi', 'Impossible de suivre ce profil pour le moment.');
    }
  }, [following]);

  const finish = async () => {
    await setSuggestCreatorsDone();
    await setPersonalizationPending(false);
    router.replace('/(tabs)');
  };

  const renderItem = ({ item }: { item: CreatorRow }) => {
    const isF = following[item.id];
    return (
      <View style={styles.row}>
        <ImageOrPlaceholder uri={item.avatar} style={styles.avatar} icon="person" iconSize={26} />
        <View style={styles.meta}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.handle}>{item.handle}</Text>
          <Text style={styles.followers}>{item.followers} dans son Wonder</Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, isF && styles.followBtnActive, { minHeight: MIN_TOUCH_TARGET, minWidth: 100, justifyContent: 'center' }]}
          onPress={() => void toggle(item.id)}
          accessibilityRole="button"
          accessibilityLabel={isF ? `Retirer ${item.name} de mon Wonder` : `Wonder ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.followBtnText, isF && styles.followBtnTextActive]}>{isF ? 'Dans son Wonder' : 'Wonder'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Créateurs pour vous</Text>
        <Text style={styles.subtitle}>Suggestions basées sur votre activité. Vous pourrez ajuster plus tard.</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune suggestion pour le moment. Passez cette étape pour continuer.</Text>
          }
        />
      )}

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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty: { color: Colors.textMuted, textAlign: 'center', padding: Spacing.xl },
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
  ctaText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
});
