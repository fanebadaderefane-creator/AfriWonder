import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FontSizes, Spacing } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';
import { formatMoneyAmount } from '../../src/utils/formatMoney';
import { getCoinsBalance } from '../../src/services/mobileApiService';

/** Grille type capture TikTok (MAD) — affichage produit ; le paiement réel reste sur le parcours AfriWonder. */
const COIN_PACKS_MAD = [
  { id: 'p30', coins: 30, priceMad: 3.05 },
  { id: 'p350', coins: 350, priceMad: 35.05 },
  { id: 'p700', coins: 700, priceMad: 70.05 },
  { id: 'p1400', coins: 1400, priceMad: 140.85 },
  { id: 'p3500', coins: 3500, priceMad: 352.05 },
  { id: 'p7000', coins: 7000, priceMad: 704.05 },
];

const REFERRAL_CODE = 'AFRICOIN';
const CUSTOM_PACK_ID = 'custom';
/** Tarif indicatif aligné sur le pack 30 Pièces = 3,05 MAD (même ratio pour un montant libre). */
const BASE_COINS = 30;
const BASE_PRICE_MAD = 3.05;
const MAD_PER_COIN = BASE_PRICE_MAD / BASE_COINS;
const MIN_CUSTOM_COINS = 10;
const MAX_CUSTOM_COINS = 500_000;

function priceMadForCoinCount(coins: number): number {
  const n = Math.floor(coins);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const raw = n * MAD_PER_COIN;
  return Math.round(raw * 100) / 100;
}

