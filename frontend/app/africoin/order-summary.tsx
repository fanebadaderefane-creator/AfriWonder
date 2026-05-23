import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { formatMoneyAmount } from '../../src/utils/formatMoney';
import { useAuthStore } from '../../src/store/authStore';
import { CreatorAvatar } from '../../src/components/CreatorAvatar';

export default function AfricoinOrderSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { coins, priceMad, username } = useLocalSearchParams<{
    coins?: string | string[];
    priceMad?: string | string[];
    username?: string | string[];
  }>();

  const c = Number(Array.isArray(coins) ? coins[0] : coins);
  const price = Number(Array.isArray(priceMad) ? priceMad[0] : priceMad);
  const uname = String(Array.isArray(username) ? username[0] : username || '').replace(/^@+/, '');

  const { user } = useAuthStore();
  const displayName = useMemo(() => {
    const fn = (user?.full_name || '').trim().split(/\s+/)[0];
    return uname || fn || user?.username || 'Compte';
  }, [uname, user?.full_name, user?.username]);

  const priceLabel = Number.isFinite(price) ? formatMoneyAmount(price, 'MAD') : '—';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résumé de la commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.shieldRow}>
          <Ionicons name="shield-checkmark" size={16} color="#0a7" />
          <Text style={styles.shieldText}>Tes informations sont privées et conservées en sécurité</Text>
        </View>

        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.accountRow}>
          {user ? (
            <CreatorAvatar
              uri={user.profile_image}
              username={user.username}
              firstName={displayName}
              lastName=""
              size={40}
              bordered={false}
            />
          ) : (
            <View style={styles.avatarPh}>
              <Ionicons name="person" size={20} color="#666" />
            </View>
          )}
          <Text style={styles.accountName}>{uname ? `@${uname}` : displayName}</Text>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.totalWord}>Total</Text>
            <Text style={styles.totalMoney}>{priceLabel}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <Text style={styles.lineLabel}>{Number.isFinite(c) ? `${c} Pièces` : 'Pièces'}</Text>
            <Text style={styles.lineMoney}>{priceLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Mode de paiement</Text>
        <TouchableOpacity style={styles.payCard} activeOpacity={0.9} onPress={() => router.push('/wallet/coins' as never)}>
          <View style={styles.radio} />
          <Text style={styles.payText}>Ajouter une carte de crédit ou de débit</Text>
          <View style={styles.brands}>
            <Text style={styles.brand}>VISA</Text>
            <Text style={styles.brand}>MC</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.legal}>
          En cliquant sur « Payer maintenant », tu acceptes la politique relative aux articles virtuels. Les remboursements
          peuvent être limités après livraison des Pièces.
        </Text>
        <Text style={styles.legal}>
          Pour confirmer le prix applicable, AfriWonder peut détecter ta région (ex. Maroc) — ajustement automatique à
          terme.
        </Text>

        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#0a7" />
          <Text style={styles.secureBadgeText}>SECURE Payment</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() =>
            Alert.alert(
              'Paiement',
              'Branchement complet : redirection vers le parcours AfriWonder (Orange Money / Wave) depuis l’écran Coins existant.',
              [{ text: 'OK', onPress: () => router.push('/wallet/coins' as never) }]
            )
          }
        >
          <Text style={styles.payBtnText}>Payer maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: FontSizes.lg, color: '#111' },
  body: { padding: Spacing.lg, paddingBottom: 100 },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  shieldText: { flex: 1, fontSize: 12, color: '#2a7', fontWeight: '600' },
  sectionLabel: { fontWeight: '800', color: '#111', marginBottom: 8, marginTop: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatarPh: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 16, fontWeight: '800', color: '#111' },
  totalCard: {
    backgroundColor: '#fafafa',
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 18,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalWord: { fontSize: 17, fontWeight: '900', color: '#111' },
  totalMoney: { fontSize: 17, fontWeight: '900', color: '#111' },
  lineLabel: { fontSize: 14, color: '#444' },
  lineMoney: { fontSize: 14, fontWeight: '800', color: '#111' },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#bbb' },
  payText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111' },
  brands: { flexDirection: 'row', gap: 6 },
  brand: { fontSize: 10, fontWeight: '900', color: '#1a1f71', paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#ddd', borderRadius: 4 },
  legal: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 10 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginTop: 8 },
  secureBadgeText: { fontSize: 11, fontWeight: '800', color: '#0a7' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { height: -1, width: 0 } }, android: {} }),
  },
  payBtn: {
    backgroundColor: '#ffb4c0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
