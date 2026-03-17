import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

const statusConfig = {
  pending: { label: 'Paiement en attente' },
  pending_payment: { label: 'Paiement en attente' },
  paid: { label: 'Payé' },
  processing: { label: 'En préparation' },
  preparing: { label: 'En préparation' },
  in_transit: { label: 'Expédié' },
  delivered: { label: 'Livré' },
  completed: { label: 'Terminé' },
  cancelled: { label: 'Annulé' },
};

const CARRIERS = [
  { value: 'dhl_mali', label: 'DHL Mali' },
  { value: 'moto', label: 'Livraison moto (local)' },
  { value: 'chronopost', label: 'Chronopost' },
  { value: 'societe_transport_mali', label: 'Société transport Mali' },
  { value: 'tcr_mali', label: 'TCR Mali' },
  { value: 'laposte', label: 'La Poste / Colissimo' },
  { value: 'autre', label: 'Autre transporteur' },
};

export default function SellerOrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [shipmentModal, setShipmentModal] = useState(null);
  const [shipmentForm, setShipmentForm] = useState({
    carrier: 'dhl_mali',
    tracking_number: '',
  });

  const [rateModal, setRateModal] = useState(null);
  const [rateForm, setRateForm] = useState({
    rating: 5,
    content: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.orders
          .list({ as: 'seller', page: 1, limit: 100 })
          .catch(() => null);
        if (!cancelled) {
          const list = res?.orders ?? res?.data?.orders ?? [];
          setOrders(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'pending')
      return (
        order.status === 'pending' ||
        order.status === 'pending_payment'
      );
    if (activeTab === 'preparing')
      return ['paid', 'processing', 'preparing'].includes(
        order.status,
      );
    if (activeTab === 'shipped')
      return (
        order.status === 'in_transit' || !!order.shipping
      );
    if (activeTab === 'delivered')
      return ['delivered', 'completed'].includes(order.status);
    return true;
  });

  const tabCounts = {
    pending: orders.filter(
      (o) =>
        o.status === 'pending' ||
        o.status === 'pending_payment',
    ).length,
    preparing: orders.filter((o) =>
      ['paid', 'processing', 'preparing'].includes(o.status),
    ).length,
    shipped: orders.filter(
      (o) => o.status === 'in_transit' || !!o.shipping,
    ).length,
    delivered: orders.filter((o) =>
      ['delivered', 'completed'].includes(o.status),
    ).length,
  };

  const canShip = (order) => {
    if (order.shipping) return false;
    const paid = ['escrow', 'paid'].includes(order.payment_status);
    const ready = ['paid', 'processing', 'preparing'].includes(
      order.status,
    );
    return paid && ready;
  };

  const canRateBuyer = (order) => {
    const delivered = ['delivered', 'completed'].includes(
      order.status,
    );
    const notYetRated = !order.buyer_reviews?.length;
    return delivered && notYetRated;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (updating) return;
    setUpdating(true);
    try {
      await api.orders.updateStatus(orderId, newStatus);
      const res = await api.orders.list({
        as: 'seller',
        page: 1,
        limit: 100,
      });
      const list = res?.orders ?? res?.data?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
    } finally {
      setUpdating(false);
    }
  };

  const createShipment = async () => {
    if (!shipmentModal || updating) return;
    const { orderId } = shipmentModal;
    setUpdating(true);
    try {
      await api.shipments.create({
        order_id: orderId,
        carrier: shipmentForm.carrier,
        tracking_number:
          shipmentForm.tracking_number.trim() || undefined,
      });
      const res = await api.orders.list({
        as: 'seller',
        page: 1,
        limit: 100,
      });
      const list = res?.orders ?? res?.data?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
      setShipmentModal(null);
      setShipmentForm({
        carrier: 'dhl_mali',
        tracking_number: '',
      });
    } finally {
      setUpdating(false);
    }
  };

  const rateBuyer = async () => {
    if (!rateModal || updating) return;
    const { orderId } = rateModal;
    setUpdating(true);
    try {
      await api.orderReviews.rateBuyer(orderId, {
        rating: rateForm.rating,
        content: rateForm.content || undefined,
      });
      const res = await api.orders.list({
        as: 'seller',
        page: 1,
        limit: 100,
      });
      const list = res?.orders ?? res?.data?.orders ?? [];
      setOrders(Array.isArray(list) ? list : []);
      setRateModal(null);
      setRateForm({ rating: 5, content: '' });
    } finally {
      setUpdating(false);
    }
  };

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#3b82f6" />
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
        <Text style={styles.headerTitle}>Mes ventes</Text>
      </View>

      <View style={styles.tabsRow}>
        {[
          ['pending', 'À traiter'],
          ['preparing', 'En cours'],
          ['shipped', 'Expédiées'],
          ['delivered', 'Livrées'],
        ].map(([key, label]) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabChip,
                active && styles.tabChipActive,
              ]}
              onPress={() => setActiveTab(key)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  active && styles.tabChipTextActive,
                ]}
              >
                {label} ({tabCounts[key] ?? 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="cube-outline"
            size={52}
            color="#d1d5db"
          />
          <Text style={styles.emptyTitle}>Aucune commande</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const firstItem = item.items?.[0];
            const product = firstItem?.product;
            const buyer = item.user;
            const productName = product?.name || 'Commande';
            const totalAmount = item.total_amount || 0;
            const status =
              statusConfig[item.status] || statusConfig.pending;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Text
                      style={styles.productName}
                      numberOfLines={2}
                    >
                      {productName}
                    </Text>
                    <Text style={styles.buyerName}>
                      Acheteur:{' '}
                      {buyer?.full_name ||
                        buyer?.username ||
                        'Client'}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountValue}>
                    {totalAmount.toLocaleString('fr-FR')} FCFA
                  </Text>
                  {item.shipping?.tracking_number && (
                    <Text style={styles.trackingText}>
                      Suivi:{' '}
                      {item.shipping.tracking_number}
                    </Text>
                  )}
                </View>
                <View style={styles.actionsRow}>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionPrimary,
                      ]}
                      onPress={() =>
                        updateOrderStatus(
                          item.id,
                          'processing',
                        )
                      }
                      disabled={updating}
                    >
                      <Text style={styles.actionPrimaryText}>
                        Accepter / Préparer
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canShip(item) && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionWarning,
                      ]}
                      onPress={() =>
                        setShipmentModal({
                          orderId: item.id,
                        })
                      }
                      disabled={updating}
                    >
                      <Ionicons
                        name="car-outline"
                        size={16}
                        color="#ffffff"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.actionPrimaryText}>
                        Expédier
                      </Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'processing' && !canShip(item) && (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionSuccess,
                      ]}
                      onPress={() =>
                        updateOrderStatus(
                          item.id,
                          'completed',
                        )
                      }
                      disabled={updating}
                    >
                      <Text style={styles.actionPrimaryText}>
                        Marquer terminé
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canRateBuyer(item) && (
                    <TouchableOpacity
                      style={styles.rateBtn}
                      onPress={() =>
                        setRateModal({
                          orderId: item.id,
                          buyerName:
                            buyer?.full_name ||
                            buyer?.username ||
                            'Acheteur',
                        })
                      }
                      disabled={updating}
                    >
                      <Ionicons
                        name="star-outline"
                        size={16}
                        color="#eab308"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.rateBtnText}>
                        Noter l’acheteur
                      </Text>
                    </TouchableOpacity>
                  )}
                  {item.buyer_reviews?.length > 0 && (
                    <Text style={styles.alreadyRated}>
                      Acheteur noté (
                      {item.buyer_reviews[0]?.rating}/5)
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={!!shipmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => !updating && setShipmentModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Créer une expédition
            </Text>
            <Text style={styles.modalText}>
              Transporteur et numéro de suivi. L’acheteur pourra
              suivre sa commande.
            </Text>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>
                Transporteur
              </Text>
              <View style={styles.carrierList}>
                {CARRIERS.map((c) => {
                  const active =
                    shipmentForm.carrier === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[
                        styles.carrierChip,
                        active && styles.carrierChipActive,
                      ]}
                      onPress={() =>
                        setShipmentForm((f) => ({
                          ...f,
                          carrier: c.value,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.carrierChipText,
                          active &&
                            styles.carrierChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>
                Numéro de suivi (optionnel)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: ABC123456789"
                placeholderTextColor="#9ca3af"
                value={shipmentForm.tracking_number}
                onChangeText={(v) =>
                  setShipmentForm((f) => ({
                    ...f,
                    tracking_number: v,
                  }))
                }
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShipmentModal(null)}
                disabled={updating}
              >
                <Text style={styles.modalCancelText}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimary,
                  updating && styles.modalPrimaryDisabled,
                ]}
                onPress={createShipment}
                disabled={updating}
              >
                <Text style={styles.modalPrimaryText}>
                  Créer l’expédition
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!rateModal}
        transparent
        animationType="slide"
        onRequestClose={() => !updating && setRateModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Noter l’acheteur
            </Text>
            <Text style={styles.modalText}>
              Évaluez{' '}
              {rateModal?.buyerName || 'Acheteur'} pour cette
              transaction.
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() =>
                    setRateForm((f) => ({
                      ...f,
                      rating: n,
                    }))
                  }
                >
                  <Text style={styles.starText}>
                    {rateForm.rating >= n ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>
                Commentaire (optionnel)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Excellent acheteur, paiement rapide"
                placeholderTextColor="#9ca3af"
                multiline
                value={rateForm.content}
                onChangeText={(v) =>
                  setRateForm((f) => ({
                    ...f,
                    content: v,
                  }))
                }
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRateModal(null)}
                disabled={updating}
              >
                <Text style={styles.modalCancelText}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimary,
                  updating && styles.modalPrimaryDisabled,
                ]}
                onPress={rateBuyer}
                disabled={updating}
              >
                <Text style={styles.modalPrimaryText}>
                  Envoyer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
    marginBottom: 6,
  },
  tabChipActive: {
    backgroundColor: '#f97316',
  },
  tabChipText: {
    fontSize: 13,
    color: '#374151',
  },
  tabChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  buyerName: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 11,
    color: '#374151',
  },
  amountRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f97316',
  },
  trackingText: {
    fontSize: 11,
    color: '#6b7280',
  },
  actionsRow: {
    marginTop: 8,
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  actionPrimary: {
    backgroundColor: '#2563eb',
  },
  actionWarning: {
    backgroundColor: '#fbbf24',
  },
  actionSuccess: {
    backgroundColor: '#16a34a',
  },
  actionPrimaryText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rateBtnText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  alreadyRated: {
    marginTop: 2,
    fontSize: 11,
    color: '#16a34a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  modalField: {
    marginTop: 8,
  },
  modalLabel: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  carrierList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  carrierChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  carrierChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  carrierChipText: {
    fontSize: 12,
    color: '#374151',
  },
  carrierChipTextActive: {
    color: '#1d4ed8',
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
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalPrimary: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalPrimaryDisabled: {
    opacity: 0.7,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  starText: {
    fontSize: 26,
  },
});

