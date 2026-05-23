import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { useAuthStore } from '../../src/store/authStore';
import socketService from '../../src/services/socketService';
import { playGiftSoundForCatalog } from '../../src/live/liveGiftSounds';
import { coinIapConfiguredForPackage, purchaseCoinPackageViaIap } from '../../src/wallet/coinIapPurchase';
import { LiveTopFansEmbedded } from './_liveTopFansSheet';

const { width, height } = Dimensions.get('window');

/** Spectateurs virtuels (démo) : `EXPO_PUBLIC_SIMULATE_LIVE_GIFTS=1` dans `.env` */
const SIMULATE_LIVE_GIFTS = process.env.EXPO_PUBLIC_SIMULATE_LIVE_GIFTS === '1';

const DEMO_SENDERS = ['Kofi 🔥', 'Fatou 🌸', 'Chioma ✨', 'Bakary', 'Naledi 💎'];

export type GiftCatalogRow = {
  id: string;
  name: string;
  icon: string;
  price: number;
  coin_value: number;
  category?: string | null;
  rarity?: string | null;
  animation_url?: string | null;
};

/** Aligné maquettes AfriWonder Live (prix en coins). */
const FALLBACK_GIFT_CATALOG: GiftCatalogRow[] = [
  { id: 'afw-rose', name: 'Rose', icon: '🌹', price: 10, coin_value: 10, rarity: 'common' },
  { id: 'afw-star', name: 'Étoile', icon: '⭐', price: 50, coin_value: 50, rarity: 'common' },
  { id: 'afw-flame', name: 'Flamme', icon: '🔥', price: 100, coin_value: 100, rarity: 'rare' },
  { id: 'afw-lion', name: 'Lion', icon: '🦁', price: 200, coin_value: 200, rarity: 'rare' },
  { id: 'afw-crown', name: 'Couronne', icon: '👑', price: 500, coin_value: 500, rarity: 'epic' },
  { id: 'afw-diamond', name: 'Diamant', icon: '💎', price: 1000, coin_value: 1000, rarity: 'legendary' },
  { id: 'afw-baobab', name: 'Baobab', icon: '🌳', price: 2000, coin_value: 2000, rarity: 'legendary' },
  { id: 'afw-globe', name: 'AfriWonder', icon: '🌍', price: 5000, coin_value: 5000, rarity: 'legendary' },
];

function rarityColor(rarity?: string | null): string {
  switch (String(rarity || '').toLowerCase()) {
    case 'mythic':
      return '#FF1744';
    case 'legendary':
      return '#f59e0b';
    case 'epic':
      return '#a855f7';
    case 'rare':
      return '#60a5fa';
    default:
      return '#94a3b8';
  }
}

function rarityLabelFr(rarity?: string | null): string | null {
  switch (String(rarity || '').toLowerCase()) {
    case 'mythic':
      return 'Mythique';
    case 'legendary':
      return 'Légendaire';
    case 'epic':
      return 'Épique';
    case 'rare':
      return 'Rare';
    default:
      return null;
  }
}

/** Onglets catégories (TikTok-style). */
const GIFT_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'Tous', icon: '🎁' },
  { id: 'classic', label: 'Classique', icon: '🌹' },
  { id: 'african', label: 'Afrique', icon: '🦁' },
  { id: 'animals', label: 'Animaux', icon: '🐘' },
  { id: 'culture', label: 'Culture', icon: '🇲🇱' },
  { id: 'luxury', label: 'Luxe', icon: '💎' },
  { id: 'fantasy', label: 'Fantastique', icon: '🐉' },
  { id: 'party', label: 'Fête', icon: '🎆' },
  { id: 'music', label: 'Musique', icon: '🎵' },
  { id: 'food', label: 'Resto', icon: '🍕' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'nature', label: 'Nature', icon: '🌈' },
  { id: 'reaction', label: 'Réaction', icon: '👏' },
  { id: 'vip', label: 'VIP', icon: '🔱' },
];

function isLikelyEmojiIcon(s: string): boolean {
  const t = String(s || '').trim();
  if (!t) return false;
  if (t.length > 12) return false;
  return !/^[a-z0-9\-_]+$/i.test(t);
}

