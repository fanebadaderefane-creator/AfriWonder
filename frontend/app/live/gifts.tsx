import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAuthStore } from '../../src/store/authStore';
import socketService from '../../src/services/socketService';
import { playGiftSoundForCatalog } from '../../src/live/liveGiftSounds';
import { coinIapConfiguredForPackage, purchaseCoinPackageViaIap } from '../../src/wallet/coinIapPurchase';

const { width, height } = Dimensions.get('window');

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

function rarityColor(rarity?: string | null): string {
  switch (String(rarity || '').toLowerCase()) {
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

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      void playGiftSoundForCatalog(gift.giftId, gift.rarity, gift.giftName);
    }
    const anim = Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]);
    anim.start(() => onRemove(gift.id));
    return () => anim.stop();
  }, [gift.id, gift.giftId, gift.rarity, onRemove, opacity, scale, translateY]);

  const comboLabel = gift.combo > 1 ? ` · COMBO ×${gift.combo}` : '';

  return (
    <Animated.View
      style={[styles.giftAnimContainer, { transform: [{ translateY }, { scale }], opacity }]}
    >
      <View style={[styles.giftAnimBubble, { borderColor: gift.giftColor }]}>
        <GiftGlyph icon={gift.giftIcon} color={gift.giftColor} size={28} />
        <View>
          <Text style={styles.giftAnimSender}>{gift.senderName}</Text>
          <Text style={styles.giftAnimName}>
            {gift.giftName} ×{gift.quantity}
            {comboLabel}
          </Text>
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
  const [showRecharge, setShowRecharge] = useState(false);
  const [packages, setPackages] = useState<CoinPackageRow[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftCatalogRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [economyHint, setEconomyHint] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      try {
        const er = await apiClient.get('/live/economy');
        const em = (er.data?.data ?? er.data) as {
          example_coins?: number;
          example_usd?: number;
          coins_per_usd?: number;
        } | null;
        if (em && typeof em.example_coins === 'number' && typeof em.example_usd === 'number') {
          setEconomyHint(
            `Indicatif CDC : ${em.example_coins} coins ≈ ${em.example_usd} USD (LIVE_COINS_PER_USD=${em.coins_per_usd ?? '—'}).`,
          );
        } else setEconomyHint(null);
      } catch {
        setEconomyHint(null);
      }
      const res = await apiClient.get('/live/gifts');
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.catalog ?? [];
      setCatalog(
        (list as GiftCatalogRow[]).map((g) => ({
          id: String(g.id),
          name: String(g.name),
          icon: String(g.icon || '🎁'),
          price: Number(g.price) || 0,
          coin_value: Math.round(Number(g.coin_value ?? g.price) || 0),
          category: g.category,
          rarity: g.rarity,
          animation_url: g.animation_url,
        })),
      );
    } catch {
      setCatalog([]);
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
      setBalanceCoins(0);
    }
  }, []);

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
      setShowRecharge(true);
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
      Alert.alert('Cadeau envoyé', `${selectedGift.name} ×${quantity} — merci !`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Impossible d'envoyer le cadeau.";
      Alert.alert('Erreur', String(msg));
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
      setShowRecharge(false);
      void loadBalance();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      Alert.alert('Erreur', String(err.response?.data?.error || "Erreur lors de l'achat de coins."));
    }
  };

  const startIapPurchase = async (pkg: CoinPackageRow) => {
    try {
      const r = await purchaseCoinPackageViaIap(pkg.id);
      setBalanceCoins(r.coins_balance);
      setShowRecharge(false);
      Alert.alert('Merci !', `Votre solde : ${r.coins_balance.toLocaleString('fr-FR')} coins.`);
      void loadBalance();
    } catch (e: unknown) {
      Alert.alert('Achat in-app', String((e as Error)?.message || e));
    }
  };

  const onPressCoinPack = (pkg: CoinPackageRow) => {
    if (Platform.OS === 'web') {
      void startPurchase(pkg);
      return;
    }
    const iapOk = coinIapConfiguredForPackage(pkg.id) === true;
    if (!iapOk) {
      void startPurchase(pkg);
      return;
    }
    Alert.alert('Acheter des coins', 'Choisissez le mode de paiement.', [
      { text: 'Mobile Money / Wave', onPress: () => void startPurchase(pkg) },
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
          <Text style={styles.panelTitle}>
            {showRecharge ? 'Acheter des coins' : 'Envoyer un cadeau'}
          </Text>
          <TouchableOpacity
            onPress={showRecharge ? () => setShowRecharge(false) : onClose}
            accessibilityRole="button"
            accessibilityLabel={showRecharge ? 'Retour' : 'Fermer'}
          >
            <Ionicons name={showRecharge ? 'arrow-back' : 'close'} size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        {economyHint && !showRecharge ? (
          <Text style={{ color: Colors.textMuted, fontSize: 11, paddingHorizontal: Spacing.md, marginBottom: 6 }}>{economyHint}</Text>
        ) : null}
        {!showRecharge ? (
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
          onPress={() => setShowRecharge(true)}
          accessibilityRole="button"
        >
          <Ionicons name="diamond-outline" size={14} color="#FFD700" />
          <Text style={styles.coinBalanceText}>{balanceCoins.toLocaleString('fr-FR')} coins</Text>
          <Ionicons name="add-circle" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showRecharge ? (
        <View style={styles.coinPacks}>
          {packagesLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : packages.length === 0 ? (
            <Text style={styles.routeHint}>Aucun pack disponible pour le moment.</Text>
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
                    {pkg.coins_amount.toLocaleString('fr-FR')} coins
                    {pkg.bonus_coins ? ` + ${pkg.bonus_coins} bonus` : ''}
                  </Text>
                </View>
                <Text style={styles.coinPackPrice}>{pkg.price_fcfa.toLocaleString('fr-FR')} FCFA</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : catalogLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <FlatList
            data={catalog}
            numColumns={4}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.giftGrid}
            style={{ maxHeight: height * 0.38 }}
            renderItem={({ item }) => {
              const c = rarityColor(item.rarity);
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
                  <GiftGlyph icon={item.icon} color={c} size={28} />
                  <Text style={styles.giftName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.giftCost}>
                    <Text style={styles.giftCostText}>
                      {Math.round(item.coin_value || item.price)} coins
                    </Text>
                  </View>
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

  useEffect(() => {
    if (!liveId) return;
    socketService.joinLiveStream(liveId);
    const handler = (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const anim = mapServerGiftToAnimation(data as Record<string, unknown>);
      setFullscreenGift(anim);
      setAnimations((prev) => [...prev.slice(-4), anim]);
    };
    socketService.on('live:gift', handler);
    return () => {
      socketService.off('live:gift', handler);
      socketService.leaveLiveStream(liveId);
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
    backgroundColor: '#141520',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.62,
  },
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
  giftGrid: { padding: Spacing.md, paddingBottom: Spacing.lg },
  giftItem: {
    width: (width - 64) / 4,
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    margin: 4,
  },
  giftName: { color: Colors.text, fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  giftCost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  giftCostText: { color: '#FFD700', fontSize: 9, fontWeight: '700' },
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
});
