import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { getUserFacingApiErrorMessage } from '../src/utils/userFacingError';

const fmtMoney = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

const PREMIUM_PLANS = [
  { id: 'monthly', name: 'Mensuel', price: 2500, period: '/mois', popular: false, savings: null as string | null },
  { id: 'yearly', name: 'Annuel', price: 25000, period: '/an', popular: true, savings: 'Économisez 5 000 FCFA' },
];

const PREMIUM_BENEFITS = [
  { icon: 'eye-off' as const, color: '#EF4444', title: 'Zéro publicité', desc: 'Aucune pub dans le feed ni les lives' },
  { icon: 'download' as const, color: '#3B82F6', title: 'Téléchargement illimité', desc: 'Vidéos hors ligne selon quotas' },
  { icon: 'diamond' as const, color: '#A855F7', title: 'Badge Premium', desc: 'Badge visible sur le profil et les commentaires' },
  { icon: 'color-filter' as const, color: '#EC4899', title: 'Filtres exclusifs', desc: 'Effets réservés aux membres' },
  { icon: 'videocam' as const, color: '#10B981', title: 'Replay HD', desc: 'Replays en meilleure qualité' },
  { icon: 'flash' as const, color: '#F59E0B', title: 'Accès anticipé', desc: 'Nouveautés en avant-première' },
  { icon: 'headset' as const, color: '#1DC3E2', title: 'Support prioritaire', desc: 'Réponse prioritaire du support' },
  { icon: 'musical-notes' as const, color: '#FF6B00', title: 'Sons exclusifs', desc: 'Bibliothèque premium pour vos créations' },
];

interface CreatorTier {
  id: string;
  creator_id: string;
  name: string;
  price: number;
  benefits: string[];
  is_active: boolean;
  subscriber_count?: number;
}