function GiftGlyph({ icon, color, size }: { icon: string; color: string; size: number }) {
  if (isLikelyEmojiIcon(icon)) {
    return <Text style={{ fontSize: size * 0.85 }}>{icon}</Text>;
  }
  return (
    <Ionicons
      name={(icon as React.ComponentProps<typeof Ionicons>['name']) || 'gift'}
      size={size}
      color={color}
    />
  );
}

interface GiftAnimationData {
  id: string;
  senderName: string;
  giftName: string;
  giftIcon: string;
  giftColor: string;
  quantity: number;
  combo: number;
  rarity?: string | null;
  giftId?: string;
  animationUrl?: string;
  /** Part créateur (FCFA), renvoyée par le serveur. */
  creatorEarningsFcfa?: number;
  /** float | burst | fullscreen */
  displayTier?: 'float' | 'burst' | 'fullscreen';
}

function mapServerGiftToAnimation(data: Record<string, unknown>): GiftAnimationData {
  const senderName = String(data.sender_name ?? data.senderName ?? 'Anonyme');
  const giftName = String(data.gift_name ?? data.giftName ?? 'Cadeau');
  const giftIcon = String(data.gift_icon ?? data.giftIcon ?? '🎁');
  const quantity = Number(data.quantity ?? 1) || 1;
  const combo = Math.max(1, Math.floor(Number(data.combo ?? 1) || 1));
  const rarity = data.rarity != null ? String(data.rarity) : '';
  const giftId = String(data.gift_id ?? data.giftId ?? '').trim();
  const animationUrl =
    data.animation_url != null ? String(data.animation_url).trim() : data.animationUrl != null ? String(data.animationUrl).trim() : '';
  const rawCe =
    data.creator_earnings_fcfa ?? data.creatorEarningsFcfa ?? data.creator_earnings ?? data.creatorEarnings;
  const creatorEarningsFcfa = Number(rawCe);
  const r = String(rarity || '').toLowerCase();
  let displayTier: GiftAnimationData['displayTier'] = 'float';
  if (r === 'legendary') displayTier = 'fullscreen';
  else if (r === 'epic' || r === 'rare') displayTier = 'burst';
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    senderName,
    giftName,
    giftIcon,
    giftColor: rarityColor(rarity || undefined),
    quantity,
    combo,
    rarity: rarity || undefined,
    giftId: giftId || undefined,
    animationUrl: animationUrl || undefined,
    creatorEarningsFcfa: Number.isFinite(creatorEarningsFcfa) ? creatorEarningsFcfa : undefined,
    displayTier,
  };
}

