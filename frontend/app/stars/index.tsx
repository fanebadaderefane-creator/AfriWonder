/**
 * Écran Discovery — Appels vidéo payants (User ↔ Star).
 * Route : `/stars` (module isolé).
 *
 * UX : greeting + recherche + bannière hero featured + stories stars vérifiées
 * + grille des catégories + liste filtrée (par recherche ou catégorie).
 * Tout est piloté côté backend par `/stars/home` et `/stars/discover`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import { useAuthStore } from '../../src/store/authStore';
import starsApi, {
  type StarProfile,
  type StarHomeData,
  type StarCategory,
  STAR_CATEGORIES,
} from '../../src/api/starsApi';

/** Palette type landing « Talk with Stars » (violet + orange lisible). */
const TW_PURPLE = '#8B5CF6';
const TW_PURPLE_DEEP = '#7C3AED';
const TW_ORANGE = '#F97316';

/** Tablette / web large — barre latérale type capture « Talk with Stars ». */
const SIDEBAR_BREAKPOINT = 768;

const HOW_IT_WORKS_STEPS = [
  {
    step: 'Étape 01',
    title: 'Choisis',
    desc: 'Parcours les créateurs, filtres par catégorie et trouve la personne qui te correspond.',
    icon: 'search' as const,
  },
  {
    step: 'Étape 02',
    title: 'Réserve',
    desc: 'Choisis une date, un créneau et une durée. Le paiement est sécurisé jusqu’à l’appel.',
    icon: 'calendar-outline' as const,
  },
  {
    step: 'Étape 03',
    title: 'Appelle',
    desc: 'Au moment prévu, rejoins l’appel vidéo depuis AfriWonder — même qualité qu’un FaceTime.',
    icon: 'videocam-outline' as const,
  },
];

// ============================================================
// MAPPING UI : icône + fond doux + libellé FR (badges orange type capture)
// ============================================================
const CATEGORY_META: Record<
  StarCategory,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; tint: string; labelFr: string }
> = {
  Musicians: { icon: 'musical-notes', bg: '#FFE2D8', tint: '#D44E1F', labelFr: 'Musicien·ne' },
  Comedians: { icon: 'happy-outline', bg: '#EAE0FF', tint: '#5E2BD0', labelFr: 'Humour' },
  Coachs: { icon: 'fitness-outline', bg: '#FFE2EE', tint: '#C03A77', labelFr: 'Coach' },
  Influencer: { icon: 'sparkles-outline', bg: '#E0F4FF', tint: '#1A6BB0', labelFr: 'Influenceur·se' },
  Media: { icon: 'mic-outline', bg: '#FFF1D8', tint: '#B07A0E', labelFr: 'Média' },
  Mentors: { icon: 'school-outline', bg: '#E5F4E1', tint: '#2E7B27', labelFr: 'Mentor·ne' },
  Other: { icon: 'star-outline', bg: '#EDEEF2', tint: '#555', labelFr: 'Autre' },
};

function priceFromAny(p: StarProfile): number | null {
  return [p.price_fcfa_5min, p.price_fcfa_10min, p.price_fcfa_15min]
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b)[0] ?? null;
}

export default function StarsDiscoveryScreen() {
  return <StarsDiscoveryContent />;
}