export default function AfricoinCoinsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedId, setSelectedId] = useState(COIN_PACKS_MAD[0].id);
  const [secureModal, setSecureModal] = useState(false);
  const [customCoins, setCustomCoins] = useState<number | null>(null);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customDraft, setCustomDraft] = useState('');

  const selected = useMemo(() => {
    if (selectedId === CUSTOM_PACK_ID && customCoins != null && customCoins >= MIN_CUSTOM_COINS) {
      return {
        id: CUSTOM_PACK_ID,
        coins: customCoins,
        priceMad: priceMadForCoinCount(customCoins),
      };
    }
    return COIN_PACKS_MAD.find((p) => p.id === selectedId) ?? COIN_PACKS_MAD[0];
  }, [selectedId, customCoins]);

  useEffect(() => {
    void (async () => {
      try {
        const b = await getCoinsBalance().catch(() => ({ coins_balance: 0 }));
        setBalance(Number(b.coins_balance || 0));
      } finally {
        setLoadingBalance(false);
      }
    })();
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(REFERRAL_CODE);
      Alert.alert('Copié', 'Code de parrainage copié.');
    } catch {
      Alert.alert('Erreur', 'Impossible de copier.');
    }
  }, []);

  const displayName = useMemo(() => {
    const fn = (user?.full_name || '').trim();
    if (fn) return fn.split(/\s+/)[0];
    return user?.username || 'Vous';
  }, [user?.full_name, user?.username]);

  const goOrderSummary = () => {
    if (selectedId === CUSTOM_PACK_ID && (customCoins == null || customCoins < MIN_CUSTOM_COINS)) {
      Alert.alert('Montant personnalisé', `Indique un nombre de Pièces entre ${MIN_CUSTOM_COINS.toLocaleString('fr-FR')} et ${MAX_CUSTOM_COINS.toLocaleString('fr-FR')}.`);
      return;
    }
    router.push({
      pathname: '/africoin/order-summary',
      params: {
        coins: String(selected.coins),
        priceMad: String(selected.priceMad),
        username: user?.username || displayName,
      },
    } as never);
  };

  const openCustomModal = () => {
    setCustomDraft(customCoins != null ? String(customCoins) : '500');
    setCustomModalVisible(true);
  };

  const applyCustomAmount = () => {
    const raw = String(customDraft || '').replace(/\s/g, '').replace(/,/g, '.');
    const n = Math.floor(Number.parseFloat(raw));
    if (!Number.isFinite(n) || n < MIN_CUSTOM_COINS) {
      Alert.alert('Montant invalide', `Minimum ${MIN_CUSTOM_COINS} Pièces.`);
      return;
    }
    if (n > MAX_CUSTOM_COINS) {
      Alert.alert('Montant trop élevé', `Maximum ${MAX_CUSTOM_COINS.toLocaleString('fr-FR')} Pièces.`);
      return;
    }
    setCustomCoins(n);
    setSelectedId(CUSTOM_PACK_ID);
    setCustomModalVisible(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Obtenir des Pièces</Text>
        <TouchableOpacity
          onPress={() => router.push('/wallet/coins' as never)}
          style={styles.historyLink}
          accessibilityLabel="Voir l’historique des transactions"
        >
          <Text style={styles.historyLinkText}>Historique</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.userRow}>
            {isAuthenticated && user ? (
              <CreatorAvatar
                uri={user.profile_image}
                username={user.username}
                firstName={displayName}
                lastName=""
                size={44}
                bordered={false}
              />
            ) : (
              <View style={styles.avatarPh}>
                <Ionicons name="person" size={22} color="#666" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.username ? `@${String(user.username).replace(/^@+/, '')}` : displayName}
              </Text>
              <View style={styles.balanceRow}>
                <Ionicons name="logo-bitcoin" size={18} color="#f7b500" />
                {loadingBalance ? (
                  <ActivityIndicator size="small" color="#111" style={{ marginLeft: 8 }} />
                ) : (
                  <Text style={styles.balanceNum}>{balance.toLocaleString('fr-FR')}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.referralBox}>
            <Text style={styles.referralTitle}>Invite et obtiens des récompenses</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
              <TouchableOpacity onPress={() => void copyCode()} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color="#fe2c55" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.promoHint}>
            Recharger : économise environ 25 % grâce à une réduction de la commission de service (indicatif).
          </Text>

          <View style={styles.grid}>
            {COIN_PACKS_MAD.map((p) => {
              const on = p.id === selectedId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.packCell, on && styles.packCellOn]}
                  onPress={() => {
                    setSelectedId(p.id);
                  }}
                  activeOpacity={0.9}
                >
                  <Ionicons name="logo-bitcoin" size={20} color="#f7b500" />
                  <Text style={styles.packCoins}>{p.coins}</Text>
                  <Text style={styles.packPrice}>{formatMoneyAmount(p.priceMad, 'MAD')}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.packCell, styles.packCellMuted, selectedId === CUSTOM_PACK_ID && styles.packCellOn]}
              onPress={openCustomModal}
              activeOpacity={0.9}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              <Text style={styles.packCoins}>Personnaliser</Text>
              <Text style={styles.packPrice}>
                {customCoins != null ? `${customCoins.toLocaleString('fr-FR')} Pièces` : 'Ton montant'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedId === CUSTOM_PACK_ID && customCoins != null ? (
            <Text style={styles.customSummary}>
              Personnalisé : {customCoins.toLocaleString('fr-FR')} Pièces → {formatMoneyAmount(priceMadForCoinCount(customCoins), 'MAD')}{' '}
              <Text style={styles.customSummaryHint}>(tarif indicatif, même ratio que 30 Pièces)</Text>
            </Text>
          ) : null}

          <View style={styles.offerBox}>
            <Text style={styles.offerTitle}>Offre spéciale</Text>
            <Text style={styles.offerBody}>5 % cash back sur une recharge éligible (conditions AfriWonder).</Text>
            <View style={styles.offerCheck}>
              <Ionicons name="checkmark-circle" size={18} color="#fe2c55" />
              <Text style={styles.offerCheckText}>Code appliqué</Text>
            </View>
          </View>

          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Mode de paiement</Text>
            <View style={styles.cardBrands}>
              <Text style={styles.brand}>VISA</Text>
              <Text style={styles.brand}>MC</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoneyAmount(selected.priceMad, 'MAD')}</Text>
          </View>

          <TouchableOpacity style={styles.rechargeBtn} onPress={goOrderSummary} activeOpacity={0.9}>
            <Text style={styles.rechargeBtnText}>Recharger</Text>
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark" size={14} color="#0a7" />
            <Text style={styles.secureText}>SECURE Payment</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bottomBanner} onPress={() => router.push('/africoin/referral' as never)} activeOpacity={0.9}>
          <Text style={styles.bottomBannerEmoji}>👏</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomBannerTitle}>Invite et obtiens des récompenses</Text>
            <Text style={styles.bottomBannerSub}>Découvre cette nouvelle fonctionnalité !</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </ScrollView>

      {/* Barre latérale flottante type capture */}
      <View style={[styles.fabCol, { bottom: Math.max(24, insets.bottom + 12) }]}>
        <Pressable style={styles.fabMini} onPress={() => setSecureModal(true)}>
          <Ionicons name="lock-closed-outline" size={20} color="#111" />
        </Pressable>
        <Pressable style={styles.fabMini} onPress={() => router.push('/notifications' as never)}>
          <Ionicons name="notifications-outline" size={20} color="#111" />
        </Pressable>
        <Pressable style={styles.fabMini} onPress={() => router.push('/saved-collections' as never)}>
          <Ionicons name="bookmark-outline" size={20} color="#111" />
        </Pressable>
        <Pressable style={styles.fabMini} onPress={() => router.push('/africoin/support' as never)}>
          <Ionicons name="help-circle-outline" size={22} color="#111" />
        </Pressable>
      </View>

      <Modal visible={secureModal} transparent animationType="fade" onRequestClose={() => setSecureModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSecureModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Paiement sécurisé</Text>
            <Text style={styles.modalP}>
              Conformité PCI DSS, détection de transactions suspectes, et authentification renforcée (3‑D Secure) selon
              l’émetteur de ta carte.
            </Text>
            <Text style={styles.modalFoot}>PCI DSS</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSecureModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={customModalVisible} transparent animationType="slide" onRequestClose={() => setCustomModalVisible(false)}>
        <Pressable style={styles.customOverlay} onPress={() => setCustomModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.customKb}>
            <Pressable style={styles.customModalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.customModalTitle}>Montant personnalisé</Text>
              <Text style={styles.customModalHint}>
                Nombre de Pièces ({MIN_CUSTOM_COINS.toLocaleString('fr-FR')} – {MAX_CUSTOM_COINS.toLocaleString('fr-FR')}). Le
                total en MAD est calculé automatiquement.
              </Text>
              <TextInput
                value={customDraft}
                onChangeText={setCustomDraft}
                keyboardType="number-pad"
                placeholder="Ex. 1 200"
                placeholderTextColor="#999"
                style={styles.customInput}
              />
              {(() => {
                const raw = String(customDraft || '').replace(/\s/g, '').replace(/,/g, '.');
                const n = Math.floor(Number.parseFloat(raw));
                if (!Number.isFinite(n) || n < MIN_CUSTOM_COINS) return null;
                if (n > MAX_CUSTOM_COINS) {
                  return <Text style={styles.customPreviewErr}>Montant trop élevé.</Text>;
                }
                return (
                  <Text style={styles.customPreview}>
                    Total indicatif : {formatMoneyAmount(priceMadForCoinCount(n), 'MAD')} pour {n.toLocaleString('fr-FR')} Pièces
                  </Text>
                );
              })()}
              <View style={styles.customBtnRow}>
                <TouchableOpacity style={styles.customBtnGhost} onPress={() => setCustomModalVisible(false)}>
                  <Text style={styles.customBtnGhostText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customBtnPrimary} onPress={applyCustomAmount}>
                  <Text style={styles.customBtnPrimaryText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e8eaed' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: FontSizes.lg, fontWeight: '800', color: '#111' },
  historyLink: { minWidth: 72, alignItems: 'flex-end' },
  historyLinkText: { color: '#fe2c55', fontWeight: '700', fontSize: 13 },
  scroll: { padding: Spacing.md, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarPh: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 15, fontWeight: '700', color: '#111' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  balanceNum: { fontSize: 18, fontWeight: '900', color: '#111', marginLeft: 4 },
  referralBox: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  referralTitle: { fontWeight: '800', color: '#111', marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 16, fontWeight: '800', color: '#111' },
  copyBtn: { padding: 8 },
  promoHint: { fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  packCell: {
    width: '31%',
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  packCellOn: { borderColor: '#fe2c55', backgroundColor: '#fff5f6' },
  packCellMuted: { borderStyle: 'dashed' },
  customSummary: { fontSize: 13, color: '#333', marginBottom: 10, lineHeight: 18 },
  customSummaryHint: { fontSize: 11, color: '#666', fontWeight: '600' },
  packCoins: { marginTop: 6, fontWeight: '900', color: '#111', fontSize: 15 },
  packPrice: { marginTop: 2, fontSize: 12, color: '#444', fontWeight: '600' },
  offerBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe0e5',
    backgroundColor: '#fff8f9',
    padding: 12,
    marginBottom: 14,
  },
  offerTitle: { fontWeight: '900', color: '#111', marginBottom: 6 },
  offerBody: { fontSize: 13, color: '#444', lineHeight: 18 },
  offerCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  offerCheckText: { fontSize: 13, fontWeight: '700', color: '#fe2c55' },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  payLabel: { fontWeight: '700', color: '#111' },
  cardBrands: { flexDirection: 'row', gap: 8 },
  brand: { fontSize: 11, fontWeight: '900', color: '#1a1f71', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ddd', borderRadius: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111' },
  totalValue: { fontSize: 16, fontWeight: '900', color: '#111' },
  rechargeBtn: {
    backgroundColor: '#fe2c55',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rechargeBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  secureText: { fontSize: 11, fontWeight: '800', color: '#0a7', letterSpacing: 0.5 },
  bottomBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bottomBannerEmoji: { fontSize: 22 },
  bottomBannerTitle: { fontWeight: '900', color: '#111' },
  bottomBannerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  fabCol: { position: 'absolute', right: 8, gap: 10, zIndex: 30 },
  fabMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
    }),
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10, color: '#111' },
  modalP: { fontSize: 14, color: '#444', lineHeight: 20 },
  modalFoot: { marginTop: 14, fontWeight: '800', color: '#666' },
  modalClose: { marginTop: 16, alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  modalCloseText: { color: '#fe2c55', fontWeight: '800' },
  customOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  customKb: { width: '100%' },
  customModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  customModalTitle: { fontSize: 18, fontWeight: '900', color: '#111', marginBottom: 8 },
  customModalHint: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 12 },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  customPreview: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 16 },
  customPreviewErr: { fontSize: 14, fontWeight: '700', color: '#c00', marginBottom: 16 },
  customBtnRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  customBtnGhost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  customBtnGhostText: { fontWeight: '800', color: '#333' },
  customBtnPrimary: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10, backgroundColor: '#fe2c55' },
  customBtnPrimaryText: { fontWeight: '900', color: '#fff' },
});
