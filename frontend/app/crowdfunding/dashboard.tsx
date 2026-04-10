import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import {
  MOCK_PROJECTS,
  CROWDFUNDING_CATEGORIES,
  formatCFA,
  formatFullCFA,
  getProgressPercent,
} from '../../src/data/crowdfunding';

// Mock creator's own projects (first 3)
const MY_PROJECTS = MOCK_PROJECTS.slice(0, 3);
const TOTAL_RAISED = MY_PROJECTS.reduce((sum, p) => sum + p.raised, 0);
const TOTAL_BACKERS = MY_PROJECTS.reduce((sum, p) => sum + p.backers, 0);

// Mock contributors
const MOCK_CONTRIBUTORS = [
  { id: 'c1', name: 'Seydou Keita', avatar: 'https://i.pravatar.cc/100?img=30', amount: 100000, date: 'Il y a 2h', reward: 'Bienfaiteur', project: 'Ecole Numerique de Bamako' },
  { id: 'c2', name: 'Mariam Diarra', avatar: 'https://i.pravatar.cc/100?img=31', amount: 25000, date: 'Il y a 5h', reward: 'Parrain Digital', project: 'Ecole Numerique de Bamako' },
  { id: 'c3', name: 'Boubacar Traore', avatar: 'https://i.pravatar.cc/100?img=32', amount: 50000, date: 'Hier', reward: 'Pilier Sante', project: 'Centre de Sante Communautaire Sikasso' },
  { id: 'c4', name: 'Aissata Coulibaly', avatar: 'https://i.pravatar.cc/100?img=33', amount: 5000, date: 'Hier', reward: 'Supporter', project: 'Ecole Numerique de Bamako' },
  { id: 'c5', name: 'Amadou Sangare', avatar: 'https://i.pravatar.cc/100?img=34', amount: 25000, date: 'Il y a 2j', reward: 'Solaire', project: 'Ferme Solaire Communautaire Mopti' },
  { id: 'c6', name: 'Fatoumata Toure', avatar: 'https://i.pravatar.cc/100?img=35', amount: 10000, date: 'Il y a 3j', reward: null, project: 'Centre de Sante Communautaire Sikasso' },
  { id: 'c7', name: 'Ibrahim Diallo', avatar: 'https://i.pravatar.cc/100?img=36', amount: 200000, date: 'Il y a 4j', reward: 'Fondateur', project: 'Centre de Sante Communautaire Sikasso' },
];

type DashTab = 'overview' | 'contributors' | 'projects';