function StarsDiscoveryContent() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const searchInputRef = useRef<TextInput>(null);

  const user = useAuthStore((s) => s.user);
  const greeting = user?.full_name?.split(' ')[0] || user?.username || '';

  const [home, setHome] = useState<StarHomeData | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<StarCategory | null>(null);
  const [filtered, setFiltered] = useState<StarProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    try {
      setError(null);
      const out = await starsApi.discoverHome();
      setHome(out);
    } catch (e) {
      setError((e as Error)?.message || 'Impossible de charger les créateurs.');
    }
  }, []);

  const loadFiltered = useCallback(async (q: string, cat: StarCategory | null) => {
    if (!q.trim() && !cat) {
      setFiltered(null);
      return;
    }
    try {
      setError(null);
      const out = await starsApi.discover({
        search: q.trim() || undefined,
        category: cat ?? undefined,
        limit: 40,
      });
      setFiltered(out.items);
    } catch (e) {
      setError((e as Error)?.message || 'Impossible de charger les créateurs.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadHome().finally(() => setLoading(false));
  }, [loadHome]);

  useEffect(() => {
    void loadFiltered(search, activeCategory);
  }, [search, activeCategory, loadFiltered]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadHome(), loadFiltered(search, activeCategory)]);
    setRefreshing(false);
  }, [loadHome, loadFiltered, search, activeCategory]);

  const statsCreators = useMemo(() => {
    if (!home?.categories?.length) return 6;
    const ids = new Set<string>();
    home.categories.forEach((cat) => cat.preview.forEach((p) => ids.add(p.id)));
    return Math.max(ids.size, home.categories.reduce((n, c) => n + (c.count || 0), 0));
  }, [home]);

  const statsCalls = useMemo(() => {
    if (!home?.categories?.length) return 500;
    const n = home.categories.reduce((acc, c) => acc + c.preview.reduce((s, p) => s + (p.calls_completed || 0), 0), 0);
    return Math.max(n, 500);
  }, [home]);

  const satisfactionLabel = useMemo(() => {
    const f = home?.featured;
    if (f && f.rating_count > 0) return `${f.rating_avg.toFixed(1)}★`;
    return '4.8★';
  }, [home]);

  const showFilteredList = !!filtered;

  const renderVerticalCard = useCallback(
    (item: StarProfile, extraWrap?: { marginHorizontal?: number }) => {
      const avatar = item.user?.profile_image || null;
      const name = item.user?.full_name || item.user?.username || 'Star';
      const minPrice = priceFromAny(item);
      const cat = item.category;
      const catFr = cat ? CATEGORY_META[cat].labelFr : null;
      const ratingShow = item.rating_count > 0 ? item.rating_avg.toFixed(1) : '—';
      const mh = extraWrap?.marginHorizontal ?? 0;
      const calls = item.calls_completed || 0;
      const callsLabel =
        calls >= 1000 ? `${(calls / 1000).toFixed(1)}k appels` : `${calls} appels`;

      return (
        <TouchableOpacity
          style={[styles.vCard, mh ? { marginHorizontal: mh } : undefined]}
          activeOpacity={0.88}
          onPress={() => router.push(`/stars/${item.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Profil ${name}`}
        >
          <View style={styles.vCardImageWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.vCardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.vCardImage, styles.vCardImageFallback]}>
                <Ionicons name="person" size={36} color={colors.textSecondary} />
              </View>
            )}
            {item.is_active ? (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>En ligne</Text>
              </View>
            ) : null}
            <View style={styles.purpleCornerDot} />
          </View>
          <View style={styles.vCardBody}>
            <View style={styles.vCardTitleRow}>
              <Text style={styles.vCardName} numberOfLines={1}>{name}</Text>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={styles.ratingPillText}>{ratingShow}</Text>
              </View>
            </View>
            {catFr ? (
              <View style={styles.catOrangePill}>
                <Text style={styles.catOrangePillText}>{catFr}</Text>
              </View>
            ) : null}
            <View style={styles.vCardFooter}>
              <Text style={styles.vCardPrice} numberOfLines={1}>
                {minPrice ? `À partir de F ${minPrice.toLocaleString('fr-FR')}` : 'Voir tarifs'}
              </Text>
              <View style={styles.vCardCalls}>
                <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.vCardCallsText}>{callsLabel}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors.textSecondary, styles],
  );

  // ---------- HERO ----------
  const renderHero = useCallback(() => {
    const featured = home?.featured;
    if (!featured) return null;
    const name = featured.user?.full_name || featured.user?.username || 'Star';
    const avatar = featured.user?.profile_image;
    const ratingTxt = featured.rating_count > 0 ? featured.rating_avg.toFixed(1) : '—';
    return (
      <TouchableOpacity
        style={styles.hero}
        activeOpacity={0.9}
        onPress={() => router.push(`/stars/${featured.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`Réserver ${name}`}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]} />
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroBody}>
          <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.heroMetaText}>{ratingTxt}</Text>
            {featured.display_id ? (
              <>
                <Text style={styles.heroMetaSep}>|</Text>
                <Text style={styles.heroMetaText}>#{featured.display_id}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.heroCta}>
          <Ionicons name="videocam" size={14} color="#FFF" />
          <Text style={styles.heroCtaText}>Réserver</Text>
        </View>
      </TouchableOpacity>
    );
  }, [home, styles]);

  // ---------- STORIES ----------
  const renderStories = useCallback(() => {
    if (!home?.stories?.length) return null;
    return (
      <View style={{ paddingTop: Spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          {home.stories.map((s) => {
            const av = s.user?.profile_image;
            const fname = (s.user?.full_name || s.user?.username || 'Star').split(' ')[0];
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.storyItem}
                activeOpacity={0.85}
                onPress={() => router.push(`/stars/${s.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Profil ${fname}`}
              >
                <View style={styles.storyRing}>
                  {av ? (
                    <Image source={{ uri: av }} style={styles.storyAvatar} />
                  ) : (
                    <View style={[styles.storyAvatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={18} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{fname}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [home, styles, colors]);

  // ---------- CATÉGORIES (puces horizontales type capture Explorer) ----------
  const renderCategoryChips = useCallback(() => {
    const cats = home?.categories ?? [];
    const available = STAR_CATEGORIES.filter((c) => cats.find((x) => x.category === c));
    if (available.length === 0) return null;
    return (
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, !activeCategory && styles.filterChipOn]}
            onPress={() => setActiveCategory(null)}
            accessibilityRole="button"
          >
            <Text style={[styles.filterChipTxt, !activeCategory && styles.filterChipTxtOn]}>Tous</Text>
          </TouchableOpacity>
          {available.map((c) => {
            const meta = CATEGORY_META[c];
            const on = activeCategory === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, on && styles.filterChipOn]}
                onPress={() => setActiveCategory(on ? null : c)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrer ${meta.labelFr}`}
              >
                <Ionicons name={meta.icon} size={16} color={on ? '#FFFFFF' : meta.tint} />
                <Text style={[styles.filterChipTxt, on && styles.filterChipTxtOn]}>{meta.labelFr}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [home, activeCategory, styles]);

  const renderItem = useCallback(
    ({ item }: { item: StarProfile }) => (
      <View style={styles.gridHalfCell}>{renderVerticalCard(item)}</View>
    ),
    [renderVerticalCard, styles.gridHalfCell],
  );

  const { width: windowWidth } = useWindowDimensions();
  const layoutWide = windowWidth >= SIDEBAR_BREAKPOINT;
  const homeScrollRef = useRef<ScrollView>(null);

  const renderHowItWorks = useCallback(() => (
    <View style={styles.howItWorksSection}>
      <Text style={styles.howItWorksTitle}>Comment ça marche ?</Text>
      <View style={styles.howItWorksCards}>
        {HOW_IT_WORKS_STEPS.map((s) => (
          <View
            key={s.step}
            style={[
              styles.howCard,
              layoutWide && windowWidth >= 960 ? styles.howCardThreeCol : styles.howCardStack,
            ]}
          >
            <View style={styles.howCardIconCircle}>
              <Ionicons name={s.icon} size={24} color="#2563EB" />
            </View>
            <Text style={styles.howStepLabel}>{s.step}</Text>
            <Text style={styles.howCardTitle}>{s.title}</Text>
            <Text style={styles.howCardDesc}>{s.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  ), [styles, layoutWide, windowWidth]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, flexDirection: layoutWide ? 'row' : 'column' }}>
        {layoutWide ? (
          <StarsSidebarRail
            styles={styles}
            bottomInset={insets.bottom}
            onHome={() => homeScrollRef.current?.scrollTo({ y: 0, animated: true })}
            onExplore={() => searchInputRef.current?.focus()}
          />
        ) : null}
        <View style={styles.mainColumn}>
      {/* HEADER : avatar + greeting + cloche */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {layoutWide ? 'Explorer' : 'Talk with Stars'}
          </Text>
          {layoutWide ? (
            <Text style={styles.greeting}>Trouve le créateur idéal pour ton appel</Text>
          ) : greeting ? (
            <Text style={styles.greeting}>Salut {greeting} · Réserve ton créneau</Text>
          ) : (
            <Text style={styles.greeting}>Réserve un appel vidéo avec un créateur</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/stars/dashboard' as never)}
          accessibilityLabel="Mon espace star"
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Rechercher une star, une catégorie..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Effacer la recherche">
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* CATEGORY ACTIVE BANNER */}
      {activeCategory ? (
        <View style={styles.activeFilterRow}>
          <View style={[styles.activeFilterChip, { backgroundColor: CATEGORY_META[activeCategory].bg }]}>
            <Ionicons
              name={CATEGORY_META[activeCategory].icon}
              size={14}
              color={CATEGORY_META[activeCategory].tint}
            />
            <Text style={[styles.activeFilterText, { color: CATEGORY_META[activeCategory].tint }]}>
              {CATEGORY_META[activeCategory].labelFr}
            </Text>
            <TouchableOpacity onPress={() => setActiveCategory(null)} accessibilityLabel="Retirer le filtre">
              <Ionicons name="close" size={14} color={CATEGORY_META[activeCategory].tint} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={TW_PURPLE} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { void loadHome(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : showFilteredList ? (
        // ---------- LISTE FILTRÉE ----------
        filtered && filtered.length > 0 ? (
          <FlatList
            data={filtered}
            numColumns={2}
            keyExtractor={(it) => it.id}
            columnWrapperStyle={styles.gridColumnWrap}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxxl * 2 }}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TW_PURPLE} />}
          />
        ) : (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucune star ne correspond à ta recherche.</Text>
          </View>
        )
      ) : (
        // ---------- HOME ----------
        <ScrollView
          ref={homeScrollRef}
          contentContainerStyle={{ paddingBottom: Spacing.xxxl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TW_PURPLE} />}
        >
          <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroHeadline}>
                Parle avec tes <Text style={styles.heroHeadlineAccent}>créateurs</Text> préférés
              </Text>
              <Text style={styles.heroSub}>
                Réserve un appel vidéo privé sécurisé — paiement en séquestre jusqu’à l’appel.
              </Text>
              <View style={styles.heroBtns}>
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={() => searchInputRef.current?.focus()}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnTxt}>Explorer les créateurs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroGhostBtn}
                  onPress={() => router.push('/stars/become' as never)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.heroGhostBtnTxt}>Devenir créateur</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statsStrip}>
                <View style={styles.statBox}>
                  <Text style={styles.statStrong}>{statsCreators}+</Text>
                  <Text style={styles.statMuted}>Créateurs</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statStrong}>{statsCalls}+</Text>
                  <Text style={styles.statMuted}>Appels</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statStrong}>{satisfactionLabel}</Text>
                  <Text style={styles.statMuted}>Satisfaction</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
            {renderHero()}
          </View>
          {renderStories()}
          {renderCategoryChips()}

          {/* Créateurs populaires — grille 2 colonnes */}
          {home && home.categories.length > 0 ? (
            <View style={{ paddingTop: Spacing.lg, paddingHorizontal: Spacing.md }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Créateurs populaires</Text>
              </View>
              <View style={styles.gridWrap}>
                {home.categories
                  .flatMap((c) => c.preview)
                  .slice(0, 8)
                  .map((p) => (
                    <View key={p.id} style={styles.gridHalfCell}>
                      {renderVerticalCard(p)}
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          {renderHowItWorks()}

          {!home || home.categories.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="videocam-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucune star disponible.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => router.push('/stars/become' as never)}>
                <Text style={styles.retryText}>Devenir star</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

        </View>
      </View>

      {/* FAB — masqué si barre latérale (bouton orange déjà dans le rail). */}
      {!layoutWide ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/stars/become' as never)}
          accessibilityRole="button"
          accessibilityLabel="Devenir star"
        >
          <Ionicons name="star" size={16} color="#FFF" />
          <Text style={styles.fabText}>Devenir star</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(
  c: {
    background: string;
    text: string;
    textSecondary: string;
    primary: string;
    card: string;
    border: string;
  },
  mode: 'light' | 'dark',
) {
  const heroCopyBg = mode === 'light' ? '#FFFFFF' : '#1F1F27';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    backBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: FontSizes.xl, fontWeight: '800' },
    greeting: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
    searchRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: c.card, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, height: 44,
      borderWidth: 1, borderColor: c.border,
    },
    searchInput: {
      flex: 1, color: c.text, fontSize: FontSizes.md, outlineStyle: 'none',
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    } as never,
    activeFilterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    activeFilterChip: {
      flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
      paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.pill,
    },
    activeFilterText: { fontSize: FontSizes.sm, fontWeight: '700' },

    // Landing copy (inspiré captures Talk with Stars)
    heroCopy: {
      backgroundColor: heroCopyBg,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: mode === 'light' ? '#F0F0F5' : '#333342',
    },
    heroHeadline: {
      color: c.text,
      fontSize: FontSizes.display,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 34,
    },
    heroHeadlineAccent: {
      color: TW_PURPLE_DEEP,
      fontWeight: '800',
    },
    heroSub: {
      color: c.textSecondary,
      fontSize: FontSizes.sm,
      textAlign: 'center',
      marginTop: Spacing.sm,
      lineHeight: 20,
    },
    heroBtns: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      justifyContent: 'center',
      marginTop: Spacing.lg,
    },
    heroPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: TW_PURPLE,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.pill,
      minHeight: 48,
    },
    heroPrimaryBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: FontSizes.md },
    heroGhostBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.pill,
      borderWidth: 2,
      borderColor: TW_PURPLE,
      minHeight: 48,
      justifyContent: 'center',
    },
    heroGhostBtnTxt: { color: TW_PURPLE, fontWeight: '800', fontSize: FontSizes.md },
    statsStrip: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: Spacing.lg,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: mode === 'light' ? '#EEEEF5' : '#333342',
    },
    statBox: { alignItems: 'center', gap: 2 },
    statStrong: { color: c.text, fontSize: FontSizes.lg, fontWeight: '900' },
    statMuted: { color: c.textSecondary, fontSize: FontSizes.xs },

    chipsSection: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
    chipsScroll: { gap: Spacing.sm, paddingVertical: Spacing.xs, alignItems: 'center' },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: BorderRadius.pill,
      borderWidth: 1,
      borderColor: mode === 'light' ? '#E4E4EE' : '#444454',
      backgroundColor: mode === 'light' ? '#F7F7FA' : '#2A2A34',
    },
    filterChipOn: {
      backgroundColor: TW_PURPLE,
      borderColor: TW_PURPLE,
    },
    filterChipTxt: { color: c.text, fontSize: FontSizes.sm, fontWeight: '700' },
    filterChipTxtOn: { color: '#FFFFFF' },

    // Hero featured
    hero: {
      borderRadius: BorderRadius.xl, overflow: 'hidden', height: 160,
      backgroundColor: c.card, justifyContent: 'flex-end',
    },
    heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    heroFallback: { backgroundColor: c.border },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.30)',
    },
    heroBody: {
      paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    },
    heroName: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    heroMetaText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
    heroMetaSep: { color: '#FFF', opacity: 0.7 },
    heroCta: {
      position: 'absolute', right: Spacing.md, bottom: Spacing.md,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: TW_PURPLE, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.pill,
    },
    heroCtaText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },

    // Stories
    storiesRow: {
      paddingHorizontal: Spacing.md, gap: Spacing.md,
    },
    storyItem: { alignItems: 'center', width: 70 },
    storyRing: {
      width: 64, height: 64, borderRadius: 32, padding: 2,
      borderWidth: 2, borderColor: TW_PURPLE, alignItems: 'center', justifyContent: 'center',
    },
    storyAvatar: { width: 56, height: 56, borderRadius: 28 },
    storyName: { color: c.text, fontSize: FontSizes.xs, marginTop: 6, textAlign: 'center' } as never,

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800' },

    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridHalfCell: {
      width: '48%',
      marginBottom: Spacing.md,
    },
    gridColumnWrap: {
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },

    vCard: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    vCardImageWrap: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1,
      backgroundColor: mode === 'light' ? '#F0F0F5' : '#2C2C38',
    },
    vCardImage: { width: '100%', height: '100%' },
    vCardImageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    onlineBadge: {
      position: 'absolute',
      top: Spacing.sm,
      left: Spacing.sm,
      backgroundColor: '#22C55E',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.pill,
    },
    onlineBadgeText: { color: '#FFFFFF', fontSize: FontSizes.xs, fontWeight: '800' },
    purpleCornerDot: {
      position: 'absolute',
      top: Spacing.sm,
      right: Spacing.sm,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: TW_PURPLE,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    vCardBody: { padding: Spacing.md },
    vCardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    vCardName: { flex: 1, color: c.text, fontSize: FontSizes.md, fontWeight: '800' },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: mode === 'light' ? '#FFF8E7' : '#3A3428',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.pill,
    },
    ratingPillText: { color: c.text, fontSize: FontSizes.xs, fontWeight: '800' },
    catOrangePill: {
      alignSelf: 'flex-start',
      marginTop: Spacing.sm,
      backgroundColor: TW_ORANGE,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BorderRadius.pill,
    },
    catOrangePillText: { color: '#FFFFFF', fontSize: FontSizes.xs, fontWeight: '800' },
    vCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
      gap: Spacing.sm,
    },
    vCardPrice: {
      flex: 1,
      color: c.text,
      fontSize: FontSizes.sm,
      fontWeight: '800',
    },
    vCardCalls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    vCardCallsText: { color: c.textSecondary, fontSize: FontSizes.xs, fontWeight: '600' },

    avatarFallback: { backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },

    // Empty / error
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
    errorText: { color: c.text, fontSize: FontSizes.md, textAlign: 'center' },
    emptyText: { color: c.text, fontSize: FontSizes.md, textAlign: 'center' },
    retryBtn: {
      paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: TW_PURPLE, borderRadius: BorderRadius.pill,
    },
    retryText: { color: '#FFF', fontWeight: '700' },

    // FAB
    fab: {
      position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: Spacing.lg, height: 48, borderRadius: 24, backgroundColor: TW_ORANGE,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    },
    fabText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },

    mainColumn: { flex: 1, minWidth: 0 },

    sidebarRail: {
      width: 232,
      backgroundColor: '#151018',
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.sm,
      borderRightWidth: 1,
      borderRightColor: '#2A2530',
      justifyContent: 'space-between',
    },
    sidebarBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    sidebarBrandTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: FontSizes.sm, flex: 1 },
    sidebarNav: { gap: 4 },
    sidebarNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.lg,
    },
    sidebarNavItemActive: { backgroundColor: TW_PURPLE_DEEP },
    sidebarNavLabel: { color: '#B8B8CC', fontWeight: '600', fontSize: FontSizes.sm, flex: 1 },
    sidebarNavLabelActive: { color: '#FFFFFF' },
    sidebarAlertDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F472B6',
    },
    sidebarBecome: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: TW_ORANGE,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.lg,
      marginHorizontal: Spacing.xs,
    },
    sidebarBecomeText: { color: '#FFFFFF', fontWeight: '800', fontSize: FontSizes.sm },

    howItWorksSection: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xl,
    },
    howItWorksTitle: {
      color: c.text,
      fontSize: FontSizes.xl,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    howItWorksCards: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      justifyContent: 'center',
    },
    howCard: {
      backgroundColor: mode === 'light' ? '#FFFFFF' : '#252530',
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: mode === 'light' ? '#E8E8EF' : '#3A3A48',
      ...(mode === 'light'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }
        : {}),
    },
    howCardStack: {
      width: '100%',
      maxWidth: 320,
      alignSelf: 'center',
    },
    howCardThreeCol: {
      flex: 1,
      minWidth: 200,
      maxWidth: 440,
    },
    howCardIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: mode === 'light' ? '#DBEAFE' : '#1E3A5F',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    howStepLabel: {
      color: TW_PURPLE,
      fontSize: FontSizes.xs,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    howCardTitle: {
      color: c.text,
      fontSize: FontSizes.md,
      fontWeight: '800',
      marginBottom: Spacing.sm,
    },
    howCardDesc: {
      color: c.textSecondary,
      fontSize: FontSizes.sm,
      lineHeight: 20,
    },
  });
}

