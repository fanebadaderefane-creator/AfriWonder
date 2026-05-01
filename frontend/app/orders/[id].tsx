import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import ordersApi, { Order } from '../../src/api/ordersApi';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de paiement',
  paid: 'Payée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
  failed: 'Échouée',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function statusColor(status: string): string {
  if (['delivered', 'completed', 'paid'].includes(status)) return Colors.success;
  if (['cancelled', 'refunded', 'failed'].includes(status)) return Colors.error;
  return Colors.info;
}

export default function OrderDetailScreen() {
  if (!featureFlags.marketplace) {
    return (
      <ComingSoonScreen
        title="Détail commande"
        description="Le suivi de commande marketplace sera bientôt disponible."
        icon="receipt-outline"
      />
    );
  }
  return <OrderDetailContent />;
}

function OrderDetailContent() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError('Identifiant de commande manquant.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.get(id);
      setOrder(data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Commande introuvable.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirmReception = async () => {
    if (!order?.id) return;
    Alert.alert(
      'Confirmer la réception',
      'Confirmez avoir bien reçu votre commande. Cela débloque le paiement vers le vendeur.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setConfirming(true);
            try {
              const updated = await ordersApi.confirmReception(order.id);
              setOrder(updated);
              Alert.alert('Merci !', 'Réception confirmée.');
            } catch (err) {
              const msg = (err as { message?: string })?.message ?? 'Action impossible.';
              Alert.alert('Erreur', msg);
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    if (!order?.id) return;
    Alert.alert('Annuler la commande', 'Cette action est irréversible.', [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler',
        style: 'destructive',
        onPress: async () => {
          setConfirming(true);
          try {
            const updated = await ordersApi.cancel(order.id);
            setOrder(updated);
            Alert.alert('Commande annulée');
          } catch (err) {
            const msg = (err as { message?: string })?.message ?? 'Action impossible.';
            Alert.alert('Erreur', msg);
          } finally {
            setConfirming(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commande</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commande</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.errorTitle}>Commande introuvable</Text>
          <Text style={styles.errorText}>{error ?? 'Cette commande est inaccessible.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = String(order.status).toLowerCase();
  const statusLabel = STATUS_LABELS[status] ?? order.status;
  const sColor = statusColor(status);
  const subtotal =
    order.items?.reduce((sum, i) => sum + (i.total_price ?? i.unit_price * i.quantity), 0) ?? order.total_amount ?? 0;
  const delivery = Math.max(0, (order.total_amount ?? 0) - subtotal);

  const canConfirmReception = ['shipped', 'in_delivery', 'delivered'].includes(status);
  const canCancel = ['pending', 'paid', 'preparing'].includes(status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{order.id.slice(0, 8)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, { backgroundColor: sColor + '15' }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: sColor + '30' }]}>
            <Ionicons name="cube" size={32} color={sColor} />
          </View>
          <Text style={[styles.statusTitle, { color: sColor }]}>{statusLabel}</Text>
          <Text style={styles.statusSubtitle}>Créée le {formatDate(order.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({order.items?.length ?? 0})</Text>
          {(order.items ?? []).map((item, idx) => (
            <View key={item.id ?? `item-${idx}`} style={styles.itemRow}>
              {item.product?.images?.[0] ? (
                <Image source={{ uri: item.product.images[0] }} style={styles.itemImg} />
              ) : (
                <View style={[styles.itemImg, styles.itemImgFallback]}>
                  <Ionicons name="image-outline" size={20} color={Colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name ?? 'Produit'}</Text>
                <Text style={styles.itemMeta}>Quantité × {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{(item.total_price ?? item.unit_price * item.quantity).toLocaleString()} FCFA</Text>
            </View>
          ))}
        </View>

        {order.shipping_address ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Livraison</Text>
            <View style={styles.addressCard}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.addressText}>{order.shipping_address}</Text>
                {order.shipping_city ? <Text style={styles.addressSub}>{order.shipping_city}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sous-total</Text>
            <Text style={styles.detailValue}>{subtotal.toLocaleString()} FCFA</Text>
          </View>
          {delivery > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Livraison</Text>
              <Text style={styles.detailValue}>{delivery.toLocaleString()} FCFA</Text>
            </View>
          ) : null}
          <View
            style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md }]}
          >
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{(order.total_amount ?? 0).toLocaleString()} FCFA</Text>
          </View>
          {order.payment_method ? (
            <Text style={styles.paymentMeta}>Paiement : {order.payment_method}</Text>
          ) : null}
        </View>

        {canConfirmReception ? (
          <TouchableOpacity
            style={[styles.primaryBtn, confirming && styles.primaryBtnDisabled]}
            onPress={handleConfirmReception}
            disabled={confirming}
          >
            {confirming ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={styles.primaryBtnText}>Confirmer la réception</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {canCancel ? (
          <TouchableOpacity
            style={[styles.secondaryBtn, confirming && styles.primaryBtnDisabled]}
            onPress={handleCancel}
            disabled={confirming}
          >
            <Text style={styles.secondaryBtnText}>Annuler la commande</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  statusCard: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statusTitle: { fontSize: FontSizes.xl, fontWeight: 'bold' },
  statusSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 4 },
  section: { marginBottom: Spacing.xxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  itemImg: { width: 56, height: 56, borderRadius: BorderRadius.sm, backgroundColor: Colors.card },
  itemImgFallback: { alignItems: 'center', justifyContent: 'center' },
  itemName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  itemMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  itemPrice: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  addressText: { color: Colors.text, fontSize: FontSizes.md },
  addressSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  detailValue: { color: Colors.text, fontSize: FontSizes.md },
  totalLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  paymentMeta: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.sm, fontStyle: 'italic' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  secondaryBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  secondaryBtnText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '600' },
});
