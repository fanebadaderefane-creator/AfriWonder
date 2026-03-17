import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

export default function SellerPromotionsScreen({ navigation }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [promoData, setPromoData] = useState({
    product_id: '',
    type: 'discount',
    discount_percentage: 10,
    budget: 5000,
    duration: 7,
  });

  const [loyaltyForm, setLoyaltyForm] = useState({
    points_per_purchase: 1,
    reward_threshold: 100,
    reward_type: 'discount',
    reward_value: 10,
    is_active: true,
  });
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [prods, promos, loyaltyData] = await Promise.all([
          api.products.list({ seller_id: user.id }).catch(() => []),
          api.entities.ProductPromotion.filter(
            { seller_id: user.id },
            '-created_date',
            50,
          ).catch(() => []),
          api.seller.getLoyalty().catch(() => null),
        ]);
        if (cancelled) return;
        const pArr = Array.isArray(prods)
          ? prods
          : prods?.products ?? [];
        setProducts(pArr);
        setPromotions(Array.isArray(promos) ? promos : []);
        setLoyalty(loyaltyData || null);
        if (loyaltyData) {
          setLoyaltyForm({
            points_per_purchase:
              loyaltyData.points_per_purchase ?? 1,
            reward_threshold:
              loyaltyData.reward_threshold ?? 100,
            reward_type:
              loyaltyData.reward_type ?? 'discount',
            reward_value:
              loyaltyData.reward_value ?? 10,
            is_active: !!loyaltyData.is_active,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = {
    active: promotions.filter((p) => p.is_active).length,
    totalImpressions: promotions.reduce(
      (s, p) => s + (p.impressions || 0),
      0,
    ),
  };

  const saveLoyalty = async () => {
    if (!user?.id || savingLoyalty) return;
    setSavingLoyalty(true);
    try {
      await api.seller.updateLoyalty(loyaltyForm);
    } finally {
      setSavingLoyalty(false);
    }
  };

  const createPromotion = async () => {
    if (!promoData.product_id || creating) return;
    const product = products.find(
      (p) => p.id === promoData.product_id,
    );
    if (!product) return;
    setCreating(true);
    try {
      const starts_at = new Date();
      const ends_at = new Date();
      ends_at.setDate(
        ends_at.getDate() +
          parseInt(String(promoData.duration), 10),
      );
      const data = {
        product_id: promoData.product_id,
        seller_id: user.id,
        type: promoData.type,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        is_active: true,
      };
      if (promoData.type === 'discount') {
        data.discount_percentage =
          Number(promoData.discount_percentage) || 0;
        data.original_price = product.price;
        data.promo_price =
          product.price *
          (1 - data.discount_percentage / 100);
      } else if (promoData.type === 'sponsored') {
        data.budget = Number(promoData.budget) || 0;
      }
      await api.entities.ProductPromotion.create(data);
      const updates = {};
      if (promoData.type === 'featured') {
        updates.is_featured = true;
      }
      if (promoData.type === 'sponsored') {
        updates.is_sponsored = true;
      }
      if (Object.keys(updates).length > 0) {
        await api.products.update(product.id, updates);
      }
      const promos =
        (await api.entities.ProductPromotion.filter(
          { seller_id: user.id },
          '-created_date',
          50,
        )) || [];
      setPromotions(Array.isArray(promos) ? promos : []);
      setShowCreate(false);
      setPromoData({
        product_id: '',
        type: 'discount',
        discount_percentage: 10,
        budget: 5000,
        duration: 7,
      });
    } finally {
      setCreating(false);
    }
  };

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promotions</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons
            name="add-outline"
            size={20}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="flash-outline"
                size={16}
                color="#f97316"
              />
            </View>
            <Text style={styles.statLabel}>Actives</Text>
            <Text style={styles.statValue}>
              {stats.active}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="eye-outline"
                size={16}
                color="#3b82f6"
              />
            </View>
            <Text style={styles.statLabel}>Vues</Text>
            <Text style={styles.statValue}>
              {stats.totalImpressions}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="gift-outline"
              size={18}
              color="#f59e0b"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.sectionTitle}>
              Programme fidélité
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Points par achat et récompense au seuil.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>
              Points par 1000 FCFA d'achat
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(
                loyaltyForm.points_per_purchase,
              )}
              onChangeText={(v) =>
                setLoyaltyForm((f) => ({
                  ...f,
                  points_per_purchase:
                    parseFloat(v) || 0,
                }))
              }
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Seuil pour récompense (points)
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(loyaltyForm.reward_threshold)}
              onChangeText={(v) =>
                setLoyaltyForm((f) => ({
                  ...f,
                  reward_threshold:
                    parseInt(v, 10) || 100,
                }))
              }
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              Récompense : réduction (%)
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(loyaltyForm.reward_value)}
              onChangeText={(v) =>
                setLoyaltyForm((f) => ({
                  ...f,
                  reward_value:
                    parseFloat(v) || 0,
                }))
              }
            />
          </View>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() =>
              setLoyaltyForm((f) => ({
                ...f,
                is_active: !f.is_active,
              }))
            }
          >
            <View
              style={[
                styles.checkbox,
                loyaltyForm.is_active &&
                  styles.checkboxChecked,
              ]}
            >
              {loyaltyForm.is_active && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#ffffff"
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              Programme actif
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              savingLoyalty && styles.primaryBtnDisabled,
            ]}
            disabled={savingLoyalty}
            onPress={saveLoyalty}
          >
            {savingLoyalty ? (
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />
            ) : (
              <Text style={styles.primaryBtnText}>
                Enregistrer
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Promotions
          </Text>
          {promotions.length === 0 ? (
            <View style={styles.emptyPromo}>
              <Ionicons
                name="flash-outline"
                size={40}
                color="#d1d5db"
              />
              <Text style={styles.emptyText}>
                Aucune promotion
              </Text>
            </View>
          ) : (
            promotions.map((promo) => {
              const product = products.find(
                (p) => p.id === promo.product_id,
              );
              return (
                <View key={promo.id} style={styles.promoCard}>
                  <View style={styles.promoHeader}>
                    <Text
                      style={styles.promoTitle}
                      numberOfLines={1}
                    >
                      {product?.name || 'Produit'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        promo.is_active
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={styles.statusBadgeText}
                      >
                        {promo.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.promoRow}>
                    <Text style={styles.promoMeta}>
                      Type:{' '}
                      {promo.type === 'discount'
                        ? 'Réduction'
                        : promo.type === 'featured'
                        ? 'Mise en avant'
                        : 'Sponsorisé'}
                    </Text>
                    {promo.type === 'discount' &&
                      promo.discount_percentage !=
                        null && (
                        <Text
                          style={styles.promoDiscount}
                        >
                          -{promo.discount_percentage}%
                        </Text>
                      )}
                  </View>
                  <View style={styles.promoStatsRow}>
                    <Text style={styles.promoStat}>
                      Clics:{' '}
                      {promo.clicks || 0}
                    </Text>
                    <Text style={styles.promoStat}>
                      Vues:{' '}
                      {promo.impressions || 0}
                    </Text>
                    {promo.type === 'sponsored' && (
                      <Text style={styles.promoStat}>
                        Budget restant:{' '}
                        {(promo.budget -
                          (promo.spent || 0)
                        ).toLocaleString('fr-FR')}{' '}
                        FCFA
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {showCreate && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nouvelle promotion
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Produit</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.productChips}
                >
                  {products.map((p) => {
                    const active =
                      promoData.product_id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.prodChip,
                          active &&
                            styles.prodChipActive,
                        ]}
                        onPress={() =>
                          setPromoData((d) => ({
                            ...d,
                            product_id: p.id,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.prodChipText,
                            active &&
                              styles.prodChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Type de promotion
                </Text>
                <View style={styles.methodRow}>
                  {[
                    ['discount', 'Réduction'],
                    ['featured', 'Mise en avant'],
                    ['sponsored', 'Sponsorisé'],
                  ].map(([val, label]) => {
                    const active =
                      promoData.type === val;
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.methodChip,
                          active &&
                            styles.methodChipActive,
                        ]}
                        onPress={() =>
                          setPromoData((d) => ({
                            ...d,
                            type: val,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            active &&
                              styles.methodChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {promoData.type === 'discount' && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Pourcentage de réduction
                  </Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(
                      promoData.discount_percentage,
                    )}
                    onChangeText={(v) =>
                      setPromoData((d) => ({
                        ...d,
                        discount_percentage:
                          parseFloat(v) || 0,
                      }))
                    }
                  />
                </View>
              )}
              {promoData.type === 'sponsored' && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Budget (FCFA)
                  </Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(promoData.budget)}
                    onChangeText={(v) =>
                      setPromoData((d) => ({
                        ...d,
                        budget: parseFloat(v) || 0,
                      }))
                    }
                  />
                  <Text style={styles.hintText}>
                    Coût par clic approximatif ~50 FCFA
                  </Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>
                  Durée (jours)
                </Text>
                <View style={styles.methodRow}>
                  {[3, 7, 14, 30].map((d) => {
                    const active =
                      Number(promoData.duration) === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.methodChip,
                          active &&
                            styles.methodChipActive,
                        ]}
                        onPress={() =>
                          setPromoData((p) => ({
                            ...p,
                            duration: d,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            active &&
                              styles.methodChipTextActive,
                          ]}
                        >
                          {d} j
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (creating ||
                  !promoData.product_id) &&
                  styles.primaryBtnDisabled,
              ]}
              disabled={creating || !promoData.product_id}
              onPress={createPromotion}
            >
              {creating ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Lancer la promotion
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  createBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  field: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkboxChecked: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#374151',
  },
  primaryBtn: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#f97316',
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
  emptyPromo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
  },
  promoCard: {
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeInactive: {
    backgroundColor: '#e5e7eb',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#111827',
  },
  promoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  promoMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  promoDiscount: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  promoStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  promoStat: {
    fontSize: 11,
    color: '#4b5563',
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  productChips: {
    paddingVertical: 4,
  },
  prodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 6,
  },
  prodChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  prodChipText: {
    fontSize: 12,
    color: '#374151',
  },
  prodChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  methodChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  methodChipText: {
    fontSize: 12,
    color: '#374151',
  },
  methodChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