type StarsDiscoveryStyles = ReturnType<typeof createStyles>;

function StarsSidebarRail(props: {
  styles: StarsDiscoveryStyles;
  bottomInset: number;
  onHome: () => void;
  onExplore: () => void;
}) {
  const { styles, bottomInset, onHome, onExplore } = props;
  const navSecondary = '#B8B8CC';

  const Item = ({
    icon,
    label,
    onPress,
    active,
    alertDot,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    active?: boolean;
    alertDot?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.sidebarNavItem, active && styles.sidebarNavItemActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={active ? '#FFFFFF' : navSecondary} />
      <Text style={[styles.sidebarNavLabel, active && styles.sidebarNavLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {alertDot ? <View style={styles.sidebarAlertDot} /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.sidebarRail, { paddingBottom: bottomInset + Spacing.md }]}>
      <View>
        <View style={styles.sidebarBrand}>
          <Ionicons name="star" size={22} color="#FBBF24" />
          <Text style={styles.sidebarBrandTitle} numberOfLines={2}>
            Talk with Stars
          </Text>
        </View>
        <View style={styles.sidebarNav}>
          <Item icon="home-outline" label="Accueil" onPress={onHome} active />
          <Item icon="compass-outline" label="Explorer" onPress={onExplore} />
          <Item icon="radio-outline" label="Lives" onPress={() => router.push('/live' as never)} />
          <Item icon="call-outline" label="Appels" onPress={() => router.push('/stars/bookings' as never)} />
          <Item icon="notifications-outline" label="Alertes" onPress={() => router.push('/messages' as never)} alertDot />
          <Item icon="person-outline" label="Profil" onPress={() => router.push('/(tabs)/profile' as never)} />
        </View>
      </View>
      <TouchableOpacity
        style={styles.sidebarBecome}
        onPress={() => router.push('/stars/become' as never)}
        accessibilityRole="button"
        accessibilityLabel="Devenir créateur"
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.sidebarBecomeText}>Devenir créateur</Text>
      </TouchableOpacity>
    </View>
  );
}
