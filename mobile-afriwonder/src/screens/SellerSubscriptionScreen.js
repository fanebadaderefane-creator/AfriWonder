import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SellerSubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [orangeMoneyPhone, setOrangeMoneyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tiers, setTiers] = useState([]);
  const [currentTierId, setCurrentTierId] = useState('free');
  const [currentTierLabel, setCurrentTierLabel] =
    useState('Gratuit');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const prof = await api.sellerProfile
          .getMe()
          .catch(() => null);
        if (cancelled) return;
        setProfile(prof);
        const tierId =
          prof?.subscription_tier || 'free';
        setCurrentTierId(tierId);
        const all = await import('../utils/sellerTiers').catch(
          () => null,
        );
        if (!all) {
          setTiers([]);
          setCurrentTierLabel(tierId);
          return;
        }
        const SELLER_TIERS = all.SELLER_TIERS || {};
        const mapped = Object.values(SELLER_TIERS);
        setTiers(mapped);
        const current =
          mapped.find((t) => t.id === tierId) ||
          mapped.find((t) => t.id === 'free');
        if (current) setCurrentTierLabel(current.label);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const chooseTier = async (tier) => {
    if (!profile || submitting) return;
    if (tier.id === 'free') {
      setSubmitting(true);
      try {
        await api.sellerProfile.update({
          subscription_tier: 'free',
        });
        setCurrentTierId('free');
        setCurrentTierLabel(tier.label);
        setSelectedTier(null);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!selectedTier || selectedTier.id !== tier.id) {
      setSelectedTier(tier);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        payment_method: paymentMethod || 'wallet',
      };
      if (paymentMethod === 'orange_money') {
        payload.orange_money_phone = orangeMoneyPhone;
      }
      const res = await api.sellerSubscription.subscribe(
        tier.id,
        payload,
      );
      if (res?.paymentUrl) {
        // mobile browser open
      }
      setCurrentTierId(tier.id);
      setCurrentTierLabel(tier.label);
      setSelectedTier(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.emptyText}>
          Vous devez créer un compte vendeur d’abord.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Formules vendeurs
          </Text>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.currentText}>
            Formule actuelle :
          </Text>
          <Text style={styles.currentBadge}>
            {currentTierLabel}
          </Text>
        </View>

        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTierId;
          const isFree = tier.id === 'free';
          const isSelected =
            selectedTier && selectedTier.id === tier.id;
          return (
            <View
              key={tier.id}
              style={[
                styles.tierCard,
                isCurrent && styles.tierCardCurrent,
              ]}
            >
              <View style={styles.tierHeader}>
                <View style={styles.tierTitleRow}>
                  <Ionicons
                    name={
                      tier.id === 'enterprise'
                        ? 'flash-outline'
                        : 'storefront-outline'
                    }
                    size={18}
                    color="#f97316"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.tierTitle}>
                    {tier.label}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={styles.currentPill}>
                    <Text style={styles.currentPillText}>
                      Actuel
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.priceText}>
                {tier.priceFcfa === 0
                  ? 'Gratuit'
                  : `${tier.priceFcfa.toLocaleString(
                      'fr-FR',
                    )} FCFA/mois`}
              </Text>
              <View style={styles.features}>
                <Text style={styles.featureText}>
                  •{' '}
                  {tier.maxProducts === -1
                    ? 'Produits illimités'
                    : `${tier.maxProducts} produits max`}
                </Text>
                <Text style={styles.featureText}>
                  • Commission {tier.commissionPercent}%
                </Text>
                {tier.features.map((f, i) => (
                  <Text key={i} style={styles.featureText}>
                    • {f}
                  </Text>
                ))}
              </View>
              {!isCurrent && (
                <View style={styles.tierActions}>
                  {!isFree && isSelected ? (
                    <>
                      <View style={styles.payRow}>
                        <TouchableOpacity
                          style={[
                            styles.methodChip,
                            paymentMethod === 'wallet' &&
                              styles.methodChipActive,
                          ]}
                          onPress={() =>
                            setPaymentMethod('wallet')
                          }
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={16}
                            color={
                              paymentMethod === 'wallet'
                                ? '#ffffff'
                                : '#111827'
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.methodChipText,
                              paymentMethod === 'wallet' &&
                                styles.methodChipTextActive,
                            ]}
                          >
                            Wallet
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.methodChip,
                            paymentMethod ===
                              'orange_money' &&
                              styles.methodChipActive,
                          ]}
                          onPress={() =>
                            setPaymentMethod('orange_money')
                          }
                        >
                          <Ionicons
                            name="phone-portrait-outline"
                            size={16}
                            color={
                              paymentMethod ===
                              'orange_money'
                                ? '#ffffff'
                                : '#111827'
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.methodChipText,
                              paymentMethod ===
                                'orange_money' &&
                                styles.methodChipTextActive,
                            ]}
                          >
                            OM
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {paymentMethod === 'orange_money' && (
                        <TextInput
                          style={styles.input}
                          keyboardType="phone-pad"
                          placeholder="Numéro Orange Money"
                          placeholderTextColor="#9ca3af"
                          value={orangeMoneyPhone}
                          onChangeText={setOrangeMoneyPhone}
                        />
                      )}
                      <View style={styles.tierButtonsRow}>
                        <TouchableOpacity
                          style={[
                            styles.primaryBtn,
                            (submitting ||
                              (paymentMethod ===
                                'orange_money' &&
                                orangeMoneyPhone.trim()
                                  .length < 8)) &&
                              styles.primaryBtnDisabled,
                          ]}
                          disabled={
                            submitting ||
                            (paymentMethod ===
                              'orange_money' &&
                              orangeMoneyPhone.trim()
                                .length < 8)
                          }
                          onPress={() => chooseTier(tier)}
                        >
                          {submitting ? (
                            <ActivityIndicator
                              size="small"
                              color="#ffffff"
                            />
                          ) : (
                            <Text
                              style={styles.primaryBtnText}
                            >
                              Payer{' '}
                              {tier.priceFcfa.toLocaleString(
                                'fr-FR',
                              )}{' '}
                              FCFA
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() =>
                            setSelectedTier(null)
                          }
                        >
                          <Text
                            style={styles.secondaryBtnText}
                          >
                            Annuler
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        submitting &&
                          styles.primaryBtnDisabled,
                      ]}
                      disabled={submitting}
                      onPress={() => chooseTier(tier)}
                    >
                      {submitting ? (
                        <ActivityIndicator
                          size="small"
                          color="#ffffff"
                        />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          {isFree
                            ? 'Passer au gratuit'
                            : `S'abonner (${tier.priceFcfa.toLocaleString(
                                'fr-FR',
                              )} FCFA/mois)`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footerHint}>
          Phase 1 : Abonnements uniquement (0% commission). Gratuit
          : 10 produits · Formules payantes : plus de produits et
          meilleure visibilité.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  currentCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentText: {
    fontSize: 13,
    color: '#1d4ed8',
  },
  currentBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  tierCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tierCardCurrent: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  currentPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  currentPillText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  priceText: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#f97316',
  },
  features: {
    marginTop: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#4b5563',
  },
  tierActions: {
    marginTop: 10,
  },
  payRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  methodChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodChipText: {
    fontSize: 12,
    color: '#111827',
  },
  methodChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
  },
  tierButtonsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  footerHint: {
    marginTop: 10,
    marginHorizontal: 16,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});

