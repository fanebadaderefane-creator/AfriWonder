import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes } from '../../src/theme/colors';
import {
  CROWDFUNDING_CATEGORIES,
  PLATFORM_STATS,
  formatCFA,
  formatFullCFA,
  getProgressPercent,
} from '../../src/data/crowdfunding';
import type { CrowdfundingProject } from '../../src/data/crowdfunding';
import { mapApiCampaignToCrowdfundingProject } from '../../src/data/crowdfundingMappers';
import apiClient from '../../src/api/client';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';

const STATUS_FILTERS = [
  { id: '', label: 'Tous' },
  { id: 'active', label: 'Actives' },
  { id: 'funded', label: 'Financées' },
  { id: 'failed', label: 'Échouées' },
] as const;

export default function CrowdfundingHomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<CrowdfundingProject[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 450);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadProjects = useCallback(async () => {
    setListError(null);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 40 };
      if (activeCategory !== 'all') params.category = activeCategory;
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch.length >= 2) params.search = debouncedSearch;
      const response = await apiClient.get('/crowdfunding', { params });
      const data = response.data?.data || response.data;
      const backendProjects = data?.campaigns || data?.projects || [];
      if (backendProjects.length > 0) {
        const transformed: CrowdfundingProject[] = backendProjects.map((p: Record<string, unknown>) =>
          mapApiCampaignToCrowdfundingProject(p),
        );
        setProjects(transformed);
      } else {
        setProjects([]);
      }
    } catch {
      setListError('Impossible de charger les campagnes. Vérifiez la connexion ou réessayez plus tard.');
      setProjects([]);
    }
  }, [activeCategory, statusFilter, debouncedSearch]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects().finally(() => setRefreshing(false));
  }, [loadProjects]);

  // Filtre catégorie ; recherche serveur si ≥ 2 caractères (debounced), sinon recherche locale sur 1 caractère
  const filteredProjects = projects.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    if (debouncedSearch.length >= 2) {
      return matchesCategory;
    }
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sponsored projects first
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.isSponsored && !b.isSponsored) return -1;
    if (!a.isSponsored && b.isSponsored) return 1;
    return 0;
  });

  const featuredProject = projects.find((p) => p.isSponsored && p.isVerified) || (projects.length > 0 ? projects[0] : null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="rocket" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Crowdfunding</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/crowdfunding/history' as any)}>
            <Ionicons name="time" size={22} color="#AAA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/crowdfunding/portfolio' as any)}
            accessibilityLabel="Mon portefeuille investisseur"
          >
            <Ionicons name="pie-chart" size={22} color="#AAA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/crowdfunding/dashboard' as any)}>
            <Ionicons name="stats-chart" size={22} color="#AAA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/crowdfunding/create' as any)}>
            <Ionicons name="add-circle" size={26} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un projet..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {listError ? (
        <View style={styles.listErrorBanner}>
          <Text style={styles.listErrorText}>{listError}</Text>
          <TouchableOpacity onPress={() => void loadProjects()} activeOpacity={0.8}>
            <Text style={styles.listErrorRetry}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Stats Banner */}
        <TouchableOpacity activeOpacity={0.9} style={styles.statsBannerWrapper}>
          <LinearGradient
            colors={['#FF6B00', '#FF3D00', '#E64A19']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsBanner}
          >
            <Text style={styles.statsTitle}>Impact AfriWonder</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCFA(PLATFORM_STATS.totalRaised)}</Text>
                <Text style={styles.statLabel}>FCFA leves</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{PLATFORM_STATS.totalProjects}</Text>
                <Text style={styles.statLabel}>Projets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCFA(PLATFORM_STATS.totalBackers)}</Text>
                <Text style={styles.statLabel}>Contributeurs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{PLATFORM_STATS.successRate}%</Text>
                <Text style={styles.statLabel}>Succes</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Featured Project */}
        {featuredProject && !searchQuery && activeCategory === 'all' && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.sectionTitle}>Projet en vedette</Text>
              </View>
              <View style={styles.sponsoredBadge}>
                <Ionicons name="megaphone" size={10} color="#FFD700" />
                <Text style={styles.sponsoredText}>Sponsorise</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.featuredCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/crowdfunding/${featuredProject.id}` as any)}
            >
              <ImageOrPlaceholder
                uri={featuredProject.images?.[0] || ''}
                style={styles.featuredImage}
                icon="rocket-outline"
                iconSize={48}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.featuredOverlay}
              >
                <View style={styles.featuredBadges}>
                  {featuredProject.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                      <Text style={styles.verifiedText}>Verifie</Text>
                    </View>
                  )}
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {CROWDFUNDING_CATEGORIES.find((c) => c.id === featuredProject.category)?.name}
                    </Text>
                  </View>
                </View>
                <Text style={styles.featuredTitle}>{featuredProject.title}</Text>
                <Text style={styles.featuredDesc} numberOfLines={2}>{featuredProject.shortDescription}</Text>
                <View style={styles.featuredProgress}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${getProgressPercent(featuredProject.raised, featuredProject.goal)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.featuredStats}>
                    <Text style={styles.featuredRaised}>
                      {formatFullCFA(featuredProject.raised)}
                    </Text>
                    <Text style={styles.featuredGoal}>
                      {getProgressPercent(featuredProject.raised, featuredProject.goal)}% de{' '}
                      {formatFullCFA(featuredProject.goal)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CROWDFUNDING_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryPill,
                activeCategory === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={activeCategory === cat.id ? '#FFF' : '#888'}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  activeCategory === cat.id && styles.categoryPillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}
        >
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.id || 'all'}
              style={[
                styles.statusPill,
                statusFilter === s.id && styles.statusPillActive,
              ]}
              onPress={() => setStatusFilter(s.id)}
            >
              <Text
                style={[
                  styles.statusPillText,
                  statusFilter === s.id && styles.statusPillTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Projects List */}
        <View style={styles.projectsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="trending-up" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>
                {activeCategory === 'all' ? 'Tous les projets' : CROWDFUNDING_CATEGORIES.find((c) => c.id === activeCategory)?.name}
              </Text>
            </View>
            <Text style={styles.projectCount}>{sortedProjects.length} projets</Text>
          </View>

          {sortedProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#444" />
              <Text style={styles.emptyTitle}>Aucun projet trouve</Text>
              <Text style={styles.emptySubtitle}>Essayez de modifier vos criteres de recherche</Text>
            </View>
          ) : (
            sortedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Project Card Component
function ProjectCard({ project }: { project: CrowdfundingProject }) {
  const progress = getProgressPercent(project.raised, project.goal);
  const categoryData = CROWDFUNDING_CATEGORIES.find((c) => c.id === project.category);

  return (
    <TouchableOpacity
      style={styles.projectCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/crowdfunding/${project.id}` as any)}
    >
      {/* Image */}
      <View style={styles.cardImageContainer}>
        <ImageOrPlaceholder
          uri={project.images?.[0] || ''}
          style={styles.cardImage}
          icon="rocket-outline"
          iconSize={40}
        />
        {/* Badges overlay */}
        <View style={styles.cardBadgesRow}>
          {project.isSponsored && (
            <View style={styles.sponsoredCardBadge}>
              <Ionicons name="megaphone" size={9} color="#FFD700" />
              <Text style={styles.sponsoredCardText}>Sponsorise</Text>
            </View>
          )}
          {project.isVerified && (
            <View style={styles.verifiedCardBadge}>
              <Ionicons name="shield-checkmark" size={9} color="#FFF" />
              <Text style={styles.verifiedCardText}>Verifie</Text>
            </View>
          )}
        </View>
        {/* Days left badge */}
        <View style={styles.daysLeftBadge}>
          <Ionicons name="time" size={10} color="#FFF" />
          <Text style={styles.daysLeftText}>{project.daysLeft}j restants</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Category + Creator */}
        <View style={styles.cardMetaRow}>
          <View style={[styles.cardCategoryBadge, { backgroundColor: (categoryData?.color || '#FF6B00') + '20' }]}>
            <Ionicons name={(categoryData?.icon || 'grid') as any} size={10} color={categoryData?.color || '#FF6B00'} />
            <Text style={[styles.cardCategoryText, { color: categoryData?.color || '#FF6B00' }]}>
              {categoryData?.name || project.category}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>

        {/* Description */}
        <Text style={styles.cardDesc} numberOfLines={2}>{project.shortDescription}</Text>

        {/* Progress */}
        <View style={styles.cardProgressSection}>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={[categoryData?.color || Colors.primary, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarGradient, { width: `${progress}%` }]}
            />
          </View>
          <View style={styles.cardStatsRow}>
            <View>
              <Text style={styles.cardRaised}>{formatCFA(project.raised)} FCFA</Text>
              <Text style={styles.cardGoal}>sur {formatCFA(project.goal)} FCFA</Text>
            </View>
            <View style={styles.cardStatsRight}>
              <Text style={styles.cardPercent}>{progress}%</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardCreator}>
            <ImageOrPlaceholder uri={project.creator?.avatar || ''} style={styles.cardCreatorAvatar} icon="person" iconSize={18} />
            <Text style={styles.cardCreatorName} numberOfLines={1}>{project.creator?.name || 'Créateur'}</Text>
            {project.creator?.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            )}
          </View>
          <View style={styles.cardBackers}>
            <Ionicons name="people" size={12} color="#888" />
            <Text style={styles.cardBackersText}>{project.backers}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  listErrorBanner: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#2a1810', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
  listErrorText: { color: '#FFAB91', fontSize: FontSizes.sm, marginBottom: 8 },
  listErrorRetry: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  // Stats Banner
  statsBannerWrapper: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  statsBanner: { padding: 18 },
  statsTitle: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 14, opacity: 0.9 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Featured
  featuredSection: { marginBottom: 16, paddingHorizontal: 16 },
  featuredCard: { borderRadius: 16, overflow: 'hidden', height: 240, backgroundColor: '#111' },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 60,
  },
  featuredBadges: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  categoryTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  featuredTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  featuredDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  featuredProgress: {},
  progressBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressBarGradient: { height: '100%', borderRadius: 3 },
  featuredStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  featuredRaised: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  featuredGoal: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sponsoredText: { color: '#FFD700', fontSize: 10, fontWeight: '700' },

  // Categories
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    gap: 6,
  },
  categoryPillText: { color: '#888', fontSize: 12, fontWeight: '600' },
  categoryPillTextActive: { color: '#FFF' },

  statusRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statusPillActive: { backgroundColor: Colors.primary + '25', borderColor: Colors.primary },
  statusPillText: { color: '#888', fontSize: 12, fontWeight: '600' },
  statusPillTextActive: { color: Colors.primary },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  projectCount: { color: '#888', fontSize: 12 },

  // Projects
  projectsSection: { paddingHorizontal: 16 },

  // Project Card
  projectCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardImageContainer: { position: 'relative', height: 160 },
  cardImage: { width: '100%', height: '100%' },
  cardBadgesRow: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  sponsoredCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sponsoredCardText: { color: '#FFD700', fontSize: 9, fontWeight: '700' },
  verifiedCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedCardText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  daysLeftBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  daysLeftText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  // Card Content
  cardContent: { padding: 14 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  cardCategoryText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4, lineHeight: 22 },
  cardDesc: { color: '#999', fontSize: 12, lineHeight: 18, marginBottom: 12 },

  // Card Progress
  cardProgressSection: { marginBottom: 12 },
  cardStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  cardRaised: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  cardGoal: { color: '#666', fontSize: 11, marginTop: 1 },
  cardStatsRight: { alignItems: 'flex-end' },
  cardPercent: { color: Colors.primary, fontSize: 16, fontWeight: '800' },

  // Card Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCreator: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  cardCreatorAvatar: { width: 24, height: 24, borderRadius: 12 },
  cardCreatorName: { color: '#CCC', fontSize: 12, fontWeight: '500', flex: 1 },
  cardBackers: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardBackersText: { color: '#888', fontSize: 11 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#888', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { color: '#555', fontSize: 13, marginTop: 4 },
});
