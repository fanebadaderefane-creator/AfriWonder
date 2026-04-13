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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import socketService from '../../src/services/socketService';

const { width, height } = Dimensions.get('window');

/** Prix unitaire en FCFA (backend : total = amount × quantity, min 100 FCFA). */
const GIFT_CATALOG = [
  { id: 'heart', name: 'Cœur', icon: 'heart' as const, amountXof: 100, color: '#FF4757' },
  { id: 'star', name: 'Étoile', icon: 'star' as const, amountXof: 250, color: '#FFEAA7' },
  { id: 'fire', name: 'Feu', icon: 'flame' as const, amountXof: 500, color: '#FF6B00' },
  { id: 'diamond', name: 'Diamant', icon: 'diamond' as const, amountXof: 1000, color: '#74B9FF' },
  { id: 'crown', name: 'Couronne', icon: 'trophy' as const, amountXof: 2500, color: '#FFD700' },
  { id: 'lion', name: "Lion d'or", icon: 'shield' as const, amountXof: 5000, color: '#FF6B00' },
  { id: 'rocket', name: 'Fusée', icon: 'rocket' as const, amountXof: 10000, color: '#A855F7' },
  { id: 'africa', name: 'Afrique', icon: 'globe' as const, amountXof: 25000, color: '#10B981' },
];

const RECHARGE_PACKS = [
  { amount: 500, label: '500 FCFA' },
  { amount: 1500, label: '1 500 FCFA' },
  { amount: 5000, label: '5 000 FCFA' },
  { amount: 10000, label: '10 000 FCFA' },
  { amount: 25000, label: '25 000 FCFA' },
];

export type GiftCatalogItem = (typeof GIFT_CATALOG)[number];

interface GiftAnimationData {
  id: string;
  senderName: string;
  giftName: string;
  giftIcon: string;
  giftColor: string;
  quantity: number;
}

function mapServerGiftToAnimation(data: Record<string, unknown>): GiftAnimationData {
  const senderName = String(
    data.sender_name ?? data.senderName ?? 'Anonyme',
  );
  const giftName = String(data.gift_name ?? data.giftName ?? 'Cadeau');
  const giftIcon = String(data.gift_icon ?? data.giftIcon ?? 'gift');
  const quantity = Number(data.quantity ?? 1) || 1;
  const giftId = String(data.gift_id ?? data.giftId ?? '');
  const fromCat = GIFT_CATALOG.find((g) => g.id === giftId);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    senderName,
    giftName,
    giftIcon,
    giftColor: fromCat?.color ?? Colors.primary,
    quantity,
  };
}

const GiftAnimationBubble: React.FC<{
  gift: GiftAnimationData;
  onRemove: (id: string) => void;
}> = ({ gift, onRemove }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
  }, [gift.id, onRemove, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[styles.giftAnimContainer, { transform: [{ translateY }, { scale }], opacity }]}
    >
      <View style={[styles.giftAnimBubble, { borderColor: gift.giftColor }]}>
        <Ionicons
          name={(gift.giftIcon as React.ComponentProps<typeof Ionicons>['name']) || 'gift'}
          size={28}
          color={gift.giftColor}
        />
        <View>
          <Text style={styles.giftAnimSender}>{gift.senderName}</Text>
          <Text style={styles.giftAnimName}>
            {gift.giftName} ×{gift.quantity}
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

