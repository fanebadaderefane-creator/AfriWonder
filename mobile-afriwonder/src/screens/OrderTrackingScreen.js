import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

const STATUS_STEPS = [
  { status: 'pending_payment', label: 'Paiement en attente', icon: 'time-outline' },
  { status: 'paid', label: 'Paiement confirmé', icon: 'checkmark-circle-outline' },
  { status: 'preparing', label: 'En préparation', icon: 'cube-outline' },
  { status: 'in_transit', label: 'Expédié', icon: 'car-outline' },
  { status: 'delivered', label: 'Livré', icon: 'checkmark-circle-outline' },
  { status: 'completed', label: 'Terminé', icon: 'checkmark-circle-outline' },
  { status: 'refunded', label: 'Remboursé', icon: 'refresh-outline' },
];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [orderRaw, setOrderRaw] = useState(null);
  const [shippingTimeline, setShippingTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const [refundVisible, setRefundVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const ord = await api.orders.getById(orderId);
        if (!cancelled) setOrderRaw(ord || null);
        try {
          const tl = await api.shipments
            ?.getTimeline?.(orderId)
            .catch(() => null);
          if (!cancelled) setShippingTimeline(tl || null);
        } catch {
          if (!cancelled) setShippingTimeline(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const order = useMemo(() => {
    if (!orderRaw) return null;
    const first = orderRaw.items?.[0];
    const product = first?.product;
    const shipping = orderRaw.shipping;
    const events = shipping?.tracking_events ?? [];
    return {
      ...orderRaw,
      product_name: product?.name ?? orderRaw.product_name,
      product_image: product?.images?.[0] ?? orderRaw.product_image,
      quantity: first?.quantity ?? orderRaw.quantity ?? 0,
      delivery_address:
        orderRaw.shipping_address ??
        shipping?.shipping_address ??
        orderRaw.delivery_address,
      delivery_phone: orderRaw.delivery_phone ?? '',
      tracking_code:
        shipping?.tracking_number ?? orderRaw.tracking_code,
      tracking_updates: events.length
        ? events.map((e) => ({
            status: e.event_type || e.status,
            message: e.description || e.event_type || '',
            location: e.location,
            timestamp: e.timestamp,
          }))
        : orderRaw.tracking_updates ?? [],
      created_date: orderRaw.created_at ?? orderRaw.created_date,
      payment_status: orderRaw.payment_status ?? 'pending',
    };
  }, [orderRaw]);

  useEffect(() => {
    if (order?.total_amount && !refundAmount) {
      setRefundAmount(String(order.total_amount));
    }
  }, [order?.total_amount, refundAmount]);

  const currentStepIndex = useMemo(() => {
    if (!order) return -1;
    const idx = STATUS_STEPS.findIndex(
      (s) => s.status === order.status,
    );
    return idx === -1 ? 0 : idx;
  }, [order?.status]);

  const confirmDelivery = async () => {
    if (!order || confirmLoading) return;
    setConfirmLoading(true);
    try {
      const trackingUpdates = [
        ...(order.tracking_updates || []),
        {
          status: 'delivered',
          message: "Livraison confirmée par l'acheteur",
          timestamp: new Date().toISOString(),
          location: order.delivery_address,
        },
      ];
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7);
      const updated = await api.orders.updateStatus(orderId, {
        status: 'delivered',
        confirmed_by_buyer: true,
        buyer_confirmation_date: new Date().toISOString(),
        tracking_updates: trackingUpdates,
        payment_status: 'released_to_seller',
        escrow_release_date: releaseDate.toISOString(),
      });
      setOrderRaw(updated || orderRaw);
      setRatingVisible(true);
    } catch {
      setConfirmLoading(false);
    } finally {
      setConfirmLoading(false);
    }
  };

  const submitRating = async () => {
    if (!order || updateLoading) return;
    setUpdateLoading(true);
    try {
      const updated = await api.orders.updateStatus(orderId, {
        seller_rating: rating,
        seller_review: review,
        status: 'completed',
      });
      setOrderRaw(updated || orderRaw);
      setRatingVisible(false);
    } catch {
      setUpdateLoading(false);
    } finally {
      setUpdateLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!order || refundLoading || !refundAmount) return;
    setRefundLoading(true);
    try {
      const amt =
        parseFloat(refundAmount) || order.total_amount || 0;
      await api.refunds.request(orderId, {
        amount: amt,
        reason: refundReason || undefined,
      });
      setRefundVisible(false);
      setRefundAmount('');
      setRefundReason('');
    } catch {
      setRefundLoading(false);
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.emptyText}>Commande non trouvée</Text>
      </SafeAreaView>
    );
  }

  const shipping = shippingTimeline?.shipping;

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
          <Text style={styles.headerTitle}>Suivi de commande</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Statut de la commande</Text>
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;
            const iconName = step.icon;
            return (
              <View key={step.status} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIconWrap,
                    isDone && styles.stepIconDone,
                    isActive && !isDone && styles.stepIconActive,
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={18}
                    color={
                      isDone || isActive
                        ? '#ffffff'
                        : '#6b7280'
                    }
                  />
                </View>
                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isDone && styles.stepLabelDone,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isActive && (
                    <Text style={styles.stepHint}>
                      Étape actuelle
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Détails de la commande</Text>
          <View style={styles.orderTop}>
            {order.product_image ? (
              <View style={styles.thumb}>
                <View style={styles.thumbInner} />
              </View>
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons
                  name="cube-outline"
                  size={24}
                  color="#9ca3af"
                />
              </View>
            )}
            <View style={styles.orderInfo}>
              <Text style={styles.orderName} numberOfLines={2}>
                {order.product_name}
              </Text>
              <Text style={styles.orderMeta}>
                Quantité: {order.quantity}
              </Text>
              <Text style={styles.orderAmount}>
                {order.total_amount?.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          </View>
          <View style={styles.orderMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>
                Numéro de commande
              </Text>
              <Text style={styles.metaValueMono} numberOfLines={1}>
                {order.id}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>
                {new Date(
                  order.created_date,
                ).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
          <View style={styles.orderMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>
                Statut paiement
              </Text>
              <Text
                style={[
                  styles.badge,
                  order.payment_status === 'released_to_seller'
                    ? styles.badgeSuccess
                    : styles.badgeInfo,
                ]}
              >
                {order.payment_status === 'pending'
                  ? 'En attente'
                  : order.payment_status === 'escrow'
                  ? 'En sécurité'
                  : 'Libéré'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Paiement</Text>
              <Text style={styles.metaValue}>
                {order.payment_method}
              </Text>
            </View>
          </View>
        </View>

        {order.delivery_address ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Adresse de livraison
            </Text>
            <View style={styles.addrRow}>
              <Ionicons
                name="location"
                size={18}
                color="#6b7280"
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.addrText}>
                  {order.delivery_address}
                </Text>
                {!!order.delivery_phone && (
                  <Text style={styles.addrMeta}>
                    <Ionicons
                      name="call-outline"
                      size={14}
                      color="#6b7280"
                    />{' '}
                    {order.delivery_phone}
                  </Text>
                )}
              </View>
            </View>
            {!!order.tracking_code && (
              <View style={styles.trackingBox}>
                <Text style={styles.metaLabel}>
                  Numéro de suivi
                </Text>
                <Text style={styles.metaValueMono}>
                  {order.tracking_code}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {!!order.tracking_updates?.length && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historique</Text>
            {order.tracking_updates.map((u, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineStatus}>
                    {u.status}
                  </Text>
                  {!!u.message && (
                    <Text style={styles.timelineMessage}>
                      {u.message}
                    </Text>
                  )}
                  {!!u.location && (
                    <Text style={styles.timelineLocation}>
                      {u.location}
                    </Text>
                  )}
                  <Text style={styles.timelineDate}>
                    {new Date(
                      u.timestamp,
                    ).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(shipping?.proof_of_delivery_photo ||
          shipping?.signature ||
          shipping?.actual_delivery ||
          shipping?.current_location) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Preuve de livraison
            </Text>
            {!!shipping?.signature && (
              <View style={styles.proofBox}>
                <Text style={styles.metaLabel}>Signature</Text>
                <Text style={styles.metaValueMono}>
                  {shipping.signature}
                </Text>
              </View>
            )}
            {!!shipping?.current_location && (
              <View style={styles.proofBox}>
                <Text style={styles.metaLabel}>
                  Dernière localisation
                </Text>
                <Text style={styles.metaValue}>
                  {shipping.current_location}
                </Text>
              </View>
            )}
            {!!shipping?.actual_delivery && (
              <View style={styles.proofBox}>
                <Text style={styles.metaLabel}>
                  Date de livraison effective
                </Text>
                <Text style={styles.metaValue}>
                  {new Date(
                    shipping.actual_delivery,
                  ).toLocaleString('fr-FR')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {order.status === 'in_transit' &&
            !order.confirmed_by_buyer && (
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  confirmLoading && styles.primaryBtnDisabled,
                ]}
                onPress={confirmDelivery}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Confirmer la réception
                  </Text>
                )}
              </TouchableOpacity>
            )}

          {order.status === 'delivered' &&
            !order.seller_rating && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setRatingVisible(true)}
              >
                <Ionicons
                  name="star-outline"
                  size={18}
                  color="#2563eb"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryBtnText}>
                  Laisser un avis
                </Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              setRefundVisible(true)
            }
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#2563eb"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.secondaryBtnText}>
              Demander un remboursement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate('OrderDispute', {
                orderId: order.id,
              })
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#b91c1c"
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.secondaryBtnText,
                { color: '#b91c1c' },
              ]}
            >
              Signaler un problème
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={ratingVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Évaluer votre achat
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRating(s)}
                >
                  <Text style={styles.starText}>
                    {s <= rating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Parlez de votre expérience..."
              placeholderTextColor="#9ca3af"
              multiline
              value={review}
              onChangeText={setReview}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRatingVisible(false)}
              >
                <Text style={styles.modalCancelText}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimary,
                  updateLoading && styles.primaryBtnDisabled,
                ]}
                onPress={submitRating}
                disabled={updateLoading}
              >
                <Text style={styles.modalPrimaryText}>
                  Envoyer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={refundVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Demander un remboursement
            </Text>
            <Text style={styles.label}>Montant (FCFA)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={refundAmount}
              onChangeText={setRefundAmount}
              placeholder={String(order.total_amount || '')}
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.label}>Motif (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={refundReason}
              onChangeText={setRefundReason}
              placeholder="Raison du remboursement..."
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRefundVisible(false)}
              >
                <Text style={styles.modalCancelText}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimary,
                  (refundLoading || !refundAmount) &&
                    styles.primaryBtnDisabled,
                ]}
                onPress={submitRefund}
                disabled={refundLoading || !refundAmount}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepIconActive: {
    backgroundColor: '#2563eb',
  },
  stepIconDone: {
    backgroundColor: '#16a34a',
  },
  stepBody: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  stepLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  stepLabelDone: {
    color: '#16a34a',
    fontWeight: '600',
  },
  stepHint: {
    fontSize: 11,
    color: '#9ca3af',
  },
  orderTop: {
    flexDirection: 'row',
    marginTop: 4,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 10,
  },
  thumbInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  thumbPlaceholder: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
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
    color: '#2563eb',
  },
  orderMetaRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  metaValue: {
    fontSize: 13,
    color: '#111827',
    marginTop: 2,
  },
  metaValueMono: {
    fontSize: 12,
    color: '#111827',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
  },
  addrRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  addrText: {
    fontSize: 13,
    color: '#111827',
  },
  addrMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  trackingBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  timelineRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 4,
    marginRight: 10,
  },
  timelineBody: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timelineMessage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  timelineLocation: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  proofBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 999,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
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
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  starText: {
    fontSize: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
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
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
  },
});

