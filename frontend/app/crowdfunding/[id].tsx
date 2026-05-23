import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Alert,
  Share,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import {
  CROWDFUNDING_CATEGORIES,
  formatCFA,
  formatFullCFA,
  getProgressPercent,
  getCrowdfundingSeedProjectById,
  isCrowdfundingSeedProjectId,
} from '../../src/data/crowdfunding';
import type { CrowdfundingProject, Reward } from '../../src/data/crowdfunding';
import { mapApiCampaignToCrowdfundingProject } from '../../src/data/crowdfundingMappers';
import { ImageOrPlaceholder } from '../../src/components/common/ImageOrPlaceholder';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import crowdfundingApi, { type CrowdfundingContributionRow } from '../../src/api/crowdfundingApi';
import { useAuthStore } from '../../src/store/authStore';
import { featureFlags } from '../../src/config/featureFlags';
import { DemoContentBanner } from '../../src/components/common/DemoContentBanner';

type Tab = 'about' | 'rewards' | 'updates' | 'discussion' | 'backers';

function formatContributionDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 14) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [supportRows, setSupportRows] = useState<CrowdfundingContributionRow[]>([]);
  const [supportTotal, setSupportTotal] = useState<number | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState(false);
  const [project, setProject] = useState<CrowdfundingProject | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [managerBusy, setManagerBusy] = useState(false);
  const [cfUpdates, setCfUpdates] = useState<{ id: string; title: string; content: string; created_at: string }[]>([]);
  const [cfUpdatesLoading, setCfUpdatesLoading] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [cfMessages, setCfMessages] = useState<
    { id: string; content: string; created_at: string; user: { id: string; display_name: string; avatar?: string | null } }[]
  >([]);
  const [cfMsgLoading, setCfMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [postingMsg, setPostingMsg] = useState(false);
  const user = useAuthStore((s) => s.user);

  const loadProject = useCallback(async () => {
    if (!id) {
      setProjectError('Identifiant manquant.');
      setProjectLoading(false);
      return;
    }
    setProjectLoading(true);
    setProjectError(null);
    try {
      const raw = await crowdfundingApi.get(String(id));
      setProject(mapApiCampaignToCrowdfundingProject(raw));
    } catch (e: unknown) {
      const seed =
        featureFlags.superAppDemoContent ? getCrowdfundingSeedProjectById(String(id)) : null;
      if (seed) {
        setProject(seed);
        setProjectError(null);
      } else {
        const msg =
          (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
          (e as { message?: string })?.message ||
          'Campagne introuvable.';
        setProjectError(msg);
        setProject(null);
      }
    } finally {
      setProjectLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (activeTab !== 'backers' || !id) return;
    let cancelled = false;
    (async () => {
      setSupportLoading(true);
      setSupportError(false);
      try {
        const { contributions, pagination } = await crowdfundingApi.listContributions(String(id), {
          limit: 40,
          page: 1,
        });
        if (!cancelled) {
          setSupportRows(contributions);
          setSupportTotal(pagination.total);
        }
      } catch {
        if (!cancelled) {
          setSupportRows([]);
          setSupportTotal(0);
          setSupportError(true);
        }
      } finally {
        if (!cancelled) setSupportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'updates' || !id) return;
    let cancelled = false;
    (async () => {
      setCfUpdatesLoading(true);
      try {
        const rows = await crowdfundingApi.listUpdates(String(id));
        if (!cancelled) setCfUpdates(rows);
      } catch {
        if (!cancelled) setCfUpdates([]);
      } finally {
        if (!cancelled) setCfUpdatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, project?.id]);

  useEffect(() => {
    if (activeTab !== 'discussion' || !id) return;
    let cancelled = false;
    (async () => {
      setCfMsgLoading(true);
      try {
        const { comments } = await crowdfundingApi.listMessages(String(id), { page: 1, limit: 50 });
        if (!cancelled) setCfMessages(comments);
      } catch {
        if (!cancelled) setCfMessages([]);
      } finally {
        if (!cancelled) setCfMsgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, project?.id]);

  const TABS: { key: Tab; label: string; icon: string }[] = useMemo(
    () => [
      { key: 'about', label: 'A propos', icon: 'information-circle' },
      { key: 'rewards', label: 'Recompenses', icon: 'gift' },
      { key: 'updates', label: `Actus (${project?.updates ?? 0})`, icon: 'newspaper' },
      { key: 'discussion', label: 'Discussion', icon: 'chatbubbles' },
      {
        key: 'backers',
        label: `Soutiens (${supportTotal === null ? '…' : supportTotal})`,
        icon: 'heart',
      },
    ],
    [project?.updates, supportTotal],
  );

  if (projectLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <View style={styles.headerBtnBg}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.notFoundText, { marginTop: 16 }]}>Chargement…</Text>
        </View>
      </View>
    );
  }

  if (projectError || !project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle" size={64} color="#444" />
          <Text style={styles.notFoundText}>{projectError || 'Projet introuvable'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
          {projectError ? (
            <TouchableOpacity style={[styles.backButton, { backgroundColor: '#333' }]} onPress={() => void loadProject()}>
              <Text style={styles.backButtonText}>Réessayer</Text>
            </TouchableOpacity>
          ) : null}
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
    } catch (_e) {
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
          onPress: () => {
            void (async () => {
              try {
                await crowdfundingApi.report(String(id));
                Alert.alert('Merci', 'Votre signalement a ete enregistre. Notre equipe examinera ce projet.');
              } catch {
                Alert.alert('Erreur', 'Impossible d’envoyer le signalement. Réessayez plus tard.');
              }
            })();
          },
        },
      ]
    );
  };

  const handleContribute = (reward?: Reward) => {
    if (isCrowdfundingSeedProjectId(project.id)) {
      Alert.alert(
        'Démonstration',
        'Cette campagne est fictive : aucun paiement réel n’est effectué.',
      );
      return;
    }
    const params: Record<string, string> = { projectId: project.id };
    if (reward) {
      params.rewardId = reward.id;
      params.rewardAmount = String(reward.amount);
    }
    router.push({ pathname: '/crowdfunding/contribute' as any, params });
  };

  const canContribute = project.daysLeft > 0 && project.status === 'active';

  const isOwner = Boolean(user?.id && project.creator.id === user.id);
  const canReleaseEscrow =
    isOwner &&
    project.status === 'active' &&
    project.goal > 0 &&
    project.raised >= project.goal;
  const canRefundFailed =
    isOwner &&
    project.status === 'active' &&
    project.daysLeft === 0 &&
    project.raised < project.goal;

  const onReleaseEscrow = () => {
    Alert.alert(
      'Libérer les fonds',
      'Les fonds collectés seront versés sur votre portefeuille vendeur (commission plateforme 5 %). Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Libérer',
          onPress: () => {
            void (async () => {
              setManagerBusy(true);
              try {
                await crowdfundingApi.releaseEscrow(String(id));
                await loadProject();
                Alert.alert('Succès', 'Les fonds ont été libérés.');
              } catch (e: unknown) {
                const msg =
                  (e as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data
                    ?.error?.message ||
                  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  (e as { message?: string })?.message ||
                  'Action impossible.';
                Alert.alert('Erreur', msg);
              } finally {
                setManagerBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onRefundIfFailed = () => {
    Alert.alert(
      'Rembourser les contributeurs',
      'Si la date de fin est passée et l’objectif non atteint, les soutiens seront remboursés sur leur wallet. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Lancer le remboursement',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setManagerBusy(true);
              try {
                const r = await crowdfundingApi.refundIfFailed(String(id));
                await loadProject();
                Alert.alert(
                  r.refunded ? 'Remboursement lancé' : 'Aucun remboursement',
                  r.refunded
                    ? `Traitement effectué (${r.count ?? 0} contribution(s)).`
                    : 'Conditions non réunies (date, objectif ou statut).',
                );
              } catch (e: unknown) {
                const msg =
                  (e as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data
                    ?.error?.message ||
                  (e as { message?: string })?.message ||
                  'Action impossible.';
                Alert.alert('Erreur', msg);
              } finally {
                setManagerBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onReleaseMilestone = (index: number) => {
    void (async () => {
      setManagerBusy(true);
      try {
        await crowdfundingApi.releaseMilestone(String(id), index);
        await loadProject();
        Alert.alert('Succès', 'Jalon libéré.');
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (e as { message?: string })?.message ||
          'Action impossible.';
        Alert.alert('Erreur', msg);
      } finally {
        setManagerBusy(false);
      }
    })();
  };

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
        {isCrowdfundingSeedProjectId(project.id) ? <DemoContentBanner /> : null}
        {/* Image Carousel */}
        <View style={{ height: 240 }}>
          {project.images.length === 0 ? (
            <ImageOrPlaceholder
              uri=""
              style={{ width: screenWidth, height: 240 }}
              icon="images-outline"
              iconSize={48}
            />
          ) : (
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
                <ImageOrPlaceholder
                  key={i}
                  uri={img}
                  style={{ width: screenWidth, height: 240 }}
                  icon="images-outline"
                  iconSize={48}
                />
              ))}
            </ScrollView>
          )}
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
            <ImageOrPlaceholder
              uri={profileAvatarUri(project.creator.avatar, project.creator.id)}
              style={styles.creatorAvatar}
              icon="person"
              iconSize={22}
            />
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

        {project.status === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={20} color="#FFC107" />
            <Text style={styles.pendingBannerText}>
              {isOwner
                ? 'Votre campagne est en attente de validation par l’équipe AfriWonder.'
                : 'Cette campagne n’est pas encore publiée publiquement.'}
            </Text>
          </View>
        ) : null}

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
                  AfriWonder prélève une commission de 5 % sur les campagnes financées avec succès (hors frais de transfert opérateur).
                </Text>
              </View>

              {isOwner ? (
                <View style={styles.ownerBox}>
                  <Text style={styles.ownerTitle}>Espace porteur</Text>
                  {managerBusy ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
                  ) : null}
                  {canReleaseEscrow ? (
                    <TouchableOpacity style={styles.ownerBtn} onPress={onReleaseEscrow} disabled={managerBusy}>
                      <Ionicons name="cash-outline" size={18} color="#FFF" />
                      <Text style={styles.ownerBtnText}>Libérer les fonds (objectif atteint)</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canRefundFailed ? (
                    <TouchableOpacity style={[styles.ownerBtn, styles.ownerBtnDanger]} onPress={onRefundIfFailed} disabled={managerBusy}>
                      <Ionicons name="arrow-undo-outline" size={18} color="#FFF" />
                      <Text style={styles.ownerBtnText}>Rembourser les contributeurs (campagne échouée)</Text>
                    </TouchableOpacity>
                  ) : null}
                  {project.milestones && project.milestones.length > 0 ? (
                    <View style={styles.milestoneBlock}>
                      <Text style={styles.milestoneTitle}>Jalons</Text>
                      {project.milestones.map((m, idx) => (
                        <View key={m.id || String(idx)} style={styles.milestoneRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.milestoneLabel}>{m.label}</Text>
                            <Text style={styles.milestoneMeta}>
                              {Math.round(m.amount_released || 0)} / {Math.round(m.amount_target)} FCFA — {m.status}
                            </Text>
                          </View>
                          {m.status !== 'released' ? (
                            <TouchableOpacity
                              style={styles.milestoneBtn}
                              onPress={() => onReleaseMilestone(idx)}
                              disabled={managerBusy}
                            >
                              <Text style={styles.milestoneBtnText}>Libérer</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.milestoneDone}>OK</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {!canReleaseEscrow && !canRefundFailed && (!project.milestones || project.milestones.length === 0) ? (
                    <Text style={styles.ownerHint}>
                      Quand l’objectif est atteint, vous pourrez libérer les fonds ici. Les jalons configurés côté serveur apparaissent aussi ici.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'rewards' && (
            <View>
              <Text style={styles.rewardsIntro}>
                {project.rewards.length > 0
                  ? 'Choisissez une recompense pour soutenir ce projet'
                  : 'Aucun palier publié — proposez un don libre.'}
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
              {isOwner ? (
                <View style={styles.composerBox}>
                  <Text style={styles.composerLabel}>Nouvelle actualité</Text>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Titre"
                    placeholderTextColor="#666"
                    value={updateTitle}
                    onChangeText={setUpdateTitle}
                    maxLength={200}
                  />
                  <TextInput
                    style={[styles.composerInput, styles.composerArea]}
                    placeholder="Message à vos soutiens"
                    placeholderTextColor="#666"
                    value={updateContent}
                    onChangeText={setUpdateContent}
                    multiline
                    maxLength={5000}
                  />
                  <TouchableOpacity
                    style={styles.composerBtn}
                    disabled={postingUpdate}
                    onPress={() => {
                      void (async () => {
                        if (!updateTitle.trim() || !updateContent.trim()) {
                          Alert.alert('Champs requis', 'Renseignez le titre et le texte.');
                          return;
                        }
                        setPostingUpdate(true);
                        try {
                          await crowdfundingApi.postUpdate(String(id), {
                            title: updateTitle.trim(),
                            content: updateContent.trim(),
                          });
                          setUpdateTitle('');
                          setUpdateContent('');
                          const rows = await crowdfundingApi.listUpdates(String(id));
                          setCfUpdates(rows);
                          await loadProject();
                        } catch (_e) {
                          Alert.alert('Erreur', "Impossible de publier l'actualité.");
                        } finally {
                          setPostingUpdate(false);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.composerBtnText}>{postingUpdate ? '…' : 'Publier'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {cfUpdatesLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : cfUpdates.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="newspaper-outline" size={40} color="#444" />
                  <Text style={styles.emptyTabText}>Aucune actualité publiée pour l’instant.</Text>
                </View>
              ) : (
                cfUpdates.map((u) => (
                  <View key={u.id} style={styles.updateCard}>
                    <Text style={styles.updateTitle}>{u.title}</Text>
                    <Text style={styles.updateDate}>
                      {new Date(u.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                    <Text style={styles.updateBody}>{u.content}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'discussion' && (
            <View>
              {user ? (
                <View style={styles.composerBox}>
                  <TextInput
                    style={[styles.composerInput, styles.composerArea]}
                    placeholder="Écrire un message…"
                    placeholderTextColor="#666"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={4000}
                  />
                  <TouchableOpacity
                    style={styles.composerBtn}
                    disabled={postingMsg || project.status !== 'active'}
                    onPress={() => {
                      void (async () => {
                        if (!newMessage.trim()) return;
                        setPostingMsg(true);
                        try {
                          await crowdfundingApi.postMessage(String(id), newMessage.trim());
                          setNewMessage('');
                          const { comments } = await crowdfundingApi.listMessages(String(id), { page: 1, limit: 50 });
                          setCfMessages(comments);
                        } catch {
                          Alert.alert('Erreur', 'Message non publié. Vérifiez la connexion ou le statut de la campagne.');
                        } finally {
                          setPostingMsg(false);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.composerBtnText}>
                      {project.status !== 'active' ? 'Campagne non publiée' : postingMsg ? '…' : 'Envoyer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.hintMute}>Connectez-vous pour participer à la discussion.</Text>
              )}
              {cfMsgLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : cfMessages.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#444" />
                  <Text style={styles.emptyTabText}>Aucun message. Soyez le premier !</Text>
                </View>
              ) : (
                cfMessages.map((m) => (
                  <View key={m.id} style={styles.updateCard}>
                    <Text style={styles.updateTitle}>{m.user.display_name}</Text>
                    <Text style={styles.updateDate}>{formatContributionDate(m.created_at)}</Text>
                    <Text style={styles.updateBody}>{m.content}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'backers' && (
            <View>
              {supportLoading ? (
                <View style={styles.emptyTab}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.emptyTabText}>Chargement des soutiens…</Text>
                </View>
              ) : supportError ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="cloud-offline-outline" size={40} color="#444" />
                  <Text style={styles.emptyTabText}>
                    Impossible de charger les soutiens. Vérifiez la connexion ou ouvrez un projet dont l’identifiant
                    correspond à une campagne sur le serveur.
                  </Text>
                </View>
              ) : supportRows.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="heart-outline" size={40} color="#444" />
                  <Text style={styles.emptyTabText}>
                    Aucun soutien financier confirmé pour l’instant. Les contributions validées apparaîtront ici.
                  </Text>
                </View>
              ) : (
                supportRows.map((row) => (
                  <View key={row.id} style={styles.commentCard}>
                    <ImageOrPlaceholder
                      uri={profileAvatarUri(row.contributor.avatar, row.contributor.id)}
                      style={styles.commentAvatar}
                      icon="person"
                      iconSize={18}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentAuthor}>{row.contributor.display_name}</Text>
                      <Text style={styles.commentText}>
                        +{formatFullCFA(row.amount)}
                        {row.reward_tier ? ` · ${row.reward_tier}` : ''}
                      </Text>
                      <Text style={styles.commentDate}>{formatContributionDate(row.created_at)}</Text>
                    </View>
                  </View>
                ))
              )}
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
        <TouchableOpacity
          style={[styles.ctaButton, !canContribute && { opacity: 0.45 }]}
          onPress={() => (canContribute ? handleContribute() : undefined)}
          activeOpacity={0.85}
          disabled={!canContribute}
        >
          <LinearGradient
            colors={['#FF6B00', '#FF3D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="heart" size={18} color="#FFF" />
            <Text style={styles.ctaButtonText}>
              {canContribute
                ? 'Contribuer'
                : project.status === 'pending'
                  ? 'En attente de validation'
                  : 'Campagne terminée ou close'}
            </Text>
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
  pendingBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#2A2208',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5D4A00',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pendingBannerText: { color: '#FFECB3', fontSize: 13, flex: 1, lineHeight: 18 },
  composerBox: { paddingHorizontal: 4, marginBottom: 12 },
  composerLabel: { color: '#AAA', fontSize: 12, marginBottom: 6 },
  composerInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  composerArea: { minHeight: 80, textAlignVertical: 'top' },
  composerBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  composerBtnText: { color: '#FFF', fontWeight: '700' },
  updateCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  updateTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  updateDate: { color: '#888', fontSize: 11, marginTop: 4, marginBottom: 8 },
  updateBody: { color: '#CCC', fontSize: 14, lineHeight: 20 },
  hintMute: { color: '#888', fontSize: 13, marginBottom: 8, paddingHorizontal: 4 },
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

  ownerBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#0D1A12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1B3320',
  },
  ownerTitle: { color: '#81C784', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  ownerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  ownerBtnDanger: { backgroundColor: '#6D2E2E' },
  ownerBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  ownerHint: { color: '#888', fontSize: 12, lineHeight: 18 },
  milestoneBlock: { marginTop: 8 },
  milestoneTitle: { color: '#CCC', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  milestoneLabel: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  milestoneMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  milestoneBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  milestoneBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  milestoneDone: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },

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
  commentText: { color: '#4CAF50', fontSize: 13, lineHeight: 19, marginTop: 2, fontWeight: '700' },
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