export default function CreatorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const avgProgress = Math.round(
    MY_PROJECTS.reduce((sum, p) => sum + getProgressPercent(p.raised, p.goal), 0) / MY_PROJECTS.length
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Createur</Text>
        <TouchableOpacity onPress={() => router.push('/crowdfunding/create' as any)} style={styles.headerBtn}>
          <Ionicons name="add-circle" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Creator Profile */}
      <View style={styles.creatorCard}>
        <Image source={{ uri: 'https://i.pravatar.cc/100?img=1' }} style={styles.creatorAvatar} />
        <View style={styles.creatorInfo}>
          <View style={styles.creatorNameRow}>
            <Text style={styles.creatorName}>Aminata Diallo</Text>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.creatorLocation}>Bamako, Mali</Text>
        </View>
        <View style={styles.creatorBadge}>
          <Ionicons name="diamond" size={14} color="#FFD700" />
          <Text style={styles.creatorBadgeText}>Pro</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['overview', 'contributors', 'projects'] as DashTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'overview' ? 'stats-chart' : tab === 'contributors' ? 'people' : 'folder'}
              size={14}
              color={activeTab === tab ? Colors.primary : '#888'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'contributors' ? 'Contributeurs' : 'Mes projets'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.statIconBg}>
                  <Ionicons name="cash" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.statValue}>{formatCFA(TOTAL_RAISED)}</Text>
                <Text style={styles.statLabel}>FCFA collectes</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.statIconBg}>
                  <Ionicons name="people" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.statValue}>{TOTAL_BACKERS}</Text>
                <Text style={styles.statLabel}>Contributeurs</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['#2196F3', '#1565C0']} style={styles.statIconBg}>
                  <Ionicons name="folder" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.statValue}>{MY_PROJECTS.length}</Text>
                <Text style={styles.statLabel}>Projets actifs</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['#9C27B0', '#6A1B9A']} style={styles.statIconBg}>
                  <Ionicons name="trending-up" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.statValue}>{avgProgress}%</Text>
                <Text style={styles.statLabel}>Progression moy.</Text>
              </View>
            </View>

            {/* Revenue Chart Mock */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Collecte des 7 derniers jours</Text>
              <View style={styles.chartBars}>
                {[35, 60, 45, 80, 55, 90, 70].map((h, i) => (
                  <View key={i} style={styles.chartBarCol}>
                    <View style={styles.chartBarBg}>
                      <LinearGradient
                        colors={['#FF6B00', '#FF3D00']}
                        style={[styles.chartBarFill, { height: `${h}%` }]}
                      />
                    </View>
                    <Text style={styles.chartBarLabel}>{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent contributors */}
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Derniers contributeurs</Text>
              {MOCK_CONTRIBUTORS.slice(0, 4).map(contrib => (
                <View key={contrib.id} style={styles.contributorRow}>
                  <Image source={{ uri: contrib.avatar }} style={styles.contributorAvatar} />
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{contrib.name}</Text>
                    <Text style={styles.contributorProject} numberOfLines={1}>{contrib.project}</Text>
                  </View>
                  <View style={styles.contributorAmount}>
                    <Text style={styles.contributorAmountText}>+{formatCFA(contrib.amount)}</Text>
                    <Text style={styles.contributorDate}>{contrib.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CONTRIBUTORS TAB */}
        {activeTab === 'contributors' && (
          <View style={styles.section}>
            <View style={styles.contributorSummary}>
              <Ionicons name="people" size={24} color={Colors.primary} />
              <Text style={styles.contributorSummaryText}>{TOTAL_BACKERS} contributeurs au total</Text>
            </View>
            {MOCK_CONTRIBUTORS.map(contrib => (
              <View key={contrib.id} style={styles.contributorCard}>
                <Image source={{ uri: contrib.avatar }} style={styles.contributorCardAvatar} />
                <View style={styles.contributorCardInfo}>
                  <Text style={styles.contributorCardName}>{contrib.name}</Text>
                  <Text style={styles.contributorCardProject} numberOfLines={1}>{contrib.project}</Text>
                  {contrib.reward && (
                    <View style={styles.contributorReward}>
                      <Ionicons name="gift" size={10} color={Colors.primary} />
                      <Text style={styles.contributorRewardText}>{contrib.reward}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.contributorCardRight}>
                  <Text style={styles.contributorCardAmount}>{formatFullCFA(contrib.amount)}</Text>
                  <Text style={styles.contributorCardDate}>{contrib.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <View style={styles.section}>
            {MY_PROJECTS.map(project => {
              const progress = getProgressPercent(project.raised, project.goal);
              const catData = CROWDFUNDING_CATEGORIES.find(c => c.id === project.category);
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => router.push(`/crowdfunding/${project.id}` as any)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: project.images[0] }} style={styles.projectImage} />
                  <View style={styles.projectCardContent}>
                    <View style={styles.projectCardHeader}>
                      <View style={[styles.projectCatBadge, { backgroundColor: (catData?.color || '#FF6B00') + '20' }]}>
                        <Text style={[styles.projectCatText, { color: catData?.color || '#FF6B00' }]}>
                          {catData?.name}
                        </Text>
                      </View>
                      {project.isVerified && (
                        <View style={styles.verifiedMini}>
                          <Ionicons name="shield-checkmark" size={10} color="#4CAF50" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.projectCardTitle} numberOfLines={1}>{project.title}</Text>
                    <View style={styles.projectProgressRow}>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: catData?.color || Colors.primary }]} />
                      </View>
                      <Text style={styles.progressText}>{progress}%</Text>
                    </View>
                    <View style={styles.projectCardStats}>
                      <View style={styles.projectStat}>
                        <Ionicons name="cash" size={12} color="#888" />
                        <Text style={styles.projectStatText}>{formatCFA(project.raised)} FCFA</Text>
                      </View>
                      <View style={styles.projectStat}>
                        <Ionicons name="people" size={12} color="#888" />
                        <Text style={styles.projectStatText}>{project.backers}</Text>
                      </View>
                      <View style={styles.projectStat}>
                        <Ionicons name="time" size={12} color="#888" />
                        <Text style={styles.projectStatText}>{project.daysLeft}j</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Create new project CTA */}
            <TouchableOpacity
              style={styles.createCTA}
              onPress={() => router.push('/crowdfunding/create' as any)}
            >
              <Ionicons name="add-circle" size={32} color={Colors.primary} />
              <Text style={styles.createCTAText}>Creer un nouveau projet</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  // Creator Card
  creatorCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 14,
    backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 12,
  },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24 },
  creatorInfo: { flex: 1, marginLeft: 12 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  creatorLocation: { color: '#888', fontSize: 12, marginTop: 2 },
  creatorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  creatorBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: '700' },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#111',
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  tabActive: { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '10' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },

  section: { paddingHorizontal: 16 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: '#111', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#1A1A1A',
  },
  chartTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBarBg: {
    width: 20, height: 100, backgroundColor: '#1A1A1A', borderRadius: 4, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: { width: '100%', borderRadius: 4 },
  chartBarLabel: { color: '#666', fontSize: 10, marginTop: 6 },

  // Recent contributors
  recentSection: { marginBottom: 16 },
  recentTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  contributorRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  contributorAvatar: { width: 36, height: 36, borderRadius: 18 },
  contributorInfo: { flex: 1, marginLeft: 10 },
  contributorName: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  contributorProject: { color: '#888', fontSize: 11, marginTop: 1 },
  contributorAmount: { alignItems: 'flex-end' },
  contributorAmountText: { color: '#4CAF50', fontSize: 14, fontWeight: '700' },
  contributorDate: { color: '#666', fontSize: 10, marginTop: 1 },

  // Contributors tab
  contributorSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
    backgroundColor: Colors.primary + '10', padding: 14, borderRadius: 12,
  },
  contributorSummaryText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  contributorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1A1A1A',
  },
  contributorCardAvatar: { width: 40, height: 40, borderRadius: 20 },
  contributorCardInfo: { flex: 1, marginLeft: 10 },
  contributorCardName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  contributorCardProject: { color: '#888', fontSize: 11, marginTop: 1 },
  contributorReward: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
    backgroundColor: Colors.primary + '10', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, alignSelf: 'flex-start',
  },
  contributorRewardText: { color: Colors.primary, fontSize: 10, fontWeight: '600' },
  contributorCardRight: { alignItems: 'flex-end' },
  contributorCardAmount: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  contributorCardDate: { color: '#666', fontSize: 10, marginTop: 2 },

  // Projects tab
  projectCard: {
    backgroundColor: '#111', borderRadius: 14, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: '#1A1A1A',
  },
  projectImage: { width: '100%', height: 120 },
  projectCardContent: { padding: 12 },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  projectCatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  projectCatText: { fontSize: 10, fontWeight: '700' },
  verifiedMini: { padding: 2 },
  projectCardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  projectProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressBg: { flex: 1, height: 5, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: Colors.primary, fontSize: 12, fontWeight: '700', width: 36 },
  projectCardStats: { flexDirection: 'row', gap: 14 },
  projectStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectStatText: { color: '#888', fontSize: 11 },

  createCTA: {
    alignItems: 'center', paddingVertical: 24, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary + '30', borderStyle: 'dashed',
    marginTop: 4,
  },
  createCTAText: { color: Colors.primary, fontSize: 14, fontWeight: '600', marginTop: 8 },
});