export const LiveGiftsPanel: React.FC<LiveGiftsPanelProps> = ({ liveId, creatorId: _creatorId, visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [balanceXof, setBalanceXof] = useState(0);
  const [showRecharge, setShowRecharge] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftCatalogItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !liveId) return;
    void loadWallet();
    socketService.joinLiveStream(liveId);
    return () => {
      socketService.leaveLiveStream(liveId);
    };
  }, [visible, liveId]);

  const loadWallet = async () => {
    try {
      const res = await apiClient.get('/live/wallet');
      const d = res.data?.data ?? res.data;
      const raw =
        d?.available_balance ??
        d?.availableBalance ??
        d?.balance ??
        d?.coins_balance ??
        0;
      setBalanceXof(Math.round(Number(raw)) || 0);
    } catch {
      setBalanceXof(0);
    }
  };

  const sendGift = async () => {
    if (!selectedGift || !user) return;
    const totalCost = selectedGift.amountXof * quantity;
    if (totalCost < 100) {
      Alert.alert('Montant invalide', 'Le montant minimum est de 100 FCFA.');
      return;
    }
    if (totalCost > balanceXof) {
      setShowRecharge(true);
      return;
    }
    setSending(true);
    try {
      await apiClient.post(`/live/${liveId}/gift`, {
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        giftIcon: selectedGift.icon,
        amount: selectedGift.amountXof,
        quantity,
      });
      setBalanceXof((prev) => Math.max(0, prev - totalCost));
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

  const startRecharge = async (pack: (typeof RECHARGE_PACKS)[0]) => {
    try {
      const res = await apiClient.post('/live/wallet/recharge', { amount: pack.amount });
      const d = res.data?.data ?? res.data;
      if (d?.payment_url && typeof d.payment_url === 'string') {
        const ok = await Linking.canOpenURL(d.payment_url);
        if (ok) await Linking.openURL(d.payment_url);
        else Alert.alert('Recharge', 'URL de paiement reçue mais non ouvrable sur cet appareil.');
      } else {
        Alert.alert(
          'Recharge initiée',
          d?.mock
            ? 'Mode simulation : ouvrez le lien Orange mock depuis votre navigateur si besoin, puis rechargez le solde.'
            : 'Suivez les instructions de paiement (Orange Money).',
        );
      }
      setShowRecharge(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      Alert.alert('Erreur', String(err.response?.data?.error || "Erreur lors de l'initiation du paiement."));
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHandle} />
        <View style={styles.panelTitleRow}>
          <Text style={styles.panelTitle}>
            {showRecharge ? 'Recharger le portefeuille' : 'Envoyer un cadeau'}
          </Text>
          <TouchableOpacity
            onPress={showRecharge ? () => setShowRecharge(false) : onClose}
            accessibilityRole="button"
            accessibilityLabel={showRecharge ? 'Retour' : 'Fermer'}
          >
            <Ionicons name={showRecharge ? 'arrow-back' : 'close'} size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.coinBalance}
          onPress={() => setShowRecharge(true)}
          accessibilityRole="button"
        >
          <Ionicons name="wallet" size={14} color="#FFD700" />
          <Text style={styles.coinBalanceText}>{balanceXof.toLocaleString('fr-FR')} FCFA</Text>
          <Ionicons name="add-circle" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showRecharge ? (
        <View style={styles.coinPacks}>
          {RECHARGE_PACKS.map((pack) => (
            <TouchableOpacity
              key={pack.amount}
              style={styles.coinPack}
              onPress={() => void startRecharge(pack)}
            >
              <Ionicons name="phone-portrait-outline" size={24} color="#FFD700" />
              <Text style={styles.coinPackLabel}>{pack.label}</Text>
              <Text style={styles.coinPackPrice}>Orange Money</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <>
          <FlatList
            data={GIFT_CATALOG}
            numColumns={4}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.giftGrid}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.giftItem,
                  selectedGift?.id === item.id && {
                    borderColor: item.color,
                    backgroundColor: `${item.color}15`,
                  },
                ]}
                onPress={() => {
                  setSelectedGift(item);
                  setQuantity(1);
                }}
              >
                <Ionicons name={item.icon} size={28} color={item.color} />
                <Text style={styles.giftName}>{item.name}</Text>
                <View style={styles.giftCost}>
                  <Text style={styles.giftCostText}>{item.amountXof.toLocaleString('fr-FR')}</Text>
                </View>
              </TouchableOpacity>
            )}
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
                  {(selectedGift.amountXof * quantity).toLocaleString('fr-FR')} FCFA)
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

  useEffect(() => {
    if (!liveId) return;
    socketService.joinLiveStream(liveId);
    const handler = (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const anim = mapServerGiftToAnimation(data as Record<string, unknown>);
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

  return { animations, removeAnimation, GiftAnimationBubble };
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
    maxHeight: height * 0.55,
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
  giftGrid: { padding: Spacing.md },
  giftItem: {
    width: (width - 64) / 4,
    alignItems: 'center',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    margin: 4,
  },
  giftName: { color: Colors.text, fontSize: 10, fontWeight: '600', marginTop: 4 },
  giftCost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  giftCostText: { color: '#FFD700', fontSize: 10, fontWeight: '700' },
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
  coinPackLabel: { flex: 1, color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
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
});
