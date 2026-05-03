import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import { restaurantsApi, foodOrdersApi, MenuItem, Restaurant } from '../../../src/api/restaurantsApi';
import { toAbsoluteMediaUrl } from '../../../src/utils/absoluteMediaUrl';
import {
  menuItemFallbackImage,
  normalizeCuisineLabel,
  restaurantHeroImageUrl,
} from '../../../src/food/restaurantVisuals';
import { useAuthStore } from '../../../src/store/authStore';
import { appAlert } from '../../../src/utils/appAlert';
import {
  getDemoMenuForRestaurant,
  getDemoRestaurantById,
  isAfriWonderDemoId,
} from '../../../src/demo/superAppDemoSeed';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';

type PayMethod = 'cash' | 'wallet' | 'mobile_money';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [r, setR] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('mobile_money');
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const rest = await restaurantsApi.get(String(id));
      setR(rest);
      const items = await restaurantsApi.menu(String(id));
      setMenu(items.length ? items : rest.menu_items || []);
    } catch {
      const demoR = getDemoRestaurantById(String(id));
      if (demoR) {
        setR(demoR);
        setMenu(getDemoMenuForRestaurant(demoR.id));
        setFromDemo(true);
      } else {
        setR(null);
        setMenu([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const subtotal = useMemo(() => {
    let t = 0;
    for (const it of menu) {
      const q = cart[it.id] || 0;
      if (q > 0) t += (Number(it.price) || 0) * q;
    }
    return t;
  }, [menu, cart]);

  const deliveryFee = r ? Number(r.delivery_fee) || 0 : 0;
  const minOrder = r ? Number(r.minimum_order ?? r.min_order_amount ?? 0) || 0 : 0;
  const grandTotal = subtotal + deliveryFee;

  const bump = (itemId: string, delta: number) => {
    setCart((prev) => {
      const q = Math.max(0, (prev[itemId] || 0) + delta);
      const next = { ...prev };
      if (q === 0) delete next[itemId];
      else next[itemId] = q;
      return next;
    });
  };

  const placeOrder = async () => {
    setCheckoutHint(null);
    if (!token) {
      const t = 'Connectez-vous pour commander.';
      setCheckoutHint(t);
      appAlert('Connexion', t);
      return;
    }
    if (!r) return;
    if (isAfriWonderDemoId(r.id)) {
      const t =
        'Fictif : aucune commande réelle. Les partenaires restauration seront branchés plus tard.';
      setCheckoutHint(t);
      appAlert('Démonstration', t);
      return;
    }
    const items = menu
      .filter((it) => (cart[it.id] || 0) > 0)
      .map((it) => ({ menu_item_id: it.id, quantity: cart[it.id]!, notes: notes.trim() || undefined }));
    if (items.length === 0) {
      const t = 'Ajoutez au moins un plat.';
      setCheckoutHint(t);
      appAlert('Panier vide', t);
      return;
    }
    if (minOrder > 0 && subtotal < minOrder) {
      const t = `Minimum ${minOrder.toLocaleString('fr-FR')} FCFA (hors livraison).`;
      setCheckoutHint(t);
      appAlert('Minimum de commande', t);
      return;
    }
    if (!address.trim()) {
      const t = 'Indiquez l’adresse de livraison ci-dessus.';
      setCheckoutHint(t);
      appAlert('Adresse', t);
      return;
    }
    setOrdering(true);
    try {
      await foodOrdersApi.create({
        restaurant_id: r.id,
        items,
        total_amount: grandTotal,
        delivery_address: address.trim(),
        payment_method: payMethod,
        special_requests: notes.trim() || undefined,
      });
      appAlert('Commande envoyée', 'Le restaurant va confirmer votre commande.');
      setCart({});
      router.back();
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const d = ax.response?.data;
      const msg =
        (typeof d?.message === 'string' ? d.message : undefined)
        ?? (typeof d?.error === 'string' ? d.error : undefined)
        ?? ax.message
        ?? 'Commande impossible.';
      setCheckoutHint(msg);
      appAlert('Erreur', msg);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!r) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>Restaurant introuvable.</Text>
        </View>
      </View>
    );
  }

  const absCover = toAbsoluteMediaUrl(restaurantHeroImageUrl(r));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {r.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 160 }]}>
        {fromDemo ? <DemoContentBanner /> : null}
        <Image source={{ uri: absCover }} style={styles.hero} />
        <Text style={styles.sub}>
          {normalizeCuisineLabel(r.cuisine_type) || r.address}
        </Text>
        {deliveryFee > 0 ? (
          <Text style={styles.infoLine}>Livraison : {deliveryFee.toLocaleString('fr-FR')} FCFA</Text>
        ) : (
          <Text style={styles.infoLine}>Livraison gratuite</Text>
        )}
        {minOrder > 0 ? (
          <Text style={styles.infoLine}>Minimum commande (plats) : {minOrder.toLocaleString('fr-FR')} FCFA</Text>
        ) : null}
        {r.is_open === false ? (
          <View style={styles.closed}>
            <Text style={styles.closedText}>Fermé pour le moment</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Menu</Text>
        {menu.length === 0 ? (
          <Text style={styles.muted}>Menu indisponible pour ce restaurant.</Text>
        ) : (
          menu.filter((it) => it.is_available !== false).map((it, idx) => {
            const q = cart[it.id] || 0;
            const img = it.image_url
              ? toAbsoluteMediaUrl(it.image_url)
              : menuItemFallbackImage(idx);
            return (
              <View key={it.id} style={styles.row}>
                <Image source={{ uri: img }} style={styles.thumb} />
                <View style={styles.rowText}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemPrice}>{Number(it.price).toLocaleString('fr-FR')} FCFA</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => bump(it.id, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={18} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qty}>{q}</Text>
                  <TouchableOpacity onPress={() => bump(it.id, 1)} style={styles.qtyBtn}>
                    <Ionicons name="add" size={18} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.section}>Paiement à la livraison / en ligne</Text>
        <View style={styles.payRow}>
          {(
            [
              { k: 'cash' as const, label: 'Espèces' },
              { k: 'wallet' as const, label: 'Portefeuille' },
              { k: 'mobile_money' as const, label: 'Mobile money' },
            ] as const
          ).map(({ k, label }) => (
            <TouchableOpacity
              key={k}
              style={[styles.payChip, payMethod === k && styles.payChipOn]}
              onPress={() => setPayMethod(k)}
            >
              <Text style={[styles.payChipText, payMethod === k && styles.payChipTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Livraison</Text>
        <TextInput
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setCheckoutHint(null);
          }}
          style={styles.input}
          placeholder="Adresse complète"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.area]}
          placeholder="Instructions (interphone, repères…)"
          placeholderTextColor={Colors.textMuted}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Text style={styles.subtotalLine}>Plats : {subtotal.toLocaleString('fr-FR')} FCFA</Text>
        {deliveryFee > 0 ? (
          <Text style={styles.subtotalLine}>+ Livraison : {deliveryFee.toLocaleString('fr-FR')} FCFA</Text>
        ) : null}
        <Text style={styles.total}>Total : {grandTotal.toLocaleString('fr-FR')} FCFA</Text>
        {checkoutHint ? (
          <Text style={styles.checkoutHint} accessibilityLiveRegion="polite">
            {checkoutHint}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.orderBtn} onPress={() => void placeOrder()} disabled={ordering}>
          {ordering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.orderBtnText}>Commander</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.lg },
  hero: { width: '100%', height: 180, borderRadius: BorderRadius.lg, backgroundColor: Colors.card },
  sub: { color: Colors.textSecondary, marginTop: Spacing.sm },
  infoLine: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  payChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  payChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  payChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  payChipTextOn: { color: Colors.primary },
  closed: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.error + '22',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  closedText: { color: Colors.error, fontWeight: '700', fontSize: FontSizes.sm },
  section: { color: Colors.text, fontWeight: '800', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: BorderRadius.sm, backgroundColor: Colors.card },
  rowText: { flex: 1 },
  itemName: { color: Colors.text, fontWeight: '600' },
  itemPrice: { color: Colors.primary, fontSize: FontSizes.sm, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qty: { color: Colors.text, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  checkoutHint: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  subtotalLine: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 2 },
  total: { color: Colors.text, fontWeight: '800', marginBottom: Spacing.sm },
  orderBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  orderBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  muted: { color: Colors.textSecondary },
});