function errMessage(e: unknown): string {
  const ex = e as { userFacingMessage?: string };
  if (typeof ex.userFacingMessage === 'string' && ex.userFacingMessage.trim()) {
    return ex.userFacingMessage.trim();
  }
  return getUserFacingApiErrorMessage(e);
}

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, updateUser } = useAuthStore();
  const [tab, setTab] = useState<'premium' | 'fanclubs' | 'my'>('premium');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<{
    replay_premium?: boolean;
    role?: string;
    monetization_enabled?: boolean;
  } | null>(null);
  const [fanClubs, setFanClubs] = useState<CreatorTier[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
  const [creatingTier, setCreatingTier] = useState(false);
  const [fanClubPhone, setFanClubPhone] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, tiersRes, subsRes] = await Promise.allSettled([
        apiClient.get('/auth/me'),
        apiClient.get('/subscriptions/tiers'),
        apiClient.get('/subscriptions/my-subscriptions'),
      ]);
      if (meRes.status === 'fulfilled') {
        const raw = meRes.value.data?.data ?? meRes.value.data;
        setMe(raw);
        if (raw && typeof raw === 'object') {
          updateUser({
            replay_premium: raw.replay_premium,
            monetization_enabled: raw.monetization_enabled,
            role: raw.role,
          });
        }
      }
      if (tiersRes.status === 'fulfilled') {
        const td = tiersRes.value.data?.data ?? tiersRes.value.data;
        setFanClubs((td?.tiers ?? td?.items ?? []) as CreatorTier[]);
      }
      if (subsRes.status === 'fulfilled') {
        const sd = subsRes.value.data?.data ?? subsRes.value.data;
        const list = Array.isArray(sd) ? sd : sd?.subscriptions ?? sd?.items ?? [];
        setMySubscriptions(list);
      }
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const isPremium = Boolean(me?.replay_premium);

  const subscribePremium = async (planId: string) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    const plan = PREMIUM_PLANS.find((p) => p.id === planId);
    if (!plan) return;
    Alert.alert(
      'AfriWonder+',
      `S'abonner pour ${fmtMoney(plan.price)} ${plan.period} ?\nPaiement débité sur votre portefeuille AfriWonder.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: "S'abonner",
          onPress: () => {
            void (async () => {
              try {
                await apiClient.post('/subscriptions/premium', { plan_id: planId, payment_method: 'wallet' });
                setMe((m) => ({ ...m, replay_premium: true }));
                updateUser({ replay_premium: true });
                Alert.alert('Bienvenue dans AfriWonder+', 'Votre compte premium est activé.');
              } catch (e: unknown) {
                const msg = errMessage(e);
                const st = (e as { response?: { status?: number } }).response?.status;
                if (st === 402 || /solde|insufficient/i.test(msg)) {
                  Alert.alert('Solde insuffisant', 'Rechargez votre portefeuille pour continuer.', [
                    { text: 'Recharger', onPress: () => router.push('/wallet/recharge' as never) },
                    { text: 'Annuler' },
                  ]);
                } else {
                  Alert.alert('Erreur', msg);
                }
              }
            })();
          },
        },
      ],
    );
  };

  const subscribeFanClub = async (tier: CreatorTier) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    const phone = fanClubPhone.replace(/\s/g, '');
    if (phone.length < 8) {
      Alert.alert('Numéro requis', 'Indiquez un numéro Orange Money valide (ex. +223…).');
      return;
    }
    Alert.alert(
      `S'abonner à ${tier.name}`,
      `${fmtMoney(tier.price)}/mois — paiement Orange Money.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: "S'abonner",
          onPress: () => {
            void (async () => {
              try {
                const res = await apiClient.post('/subscriptions/subscribe', {
                  tierId: tier.id,
                  phone: phone.startsWith('+') ? phone : `+223${phone.replace(/^0+/, '')}`,
                });
                const data = res.data?.data ?? res.data;
                const url = data?.paymentUrl || data?.payment_url;
                if (url && typeof url === 'string') {
                  const can = await Linking.canOpenURL(url);
                  if (can) await Linking.openURL(url);
                }
                Alert.alert('Paiement', "Finalisez le paiement dans l'application Orange Money si une page s'est ouverte.");
                void loadData();
              } catch (e: unknown) {
                Alert.alert('Erreur', errMessage(e));
              }
            })();
          },
        },
      ],
    );
  };

  const createFanClubTier = async () => {
    setCreatingTier(true);
    try {
      await apiClient.post('/subscriptions/tiers', {
        name: 'Fan Club',
        price: 2000,
        benefits: ['Contenu exclusif', 'Badge fan', 'Lives privés', 'Messages directs'],
      });
      Alert.alert('Fan Club créé', 'Vos fans peuvent maintenant souscrire à ce palier.');
      void loadData();
    } catch (e: unknown) {
      Alert.alert('Erreur', errMessage(e));
    } finally {
      setCreatingTier(false);
    }
  };

  const canManageFanClub = me?.role === 'creator' || Boolean(me?.monetization_enabled);

  const tabs = [
    { id: 'premium' as const, label: 'AfriWonder+', icon: 'diamond' as const },
    { id: 'fanclubs' as const, label: 'Fan Clubs', icon: 'people' as const },
    { id: 'my' as const, label: 'Mes abonnements', icon: 'card' as const },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            testID={`subscription-tab-${t.id}`}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.id ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !me && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
        ) : null}

        {tab === 'premium' && (
          <View style={styles.content}>
            {isPremium ? (
              <LinearGradient
                colors={['rgba(168,85,247,0.2)', 'rgba(168,85,247,0.05)']}
                style={styles.premiumActive}
              >
                <Ionicons name="diamond" size={32} color="#A855F7" />
                <Text style={styles.premiumActiveTitle}>Vous êtes AfriWonder+</Text>
                <Text style={styles.premiumActiveSub}>Abonnement actif (replay premium)</Text>
              </LinearGradient>
            ) : (
              <>
                <View style={styles.premiumHero}>
                  <LinearGradient
                    colors={['rgba(168,85,247,0.3)', 'rgba(255,107,0,0.2)', 'rgba(236,72,153,0.15)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Ionicons name="diamond" size={40} color="#A855F7" />
                  <Text style={styles.premiumHeroTitle}>AfriWonder+</Text>
                  <Text style={styles.premiumHeroDesc}>L&apos;expérience premium AfriWonder</Text>
                </View>
                <View style={styles.plans}>
                  {PREMIUM_PLANS.map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planCard, plan.popular && styles.planCardPopular]}
                      onPress={() => void subscribePremium(plan.id)}
                    >
                      {plan.popular ? (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>POPULAIRE</Text>
                        </View>
                      ) : null}
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.planPriceRow}>
                        <Text style={styles.planPrice}>{fmtMoney(plan.price)}</Text>
                        <Text style={styles.planPeriod}>{plan.period}</Text>
                      </View>
                      {plan.savings ? <Text style={styles.planSavings}>{plan.savings}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Avantages inclus</Text>
            {PREMIUM_BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: `${b.color}26` }]}>
                  <Ionicons name={b.icon} size={20} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'fanclubs' && (
          <View style={styles.content}>
            <View style={styles.fanClubHeader}>
              <Text style={styles.sectionTitle}>Fan Clubs</Text>
              <Text style={styles.fanClubDesc}>
                Abonnez-vous à vos créateurs préférés. Le paiement passe par Orange Money (numéro ci-dessous).
              </Text>
            </View>

            <Text style={styles.inputLabel}>Numéro Orange Money</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="+223 XX XX XX XX"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={fanClubPhone}
              onChangeText={setFanClubPhone}
            />

            {canManageFanClub ? (
              <TouchableOpacity style={styles.createTierBtn} onPress={() => void createFanClubTier()} disabled={creatingTier}>
                {creatingTier ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFF" />
                    <Text style={styles.createTierBtnText}>Créer votre Fan Club</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {fanClubs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={50} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Aucun palier Fan Club public pour le moment</Text>
              </View>
            ) : (
              fanClubs.map((tier) => (
                <View key={tier.id} style={styles.tierCard}>
                  <View style={styles.tierCardHead}>
                    <View>
                      <Text style={styles.tierCardName}>{tier.name}</Text>
                      <Text style={styles.tierCardCreator}>{tier.subscriber_count ?? 0} abonnement(s)</Text>
                    </View>
                    <View>
                      <Text style={styles.tierCardPrice}>{fmtMoney(Number(tier.price) || 0)}</Text>
                      <Text style={styles.tierCardPeriod}>/mois</Text>
                    </View>
                  </View>
                  {Array.isArray(tier.benefits) && tier.benefits.length > 0 ? (
                    <View style={styles.tierBenefits}>
                      {tier.benefits.map((b, i) => (
                        <View key={i} style={styles.tierBenefitRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.tierBenefitText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.tierSubBtn} onPress={() => void subscribeFanClub(tier)}>
                    <Text style={styles.tierSubBtnText}>S&apos;abonner</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'my' && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Mes abonnements</Text>
            {isPremium ? (
              <View style={styles.mySubCard}>
                <Ionicons name="diamond" size={24} color="#A855F7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mySubName}>AfriWonder+</Text>
                  <Text style={styles.mySubDetail}>Premium actif</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                  <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '700' }}>ACTIF</Text>
                </View>
              </View>
            ) : null}
            {mySubscriptions.map((sub) => (
              <View key={sub.id} style={styles.mySubCard}>
                <Ionicons name="people" size={24} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mySubName}>{sub.tier?.name || sub.tier_name || 'Fan Club'}</Text>
                  <Text style={styles.mySubDetail}>
                    {fmtMoney(Number(sub.tier?.price ?? sub.price) || 0)}/mois · {String(sub.status || '')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        String(sub.status).toLowerCase() === 'active'
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(239,68,68,0.15)',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: String(sub.status).toLowerCase() === 'active' ? '#10B981' : '#EF4444',
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {String(sub.status).toLowerCase() === 'active' ? 'ACTIF' : String(sub.status || '').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
            {!isPremium && mySubscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="card-outline" size={50} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Aucun abonnement enregistré</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.md },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#FFF' },
  content: { paddingHorizontal: Spacing.xl },
  premiumHero: {
    borderRadius: BorderRadius.xl,
    padding: 30,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  premiumHeroTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginTop: 10 },
  premiumHeroDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 4 },
  premiumActive: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  premiumActiveTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: '#A855F7', marginTop: 8 },
  premiumActiveSub: { color: Colors.textSecondary, marginTop: 4 },
  plans: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  planCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  planCardPopular: { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.08)' },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#A855F7',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  planName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: 4 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  planPrice: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  planPeriod: { color: Colors.textMuted, fontSize: FontSizes.sm, marginLeft: 2 },
  planSavings: { color: '#10B981', fontSize: FontSizes.xs, fontWeight: '600', marginTop: 4 },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  benefitDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  fanClubHeader: { marginTop: 8 },
  fanClubDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: -8,
    marginBottom: Spacing.md,
  },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 6 },
  phoneInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  createTierBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
  tierCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierCardName: { color: Colors.text, fontWeight: 'bold', fontSize: FontSizes.lg },
  tierCardCreator: { color: Colors.textMuted, fontSize: FontSizes.xs },
  tierCardPrice: { color: Colors.primary, fontWeight: 'bold', fontSize: FontSizes.lg },
  tierCardPeriod: { color: Colors.textMuted, fontSize: FontSizes.xs, textAlign: 'right' },
  tierBenefits: { marginTop: 12, gap: 6 },
  tierBenefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBenefitText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  tierSubBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  tierSubBtnText: { color: '#FFF', fontWeight: 'bold' },
  mySubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mySubName: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  mySubDetail: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.md },
});
