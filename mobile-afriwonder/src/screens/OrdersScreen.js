import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  pending: { label: 'En attente', colorBg: '#f3f4f6', colorText: '#4b5563', icon: 'time' },
  pending_payment: { label: 'Paiement en attente', colorBg: '#f3f4f6', colorText: '#4b5563', icon: 'time' },
  paid: { label: 'Payé', colorBg: '#fef3c7', colorText: '#92400e', icon: 'checkmark-circle' },
  processing: { label: 'En cours', colorBg: '#ffedd5', colorText: '#c2410c', icon: 'cube' },
  preparing: { label: 'En préparation', colorBg: '#fef3c7', colorText: '#92400e', icon: 'cube' },
  completed: { label: 'Terminé', colorBg: '#dcfce7', colorText: '#166534', icon: 'checkmark-circle' },
  cancelled: { label: 'Annulé', colorBg: '#fee2e2', colorText: '#b91c1c', icon: 'close-circle' },
  in_transit: { label: 'Expédié', colorBg: '#ffedd5', colorText: '#c2410c', icon: 'car' },
  delivered: { label: 'Livré', colorBg: '#dcfce7', colorText: '#166534', icon: 'checkmark-circle' },
  refunded: { label: 'Remboursé', colorBg: '#fef3c7', colorText: '#92400e', icon: 'refresh' },
};

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreorders, setLoadingPreorders] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await api.orders.list({ page: 1, limit: 100 });
        if (!cancelled) {
          const list = res?.orders ?? res ?? [];
          setOrders(Array.isArray(list) ? list : []);
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

  useEffect(() => {
    if (!user || activeTab !== 'preorders') return;
    let cancelled = false;
    const loadPre = async () => {
      try {
        setLoadingPreorders(true);
        const res = await api.products
          ?.getPreordersMe?.({ page: 1, limit: 50 })
          .catch(() => null);
        if (!cancelled) {
          const list =
            res?.preorders ??
            res?.data?.preorders ??
            (Array.isArray(res) ? res : []);
          setPreorders(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoadingPreorders(false);
      }
    };
    loadPre();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activeTab]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'preorders') return false;
    if (activeTab === 'in_progress') {
      return [
        'pending',
        'pending_payment',
        'paid',
        'processing',
        'preparing',
      ].includes(order.status);
    }
    if (activeTab === 'shipped') {
      return ['in_transit'].includes(order.status);
    }
    if (activeTab === 'delivered') {
      return ['delivered', 'completed', 'refunded'].includes(order.status);
    }
    return true;
  });

  const renderOrder = ({ item, index }) => {
    const firstItem = item.items?.[0];
    const product = firstItem?.product;
    const productImage = product?.images?.[0];
    const productName = product?.name || 'Commande';
    const totalQty =
      item.items?.reduce(
        (s, i) => s + (i.quantity || 0),
        0,
      ) || 0;
    const status = statusConfig[item.status] || statusConfig.pending;
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('OrderTracking', { orderId: item.id })
        }
      >
        <View style={styles.orderTop}>
          {productImage ? (
            <Image
              source={{ uri: productImage }}
              style={styles.orderImage}
            />
          ) : (
            <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
              <Ionicons name="cube-outline" size={28} color="#9ca3af" />
            </View>
          )}
          <View style={styles.orderMain}>
            <Text style={styles.orderTitle} numberOfLines={2}>
              {productName}
              {item.items?.length > 1
                ? ` +${item.items.length - 1}`
                : ''}
            </Text>
            <Text style={styles.orderMeta}>
              Quantité: {totalQty}
            </Text>
            <Text style={styles.orderAmount}>
              {item.total_amount?.toLocaleString('fr-FR')} FCFA
            </Text>
            <View style={styles.orderStatusRow}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: status.colorBg },
                ]}
              >
                <Ionicons
                  name={status.icon}
                  size={12}
                  color={status.colorText}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: status.colorText },
                  ]}
                >
                  {status.label}
                </Text>
              </View>
              <Text style={styles.orderDate}>
                {new Date(
                  item.created_at || item.created_date,
                ).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() =>
              navigation.navigate('OrderTracking', { orderId: item.id })
            }
          >
            <Ionicons
              name="eye-outline"
              size={16}
              color="#111827"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.orderBtnText}>Détails</Text>
          </TouchableOpacity>
          {product?.seller_id && (
            <TouchableOpacity
              style={styles.orderBtnOutline}
              onPress={() =>
                navigation.navigate('Chat', {
                  userId: product.seller_id,
                  orderId: item.id,
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#2563eb"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.orderBtnOutlineText}>
                Contacter
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPreorder = (po) => {
    const p = po.product;
    const img = p?.images?.[0];
    const availableAt = p?.preorder_available_at
      ? new Date(p.preorder_available_at).toLocaleDateString(
          'fr-FR',
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          },
        )
      : null;
    const totalPrice =
      (p?.price || 0) * (po.quantity || 0);
    return (
      <View key={po.id} style={styles.orderCard}>
        <View style={styles.orderTop}>
          {img ? (
            <Image source={{ uri: img }} style={styles.orderImage} />
          ) : (
            <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
              <Ionicons name="cube-outline" size={28} color="#9ca3af" />
            </View>
          )}
          <View style={styles.orderMain}>
            <Text style={styles.orderTitle} numberOfLines={2}>
              {p?.name}
            </Text>
            <Text style={styles.orderMeta}>
              Quantité: {po.quantity}
            </Text>
            <Text style={styles.orderAmount}>
              {totalPrice.toLocaleString('fr-FR')} FCFA
            </Text>
            {availableAt && (
              <Text style={styles.preorderDate}>
                Disponible le {availableAt}
              </Text>
            )}
            <View style={styles.preorderBadge}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color="#1d4ed8"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.preorderBadgeText}>
                Précommande — Paiement à la sortie
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const tabs = [
    ['all', 'Toutes'],
    ['preorders', 'Précommandes'],
    ['in_progress', 'En cours'],
    ['shipped', 'Expédiées'],
    ['delivered', 'Livrées'],
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes commandes</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(([key, label]) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[
                styles.tabChip,
                active && styles.tabChipActive,
              ]}
            >
              <Text
                style={[
                  styles.tabChipText,
                  active && styles.tabChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeTab === 'preorders' ? (
        loadingPreorders ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : preorders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="calendar-outline"
              size={52}
              color="#d1d5db"
            />
            <Text style={styles.emptyTitle}>Aucune précommande</Text>
            <Text style={styles.emptyText}>
              Réservez un produit pas encore disponible ; paiement à
              la sortie.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.listContent}
          >
            {preorders.map((po) => renderPreorder(po))}
          </ScrollView>
        )
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cube-outline" size={52} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore passé de commande.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  tabsScroll: {
    maxHeight: 48,
    backgroundColor: '#ffffff',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  tabChipActive: {
    backgroundColor: '#f97316',
  },
  tabChipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  tabChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderTop: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  orderImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  orderImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderMain: {
    flex: 1,
    marginLeft: 10,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  orderMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  orderAmount: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  orderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  orderActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  orderBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  orderBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  orderBtnOutlineText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
  },
  preorderDate: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  preorderBadge: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 999,
  },
  preorderBadgeText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '600',
  },
});