/** Plein écran ~3 s — visible par tous les clients branchés sur le socket live. */
function GiftFullscreenOverlay({ gift, onDismiss }: { gift: GiftAnimationData | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!gift) return;
    const t = setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [gift, onDismiss]);

  if (!gift) return null;

  const rawUrl = String(gift.animationUrl || '').trim();
  const isHttpImage = /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(rawUrl);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.fsRoot} onPress={onDismiss}>
        <View style={styles.fsCard} pointerEvents="box-none">
          {isHttpImage ? (
            <Image source={{ uri: rawUrl }} style={styles.fsImage} resizeMode="contain" />
          ) : (
            <Text style={styles.fsEmoji}>{gift.giftIcon}</Text>
          )}
          <Text style={styles.fsFrom}>{gift.senderName}</Text>
          <Text style={styles.fsGift}>
            {gift.giftName} ×{gift.quantity}
            {gift.combo > 1 ? ` · COMBO ×${gift.combo}` : ''}
          </Text>
          {gift.creatorEarningsFcfa != null && gift.creatorEarningsFcfa > 0 ? (
            <Text style={styles.fsCreator}>
              {gift.creatorEarningsFcfa.toLocaleString('fr-FR')} FCFA au créateur
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const GiftAnimationBubble: React.FC<{
  gift: GiftAnimationData;
  onRemove: (id: string) => void;
}> = ({ gift, onRemove }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const burst = gift.displayTier === 'burst';

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      void playGiftSoundForCatalog(gift.giftId, gift.rarity, gift.giftName);
    }
    if (burst) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(spin, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(spin, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
    }
    const holdMs = burst ? 2600 : 2000;
    const anim = Animated.parallel([
      Animated.spring(scale, { toValue: burst ? 1.08 : 1, friction: 4, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(holdMs),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]);
    anim.start(() => onRemove(gift.id));
    return () => anim.stop();
  }, [burst, gift.displayTier, gift.giftId, gift.giftName, gift.id, gift.rarity, onRemove, opacity, scale, spin, translateY]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });
  const comboLabel =
    gift.combo > 1 ? (
      <View style={styles.comboPillWrap}>
        <Text style={styles.comboPillText}>×{gift.combo} COMBO</Text>
      </View>
    ) : null;

  return (
    <Animated.View
      style={[styles.giftAnimContainer, { transform: [{ translateY }, { scale }, { rotate }], opacity }]}
    >
      {burst ? (
        <View style={styles.burstRing} pointerEvents="none">
          {['✨', '⭐', '✨', '💫', '✨'].map((e, i) => (
            <Text key={`p-${i}`} style={[styles.burstParticle, { top: Math.sin((i / 5) * Math.PI * 2) * 36, left: 40 + Math.cos((i / 5) * Math.PI * 2) * 36 }]}>
              {e}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={[styles.giftAnimBubble, { borderColor: gift.giftColor, zIndex: 2 }]}>
        <GiftGlyph icon={gift.giftIcon} color={gift.giftColor} size={burst ? 34 : 28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.giftAnimSender}>{gift.senderName}</Text>
          <Text style={styles.giftAnimName}>
            a offert {gift.giftName} ×{gift.quantity}
          </Text>
          {comboLabel}
          {gift.creatorEarningsFcfa != null && gift.creatorEarningsFcfa > 0 ? (
            <Text style={styles.giftAnimCreator}>
              +{gift.creatorEarningsFcfa.toLocaleString('fr-FR')} FCFA créateur
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

export interface LiveGiftsPanelProps {
  liveId: string;
  creatorId: string;
  visible: boolean;
  onClose: () => void;
}

type CoinPackageRow = {
  id: string;
  name: string;
  coins_amount: number;
  price_fcfa: number;
  bonus_coins?: number;
};

export const LiveGiftsPanel: React.FC<LiveGiftsPanelProps> = ({
  liveId,
  creatorId: _creatorId,
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [balanceCoins, setBalanceCoins] = useState(0);
  const [catalog, setCatalog] = useState<GiftCatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'recharge' | 'topFans'>('send');
  const [packages, setPackages] = useState<CoinPackageRow[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftCatalogRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [economyHint, setEconomyHint] = useState<string | null>(null);
  const [fcfaPerCoin, setFcfaPerCoin] = useState(5);
  const [creatorShare, setCreatorShare] = useState(0.7);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  /** Catalogue filtré par catégorie. Toujours trié par prix croissant. */
  const filteredCatalog = useMemo(() => {
    const base = activeCategory === 'all'
      ? catalog
      : catalog.filter((g) => String(g.category || '').toLowerCase() === activeCategory);
    return [...base].sort((a, b) => Number(a.coin_value) - Number(b.coin_value));
  }, [catalog, activeCategory]);

  /** Compte des cadeaux par catégorie pour les badges (TikTok-style). */
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of catalog) {
      const c = String(g.category || '').toLowerCase();
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    counts.set('all', catalog.length);
    return counts;
  }, [catalog]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      try {
        const er = await apiClient.get('/live/economy');
        const em = (er.data?.data ?? er.data) as {
          example_coins?: number;
          example_usd?: number;
          coins_per_usd?: number;
          fcfa_approx_per_coin_purchase?: number;
          live_gift_creator_share?: number;
        } | null;
        if (em && typeof em.fcfa_approx_per_coin_purchase === 'number' && em.fcfa_approx_per_coin_purchase > 0) {
          setFcfaPerCoin(em.fcfa_approx_per_coin_purchase);
        }
        if (em && typeof em.live_gift_creator_share === 'number' && em.live_gift_creator_share > 0) {
          setCreatorShare(em.live_gift_creator_share);
        }
        if (em && typeof em.example_coins === 'number' && typeof em.example_usd === 'number') {
          setEconomyHint(
            `Indicatif : ${em.example_coins} coins ≈ ${em.example_usd} USD (taux CDC).`,
          );
        } else setEconomyHint(null);
      } catch {
        setEconomyHint(null);
      }
      const res = await apiClient.get('/live/gifts');
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.catalog ?? [];
      const mapped = (list as GiftCatalogRow[]).map((g) => ({
          id: String(g.id),
          name: String(g.name),
          icon: String(g.icon || '🎁'),
          price: Number(g.price) || 0,
          coin_value: Math.round(Number(g.coin_value ?? g.price) || 0),
          category: g.category,
          rarity: g.rarity,
          animation_url: g.animation_url,
        }));
      setCatalog(mapped.length > 0 ? mapped : FALLBACK_GIFT_CATALOG);
    } catch {
      setCatalog(FALLBACK_GIFT_CATALOG);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const res = await apiClient.get('/coins/balance');
      const d = res.data?.data ?? res.data;
      const raw = d?.coins_balance ?? d?.coinsBalance ?? d?.balance ?? 0;
      setBalanceCoins(Math.round(Number(raw)) || 0);
    } catch {
      const userAny = user as Record<string, unknown> | null;
      const fallback =
        Number(
          userAny?.coins_balance ?? userAny?.coinsBalance ?? userAny?.balance ?? userAny?.wallet_balance ?? 0,
        ) || 0;
      setBalanceCoins(Math.max(0, Math.round(fallback)));
    }
  }, [user]);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const res = await apiClient.get('/coins/packages');
      const d = res.data?.data ?? res.data;
      const pk = d?.packages ?? d;
      setPackages(Array.isArray(pk) ? (pk as CoinPackageRow[]) : []);
    } catch {
      setPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || !liveId) return;
    void loadCatalog();
    void loadBalance();
    void loadPackages();
    socketService.joinLiveStream(liveId);
    return () => {
      socketService.leaveLiveStream(liveId);
    };
  }, [visible, liveId, loadCatalog, loadBalance, loadPackages]);

  const sendGift = async () => {
    if (!selectedGift || !user) return;
    const unitCoins = Math.round(selectedGift.coin_value || selectedGift.price);
    const totalCoins = unitCoins * quantity;
    if (totalCoins < 1) {
      Alert.alert('Montant invalide', 'Quantité ou cadeau invalide.');
      return;
    }
    if (totalCoins > balanceCoins) {
      Alert.alert(
        'Solde insuffisant',
        `Il faut ${totalCoins.toLocaleString('fr-FR')} coins, votre solde est ${balanceCoins.toLocaleString('fr-FR')} coins.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Recharger', onPress: () => setActiveTab('recharge') },
        ],
      );
      return;
    }
    setSending(true);
    try {
      await apiClient.post(`/live/${liveId}/gift`, {
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        giftIcon: selectedGift.icon,
        amount: unitCoins,
        quantity,
      });
      setBalanceCoins((prev) => Math.max(0, prev - totalCoins));
      setSelectedGift(null);
      setQuantity(1);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      // UX type TikTok: envoi instantané, pas de popup bloquante.
      onClose();
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    } finally {
      setSending(false);
    }
  };

  const startPurchase = async (pkg: CoinPackageRow) => {
    try {
      const res = await apiClient.post('/coins/purchase', {
        packageId: pkg.id,
        payment_method: 'orange_money',
      });
      const d = res.data?.data ?? res.data;
      if (d?.payment_url && typeof d.payment_url === 'string') {
        const ok = await Linking.canOpenURL(d.payment_url);
        if (ok) await Linking.openURL(d.payment_url);
        else Alert.alert('Achat coins', 'URL de paiement reçue mais non ouvrable sur cet appareil.');
      } else {
        Alert.alert(
          'Achat coins',
          d?.mock
            ? 'Mode simulation : suivez les instructions de test du backend.'
            : 'Paiement initié. Suivez les instructions (Mobile Money).',
        );
      }
      setActiveTab('send');
      void loadBalance();
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    }
  };

  const startIapPurchase = async (pkg: CoinPackageRow) => {
    try {
      const r = await purchaseCoinPackageViaIap(pkg.id);
      setBalanceCoins(r.coins_balance);
      setActiveTab('send');
      Alert.alert('Merci !', `Votre solde : ${r.coins_balance.toLocaleString('fr-FR')} coins.`);
      void loadBalance();
    } catch (e: unknown) {
      const native = (e as Error)?.message ? String((e as Error).message) : '';
      const msg = native && !/^\[object|undefined|null$/i.test(native)
        ? native
        : 'Achat annulé ou indisponible. Réessayez depuis le store.';
      Alert.alert('Achat in-app', msg);
    }
  };

  const onPressCoinPack = (pkg: CoinPackageRow) => {
    if (Platform.OS === 'web') {
      void startPurchase(pkg);
      return;
    }
    const iapOk = coinIapConfiguredForPackage(pkg.id) === true;
    if (!iapOk) {
      onClose();
      router.push({
        pathname: '/live/coin-recharge-mm',
        params: { packageId: pkg.id, liveId },
      } as never);
      return;
    }
    Alert.alert('Acheter des coins', 'Choisissez le mode de paiement.', [
      {
        text: 'Tunnel Mobile Money (4 étapes)',
        onPress: () => {
          onClose();
          router.push({
            pathname: '/live/coin-recharge-mm',
            params: { packageId: pkg.id, liveId },
          } as never);
        },
      },
      { text: 'Rapide (navigateur / OM)', onPress: () => void startPurchase(pkg) },
      { text: 'App Store / Play (IAP)', onPress: () => void startIapPurchase(pkg) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  if (!visible) return null;

  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHandle} />
        <View style={styles.panelTitleRow}>
          <Text style={styles.panelTitle}>AfriCoins & cadeaux</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.tabRow}>
          {(
            [
              { key: 'send' as const, label: 'Envoyer' },
              { key: 'recharge' as const, label: 'Recharger' },
              { key: 'topFans' as const, label: 'Top Fans' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {economyHint && activeTab === 'send' ? (
          <Text style={{ color: Colors.textMuted, fontSize: 11, paddingHorizontal: Spacing.md, marginBottom: 6 }}>{economyHint}</Text>
        ) : null}
        {activeTab === 'send' ? (
          <TouchableOpacity
            style={styles.missionsRow}
            onPress={() => {
              onClose();
              router.push('/wallet/coins' as never);
            }}
            accessibilityRole="button"
            accessibilityLabel="Missions quotidiennes et coins gratuits"
          >
            <Ionicons name="gift-outline" size={16} color={Colors.primary} />
            <Text style={styles.missionsRowText}>Gagner des coins (missions quotidiennes)</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.coinBalance}
          onPress={() => setActiveTab('recharge')}
          accessibilityRole="button"
        >
          <Ionicons name="diamond-outline" size={14} color="#FFD700" />
          <Text style={styles.coinBalanceText}>{balanceCoins.toLocaleString('fr-FR')} AfriCoins</Text>
          <Ionicons name="add-circle" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {activeTab === 'recharge' ? (
        <View style={styles.coinPacks}>
          {packagesLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : packages.length === 0 ? (
            <Text style={styles.routeHint}>Aucun pack disponible.</Text>
          ) : (
            packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={styles.coinPack}
                onPress={() => void onPressCoinPack(pkg)}
              >
                <Ionicons name="wallet" size={24} color="#FFD700" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.coinPackLabel}>{pkg.name}</Text>
                  <Text style={styles.coinPackSub}>
                    Total : {pkg.coins_amount.toLocaleString('fr-FR')} AfriCoins
                    {pkg.bonus_coins ? (
                      <Text style={styles.bonusBadgeText}>{`  +${pkg.bonus_coins} BONUS`}</Text>
                    ) : (
                      ''
                    )}
                  </Text>
                </View>
                <Text style={styles.coinPackPrice}>{pkg.price_fcfa.toLocaleString('fr-FR')} FCFA</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            style={styles.mmLink}
            onPress={() => {
              onClose();
              router.push('/africoin/coins' as never);
            }}
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#D4AF37" />
            <Text style={styles.mmLinkText}>Obtenir des Pièces (parcours complet / MAD)</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {packages.length > 0 ? (
            <Text style={styles.rechargeHint}>Un appui sur un pack ouvre le tunnel Mobile Money (XOF) en 4 étapes.</Text>
          ) : null}
        </View>
      ) : activeTab === 'topFans' ? (
        <View style={{ paddingHorizontal: Spacing.md, minHeight: 200 }}>
          <LiveTopFansEmbedded liveId={liveId} />
        </View>
      ) : catalogLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <>
          {/* Onglets catégories TikTok-style — défilement horizontal */}
          <FlatList
            horizontal
            data={GIFT_CATEGORIES.filter((c) => c.id === 'all' || (categoryCounts.get(c.id) || 0) > 0)}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsRow}
            style={{ maxHeight: 48, marginBottom: 4 }}
            renderItem={({ item: cat }) => {
              const active = activeCategory === cat.id;
              const count = categoryCounts.get(cat.id) || 0;
              return (
                <TouchableOpacity
                  testID={`gift-cat-tab-${cat.id}`}
                  style={[styles.categoryTab, active && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryTabIcon, !active && { opacity: 0.7 }]}>{cat.icon}</Text>
                  <Text style={[styles.categoryTabLabel, active && styles.categoryTabLabelActive]}>
                    {cat.label}
                  </Text>
                  {count > 0 ? (
                    <Text style={[styles.categoryTabCount, active && { color: '#FFF' }]}>{count}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
          <FlatList
            data={filteredCatalog}
            numColumns={2}
            columnWrapperStyle={styles.giftRowWrap}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.giftGrid}
            style={{ maxHeight: height * 0.42 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
                <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
                  Aucun cadeau dans cette catégorie
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const c = rarityColor(item.rarity);
              const coins = Math.round(item.coin_value || item.price);
              const creatorFcfa = Math.round(coins * fcfaPerCoin * creatorShare);
              const rl = rarityLabelFr(item.rarity);
              return (
                <TouchableOpacity
                  style={[
                    styles.giftItem,
                    selectedGift?.id === item.id && {
                      borderColor: c,
                      backgroundColor: `${c}18`,
                    },
                  ]}
                  onPress={() => {
                    setSelectedGift(item);
                    setQuantity(1);
                  }}
                >
                  {rl ? (
                    <Text style={[styles.giftRarityTag, { color: c }]}>{rl === 'Rare' ? '✨ Rare' : rl}</Text>
                  ) : null}
                  <GiftGlyph icon={item.icon} color={c} size={32} />
                  <Text style={styles.giftName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.giftCost}>
                    <Text style={styles.giftCostText}>{coins.toLocaleString('fr-FR')} coins</Text>
                  </View>
                  <Text style={styles.giftCreatorHint}>~{creatorFcfa.toLocaleString('fr-FR')} FCFA créateur</Text>
                </TouchableOpacity>
              );
            }}
          />
          {selectedGift ? (
            <View style={styles.sendRow}>
              <View style={styles.quantityRow}>
                {[1, 5, 10, 50].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.qtyBtn, quantity === q && styles.qtyBtnActive]}
                    onPress={() => setQuantity(q)}
                  >
                    <Text style={[styles.qtyBtnText, quantity === q && { color: '#FFF' }]}>×{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.5 }]}
                onPress={() => void sendGift()}
                disabled={sending}
              >
                <Text style={styles.sendBtnText}>
                  Envoyer {selectedGift.name} (
                  {(Math.round(selectedGift.coin_value || selectedGift.price) * quantity).toLocaleString(
                    'fr-FR',
                  )}{' '}
                  coins)
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

export function useGiftAnimations(liveId: string) {
  const [animations, setAnimations] = useState<GiftAnimationData[]>([]);
  const [fullscreenGift, setFullscreenGift] = useState<GiftAnimationData | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!liveId) return;
    socketService.joinLiveStream(liveId);
    const handler = (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const anim = mapServerGiftToAnimation(data as Record<string, unknown>);
      if (anim.displayTier === 'fullscreen') {
        setFullscreenGift(anim);
      }
      if (anim.displayTier !== 'fullscreen') {
        setAnimations((prev) => [...prev.slice(-4), anim]);
      }
    };
    socketService.on('live:gift', handler);

    if (SIMULATE_LIVE_GIFTS && liveId) {
      const tick = () => {
        const cat = FALLBACK_GIFT_CATALOG[Math.floor(Math.random() * FALLBACK_GIFT_CATALOG.length)];
        const sender = DEMO_SENDERS[Math.floor(Math.random() * DEMO_SENDERS.length)]!;
        handler({
          sender_name: sender,
          gift_name: cat.name,
          gift_icon: cat.icon,
          gift_id: cat.id,
          quantity: 1,
          combo: Math.random() > 0.7 ? 1 + Math.floor(Math.random() * 5) : 1,
          rarity: cat.rarity,
          creator_earnings_fcfa: Math.round((cat.coin_value * 5 * 7) / 10),
          total_amount_fcfa: cat.coin_value * 5,
        });
      };
      simRef.current = setInterval(tick, 22000 + Math.floor(Math.random() * 14000));
    }

    return () => {
      socketService.off('live:gift', handler);
      socketService.leaveLiveStream(liveId);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [liveId]);

  const removeAnimation = useCallback((id: string) => {
    setAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const GiftFullscreenHost = useCallback(
    () => <GiftFullscreenOverlay gift={fullscreenGift} onDismiss={() => setFullscreenGift(null)} />,
    [fullscreenGift],
  );

  return { animations, removeAnimation, GiftAnimationBubble, GiftFullscreenHost };
}

/** Route plein écran : `/live/gifts?liveId=…&creatorId=…` — ou réutilisez `<LiveGiftsPanel />` dans l’écran live. */
export default function LiveGiftsScreen() {
  const insets = useSafeAreaInsets();
  const { liveId, creatorId } = useLocalSearchParams<{ liveId?: string; creatorId?: string }>();
  const id = String(liveId || '').trim();
  const cid = String(creatorId || '').trim();

  if (!id) {
    return (
      <View style={[styles.routeRoot, { paddingTop: insets.top }]}>
        <View style={styles.panelTitleRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.panelTitle}>Cadeaux live</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.routeHint}>
          Ouvrez cette page avec le paramètre liveId (ex. depuis le lecteur live).
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.routeRoot, { paddingTop: insets.top }]}>
      <LiveGiftsPanel liveId={id} creatorId={cid} visible onClose={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  routeRoot: { flex: 1, backgroundColor: Colors.background },
  routeHint: { color: Colors.textMuted, padding: Spacing.xl, fontSize: FontSizes.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  panel: {
    backgroundColor: '#2A1F18',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.72,
    borderTopWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  tabBtnText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#D4AF37' },
  mmLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  mmLinkText: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  rechargeHint: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  bonusBadgeText: { color: '#F87171', fontWeight: '800' },
  panelHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 10,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  missionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    alignSelf: 'stretch',
  },
  missionsRowText: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  coinBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  coinBalanceText: { color: '#FFD700', fontSize: FontSizes.sm, fontWeight: '600' },
  giftGrid: { padding: Spacing.sm, paddingBottom: Spacing.lg },
  giftRowWrap: { justifyContent: 'space-between', paddingHorizontal: Spacing.xs },
  categoryTabsRow: { paddingHorizontal: Spacing.sm, gap: 6, alignItems: 'center' },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 5,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTabIcon: { fontSize: 14 },
  categoryTabLabel: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  categoryTabLabelActive: { color: '#FFF', fontWeight: '700' },
  categoryTabCount: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  giftItem: {
    flex: 1,
    maxWidth: (width - 48) / 2,
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    margin: 6,
  },
  giftRarityTag: { fontSize: 9, fontWeight: '800', marginBottom: 4 },
  giftName: { color: Colors.text, fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  giftCost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  giftCostText: { color: '#FFD700', fontSize: 13, fontWeight: '800' },
  giftCreatorHint: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 4, textAlign: 'center' },
  sendRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  quantityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  qtyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qtyBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  qtyBtnText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
  },
  sendBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
  coinPacks: { padding: Spacing.lg, gap: 10 },
  coinPack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coinPackLabel: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  coinPackSub: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
  coinPackPrice: { color: Colors.primary, fontWeight: 'bold', fontSize: FontSizes.md },
  giftAnimContainer: { position: 'absolute', left: 16, bottom: 200 },
  giftAnimBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
  },
  giftAnimSender: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: '600' },
  giftAnimName: { color: '#FFD700', fontSize: FontSizes.xs, fontWeight: '700' },
  giftAnimCreator: { color: 'rgba(253,224,71,0.95)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  comboPillWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  comboPillText: { color: '#FDE68A', fontSize: 11, fontWeight: '900' },
  burstRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    left: -10,
    top: -20,
    zIndex: 0,
  },
  burstParticle: {
    position: 'absolute',
    fontSize: 14,
  },
  fsRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  fsCard: { alignItems: 'center', maxWidth: width * 0.92 },
  fsEmoji: { fontSize: Math.min(120, width * 0.22), marginBottom: 12 },
  fsImage: { width: width * 0.72, height: height * 0.34, marginBottom: 12 },
  fsFrom: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.md, fontWeight: '700' },
  fsGift: { color: '#FFD700', fontSize: FontSizes.lg, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  fsCreator: {
    color: 'rgba(253,224,71,0.95)',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
});
