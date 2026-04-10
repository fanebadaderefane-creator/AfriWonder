import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Animated,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import {
  MOCK_PROJECTS,
  CROWDFUNDING_CATEGORIES,
  formatCFA,
  formatFullCFA,
  getProgressPercent,
} from '../../src/data/crowdfunding';
import type { Reward } from '../../src/data/crowdfunding';

type Tab = 'about' | 'rewards' | 'updates' | 'comments';

export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;

  const project = MOCK_PROJECTS.find((p) => p.id === id);
  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle" size={64} color="#444" />
          <Text style={styles.notFoundText}>Projet introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progress = getProgressPercent(project.raised, project.goal);
  const categoryData = CROWDFUNDING_CATEGORIES.find((c) => c.id === project.category);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Decouvrez ce projet sur AfriWonder : ${project.title} - ${formatFullCFA(project.raised)} collectes sur ${formatFullCFA(project.goal)}`,
      });
    } catch (e) {
      // Ignore
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Signaler ce projet',
      'Etes-vous sur de vouloir signaler ce projet ? Notre equipe examinera votre signalement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          style: 'destructive',
          onPress: () => Alert.alert('Merci', 'Votre signalement a ete envoye. Notre equipe va examiner ce projet.'),
        },
      ]
    );
  };

  const handleContribute = (reward?: Reward) => {
    const amount = reward ? reward.amount : 5000;
    Alert.alert(
      'Contribuer',
      `Contribuer ${formatFullCFA(amount)} a ce projet ?\n\nChoisissez votre moyen de paiement :`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Orange Money',
          onPress: () => router.push({ pathname: '/checkout/orange-money', params: { amount: String(amount) } }),
        },
        {
          text: 'Wave',
          onPress: () => router.push({ pathname: '/checkout/wave', params: { amount: String(amount) } }),
        },
      ]
    );
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'about', label: 'A propos', icon: 'information-circle' },
    { key: 'rewards', label: 'Recompenses', icon: 'gift' },
    { key: 'updates', label: `Actus (${project.updates})`, icon: 'newspaper' },
    { key: 'comments', label: `Avis (${project.comments})`, icon: 'chatbubbles' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <View style={styles.headerBtnBg}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setLiked(!liked)} style={styles.headerBtn}>
            <View style={styles.headerBtnBg}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#FF4757' : '#FFF'} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <View style={styles.headerBtnBg}>
              <Ionicons name="share-social" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReport} style={styles.headerBtn}>
            <View style={styles.headerBtnBg}>
              <Ionicons name="flag" size={20} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={{ height: 240 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setActiveImageIndex(index);
            }}
          >
            {project.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={{ width: screenWidth, height: 240 }} resizeMode="cover" />
            ))}
          </ScrollView>
          {/* Dots */}
          {project.images.length > 1 && (
            <View style={styles.dotsContainer}>
              {project.images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, activeImageIndex === i && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Project Info Card */}
        <View style={styles.infoCard}>
          {/* Badges */}
          <View style={styles.badgesRow}>
            {project.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                <Text style={styles.badgeText}>Projet Verifie</Text>
              </View>
            )}
            {project.isSponsored && (
              <View style={styles.sponsoredBadge}>
                <Ionicons name="megaphone" size={11} color="#FFD700" />
                <Text style={styles.sponsoredBadgeText}>Sponsorise</Text>
              </View>
            )}
            {!project.isVerified && (
              <View style={styles.unverifiedBadge}>
                <Ionicons name="alert-circle" size={12} color="#FF9800" />
                <Text style={styles.unverifiedBadgeText}>Non verifie</Text>
              </View>
            )}
            <View style={[styles.catBadge, { backgroundColor: (categoryData?.color || '#FF6B00') + '20' }]}>
              <Ionicons name={(categoryData?.icon || 'grid') as any} size={11} color={categoryData?.color || '#FF6B00'} />
              <Text style={[styles.catBadgeText, { color: categoryData?.color || '#FF6B00' }]}>
                {categoryData?.name}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.projectTitle}>{project.title}</Text>

          {/* Creator */}
          <TouchableOpacity style={styles.creatorRow}>
            <Image source={{ uri: project.creator.avatar }} style={styles.creatorAvatar} />
            <View style={styles.creatorInfo}>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName}>{project.creator.name}</Text>
                {project.creator.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.creatorLocation}>{project.creator.location}</Text>
            </View>
            <View style={styles.creatorStats}>
              <Text style={styles.creatorStatValue}>{project.creator.projectsCount}</Text>
              <Text style={styles.creatorStatLabel}>projets</Text>
            </View>
          </TouchableOpacity>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[categoryData?.color || Colors.primary, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarGradient, { width: `${progress}%` }]}
              />
            </View>

            <View style={styles.progressStats}>
              <View>
                <Text style={styles.raisedAmount}>{formatFullCFA(project.raised)}</Text>
                <Text style={styles.goalText}>objectif {formatFullCFA(project.goal)}</Text>
              </View>
              <View style={styles.progressRight}>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
            </View>

            <View style={styles.progressMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="people" size={16} color="#888" />
                <Text style={styles.metaValue}>{project.backers}</Text>
                <Text style={styles.metaLabel}>contributeurs</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={16} color="#888" />
                <Text style={styles.metaValue}>{project.daysLeft}</Text>
                <Text style={styles.metaLabel}>jours restants</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="refresh" size={16} color="#888" />
                <Text style={styles.metaValue}>{project.updates}</Text>
                <Text style={styles.metaLabel}>mises a jour</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? Colors.primary : '#888'}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'about' && (
            <View>
              <Text style={styles.descriptionTitle}>Description du projet</Text>
              <Text style={styles.descriptionText}>{project.description}</Text>

              {/* Commission info */}
              <View style={styles.commissionInfo}>
                <Ionicons name="information-circle" size={16} color="#888" />
                <Text style={styles.commissionText}>
                  AfriWonder preleve une commission de 3% sur les projets finances avec succes.
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'rewards' && (
            <View>
              <Text style={styles.rewardsIntro}>
                Choisissez une recompense pour soutenir ce projet
              </Text>
              {project.rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  categoryColor={categoryData?.color || Colors.primary}
                  onContribute={() => handleContribute(reward)}
                />
              ))}
              {/* Simple donation */}
              <TouchableOpacity style={styles.simpleDonation} onPress={() => handleContribute()}>
                <View style={styles.simpleDonationIcon}>
                  <Ionicons name="heart" size={24} color={Colors.primary} />
                </View>
                <View style={styles.simpleDonationText}>
                  <Text style={styles.simpleDonationTitle}>Don libre</Text>
                  <Text style={styles.simpleDonationDesc}>Contribuez le montant de votre choix sans recompense</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'updates' && (
            <View>
              {project.updates > 0 ? (
                Array.from({ length: Math.min(project.updates, 3) }).map((_, i) => (
                  <View key={i} style={styles.updateCard}>
                    <View style={styles.updateHeader}>
                      <View style={styles.updateBadge}>
                        <Text style={styles.updateBadgeText}>#{project.updates - i}</Text>
                      </View>
                      <Text style={styles.updateDate}>il y a {i + 1} jour{i > 0 ? 's' : ''}</Text>
                    </View>
                    <Text style={styles.updateTitle}>
                      {i === 0 ? 'Objectif atteint a ' + progress + '% !' : i === 1 ? 'Nouveaux partenaires confirmes' : 'Lancement officiel du projet'}
                    </Text>
                    <Text style={styles.updateText}>
                      Merci a tous les contributeurs ! Nous avançons bien et le projet prend forme. Plus de details a venir bientot...
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="newspaper-outline" size={40} color="#444" />
                  <Text style={styles.emptyTabText}>Aucune mise a jour pour le moment</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'comments' && (
            <View>
              {Array.from({ length: Math.min(project.comments, 4) }).map((_, i) => (
                <View key={i} style={styles.commentCard}>
                  <Image
                    source={{ uri: `https://i.pravatar.cc/100?img=${30 + i}` }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>
                      {['Seydou K.', 'Mariam D.', 'Boubacar T.', 'Aissata S.'][i]}
                    </Text>
                    <Text style={styles.commentText}>
                      {[
                        'Excellent projet ! Je suis fier de contribuer.',
                        'Bravo pour cette initiative, le Mali en a besoin !',
                        'Je partage avec mes amis. Ensemble on peut y arriver !',
                        'Hate de voir le resultat final. Courage !',
                      ][i]}
                    </Text>
                    <Text style={styles.commentDate}>il y a {i + 1}h</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.ctaLeft}>
          <Text style={styles.ctaRaised}>{formatCFA(project.raised)} FCFA</Text>
          <Text style={styles.ctaPercent}>{progress}% atteint</Text>
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={() => handleContribute()} activeOpacity={0.85}>
          <LinearGradient
            colors={['#FF6B00', '#FF3D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="heart" size={18} color="#FFF" />
            <Text style={styles.ctaButtonText}>Contribuer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Reward Card
function RewardCard({ reward, categoryColor, onContribute }: { reward: Reward; categoryColor: string; onContribute: () => void }) {
  const remaining = reward.limit - reward.claimed;
  const isAlmostGone = remaining <= 5;

  return (
    <TouchableOpacity style={styles.rewardCard} onPress={onContribute} activeOpacity={0.85}>
      <View style={styles.rewardHeader}>
        <View style={[styles.rewardIconBg, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={reward.icon as any} size={22} color={categoryColor} />
        </View>
        <View style={styles.rewardHeaderText}>
          <Text style={styles.rewardTitle}>{reward.title}</Text>
          <Text style={styles.rewardAmount}>{formatFullCFA(reward.amount)}</Text>
        </View>
      </View>
      <Text style={styles.rewardDesc}>{reward.description}</Text>
      <View style={styles.rewardFooter}>
        <View style={styles.rewardMeta}>
          <Ionicons name="people" size={12} color="#888" />
          <Text style={styles.rewardMetaText}>{reward.claimed}/{reward.limit} pris</Text>
        </View>
        <View style={styles.rewardMeta}>
          <Ionicons name="calendar" size={12} color="#888" />
          <Text style={styles.rewardMetaText}>Livraison {reward.deliveryDate}</Text>
        </View>
        {isAlmostGone && (
          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyText}>Plus que {remaining} !</Text>
          </View>
        )}
      </View>
      <View style={styles.rewardCTA}>
        <Text style={styles.rewardCTAText}>Choisir cette recompense</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Not Found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#888', fontSize: 16, marginTop: 12 },
  backButton: { marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#FFF', fontWeight: '700' },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  headerBtn: { padding: 4 },
  headerBtnBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 4 },

  // Dots
  dotsContainer: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },

  // Info Card
  infoCard: { paddingHorizontal: 16, paddingTop: 16 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  badgeText: { color: '#4CAF50', fontSize: 11, fontWeight: '700' },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  sponsoredBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: '700' },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.2)',
  },
  unverifiedBadgeText: { color: '#FF9800', fontSize: 11, fontWeight: '700' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700' },

  // Title
  projectTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 14 },

  // Creator
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  creatorAvatar: { width: 44, height: 44, borderRadius: 22 },
  creatorInfo: { flex: 1, marginLeft: 10 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  creatorLocation: { color: '#888', fontSize: 12, marginTop: 2 },
  creatorStats: { alignItems: 'center', paddingLeft: 12 },
  creatorStatValue: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  creatorStatLabel: { color: '#888', fontSize: 10 },

  // Progress
  progressSection: { marginBottom: 4 },
  progressBarBg: { height: 8, backgroundColor: '#1A1A1A', borderRadius: 4, overflow: 'hidden' },
  progressBarGradient: { height: '100%', borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 },
  raisedAmount: { color: Colors.primary, fontSize: 20, fontWeight: '800' },
  goalText: { color: '#666', fontSize: 12, marginTop: 2 },
  progressRight: { alignItems: 'flex-end' },
  progressPercent: { color: Colors.primary, fontSize: 24, fontWeight: '800' },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  metaLabel: { color: '#888', fontSize: 11 },

  // Tabs
  tabsContainer: { paddingHorizontal: 16, gap: 6, paddingVertical: 16 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  tabActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' },
  tabText: { color: '#888', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },

  // Tab Content
  tabContent: { paddingHorizontal: 16 },

  // About
  descriptionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  descriptionText: { color: '#CCC', fontSize: 14, lineHeight: 22 },
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  commissionText: { color: '#888', fontSize: 12, flex: 1, lineHeight: 18 },

  // Rewards
  rewardsIntro: { color: '#888', fontSize: 13, marginBottom: 14 },
  rewardCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rewardIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardHeaderText: { flex: 1, marginLeft: 12 },
  rewardTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  rewardAmount: { color: Colors.primary, fontSize: 16, fontWeight: '800', marginTop: 2 },
  rewardDesc: { color: '#AAA', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  rewardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  rewardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardMetaText: { color: '#888', fontSize: 11 },
  urgencyBadge: { backgroundColor: '#FF3D0020', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  urgencyText: { color: '#FF3D00', fontSize: 10, fontWeight: '700' },
  rewardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  rewardCTAText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  // Simple Donation
  simpleDonation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  simpleDonationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleDonationText: { flex: 1, marginLeft: 12 },
  simpleDonationTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  simpleDonationDesc: { color: '#888', fontSize: 12, marginTop: 2 },

  // Updates
  updateCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  updateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  updateBadge: { backgroundColor: Colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  updateBadgeText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  updateDate: { color: '#666', fontSize: 11 },
  updateTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  updateText: { color: '#AAA', fontSize: 13, lineHeight: 20 },

  // Comments
  commentCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthor: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  commentText: { color: '#CCC', fontSize: 13, lineHeight: 19, marginTop: 2 },
  commentDate: { color: '#666', fontSize: 11, marginTop: 4 },

  // Empty tab
  emptyTab: { alignItems: 'center', paddingVertical: 40 },
  emptyTabText: { color: '#666', fontSize: 14, marginTop: 10 },

  // Bottom CTA
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaLeft: { flex: 1 },
  ctaRaised: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  ctaPercent: { color: '#888', fontSize: 12, marginTop: 1 },
  ctaButton: { borderRadius: 14, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  ctaButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
