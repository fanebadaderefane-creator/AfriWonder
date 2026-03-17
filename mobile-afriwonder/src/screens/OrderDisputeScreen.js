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

const disputeReasons = [
  { value: 'product_not_received', label: 'Produit non reçu' },
  { value: 'product_damaged', label: 'Produit endommagé' },
  {
    value: 'product_not_as_described',
    label: 'Produit ne correspond pas à la description',
  },
  { value: 'wrong_product', label: 'Mauvais produit reçu' },
  {
    value: 'seller_not_responding',
    label: 'Vendeur ne répond pas',
  },
  { value: 'other', label: 'Autre' },
];

export default function OrderDisputeScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [existingDispute, setExistingDispute] = useState(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const ord = await api.orders.getById(orderId);
        if (!cancelled) setOrder(ord || null);
        const disputes = await api.disputes
          ?.list?.({ as: 'buyer' })
          .catch(() => null);
        if (!cancelled) {
          const list = Array.isArray(disputes)
            ? disputes
            : disputes?.data ?? [];
          const found = Array.isArray(list)
            ? list.find(
                (d) =>
                  d.order_id === orderId &&
                  (d.status === 'open' ||
                    d.status === 'investigating'),
              )
            : null;
          setExistingDispute(found || null);
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

  const handleCreate = async () => {
    if (!orderId || !reason || !description.trim() || sending) return;
    setSending(true);
    try {
      const created = await api.disputes.create({
        order_id: orderId,
        reason,
        description,
      });
      setExistingDispute(created || null);
    } finally {
      setSending(false);
    }
  };

  const handleAddMessage = async () => {
    if (
      !existingDispute?.id ||
      !description.trim() ||
      sendingMsg
    )
      return;
    setSendingMsg(true);
    try {
      await api.disputes.addMessage(existingDispute.id, {
        message: description,
        attachments: [],
      });
      setDescription('');
    } finally {
      setSendingMsg(false);
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
            Signaler un problème
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#b91c1c"
            />
            <Text style={styles.cardTitle}>
              Commande #
              {(order.id || '').substring(0, 8)}
            </Text>
          </View>
          <Text style={styles.orderName} numberOfLines={2}>
            {order.items?.[0]?.product?.name ||
              order.product_name ||
              'Produit'}
          </Text>
        </View>

        {existingDispute ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Litige en cours
            </Text>
            <Text style={styles.existingReason}>
              {
                (disputeReasons.find(
                  (r) => r.value === existingDispute.reason,
                ) || {}).label ||
                existingDispute.reason
              }
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {existingDispute.status === 'open'
                  ? 'Ouvert'
                  : existingDispute.status === 'investigating'
                  ? 'En investigation'
                  : existingDispute.status}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Ajouter un message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Votre message..."
              placeholderTextColor="#9ca3af"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (sendingMsg || !description.trim()) &&
                  styles.primaryBtnDisabled,
              ]}
              onPress={handleAddMessage}
              disabled={sendingMsg || !description.trim()}
            >
              {sendingMsg ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Envoyer
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Motif du litige
            </Text>
            {disputeReasons.map((r) => {
              const active = reason === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.reasonRow,
                    active && styles.reasonRowActive,
                  ]}
                  onPress={() => setReason(r.value)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      active && styles.radioOuterActive,
                    ]}
                  >
                    {active && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.reasonLabel,
                      active && styles.reasonLabelActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.sectionTitle}>
              Description
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez le problème..."
              placeholderTextColor="#9ca3af"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (sending || !reason || !description.trim()) &&
                  styles.primaryBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={sending || !reason || !description.trim()}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Envoyer le litige
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  orderName: {
    fontSize: 13,
    color: '#4b5563',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
    marginBottom: 6,
  },
  existingReason: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  reasonRowActive: {
    backgroundColor: '#fef2f2',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterActive: {
    borderColor: '#b91c1c',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#b91c1c',
  },
  reasonLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  reasonLabelActive: {
    color: '#b91c1c',
    fontWeight: '600',
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 8,
  },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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

