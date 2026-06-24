import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing } from '../theme/colors';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';

type PinnedRow = { product_id: string; name: string; position: number };

export function LiveHostProductPinSection({ liveId }: { liveId: string }) {
  const [productIdInput, setProductIdInput] = useState('');
  const [pinned, setPinned] = useState<PinnedRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/products`);
      const data = res.data?.data ?? res.data;
      const raw = Array.isArray(data) ? data : [];
      setPinned(
        raw.map((r: Record<string, unknown>) => ({
          product_id: String(r.id ?? r.product_id ?? ''),
          name: String(r.name ?? r.title ?? 'Produit'),
          position: Number(r.position ?? 0),
        })),
      );
    } catch {
      setPinned([]);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pinProduct = async () => {
    const pid = productIdInput.trim();
    if (!pid) return;
    setBusy(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/products`, {
        product_id: pid,
        position: pinned.length,
      });
      setProductIdInput('');
      await load();
      Alert.alert('Boutique live', 'Produit épinglé — visible chez les spectateurs.');
    } catch (e: unknown) {
      Alert.alert('Produit', getAlertMessageForCaughtError(e));
    } finally {
      setBusy(false);
    }
  };

  const unpin = async (productId: string) => {
    try {
      await apiClient.delete(`/live/${encodeURIComponent(liveId)}/products/${encodeURIComponent(productId)}`);
      await load();
    } catch (e: unknown) {
      Alert.alert('Produit', getAlertMessageForCaughtError(e));
    }
  };

  return (
    <View>
      <Text style={styles.section}>Boutique live (TikTok Shop)</Text>
      <Text style={styles.hint}>ID produit marketplace (vos annonces) — visible dans le bandeau spectateur.</Text>
      <TextInput
        style={styles.input}
        placeholder="UUID produit"
        placeholderTextColor={Colors.textMuted}
        value={productIdInput}
        onChangeText={setProductIdInput}
      />
      <TouchableOpacity style={styles.btn} onPress={() => void pinProduct()} disabled={busy}>
        {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Épingler au live</Text>}
      </TouchableOpacity>
      {pinned.length === 0 ? (
        <Text style={styles.muted}>Aucun produit épinglé.</Text>
      ) : (
        pinned.map((p) => (
          <View key={p.product_id} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={1}>
              {p.name}
            </Text>
            <TouchableOpacity onPress={() => void unpin(p.product_id)}>
              <Text style={styles.remove}>Retirer</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: Colors.text, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },
  hint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: Spacing.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  btnText: { color: '#FFF', fontWeight: '700' },
  muted: { color: Colors.textMuted, fontSize: FontSizes.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowName: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, marginRight: 8 },
  remove: { color: '#F87171', fontWeight: '600', fontSize: FontSizes.sm },
});
