/**
 * Paiement de factures utilitaires — EDM, Somagep, Canal+, Orange TV, Malitel.
 * Liste des providers dynamique (backend), formulaire généré à partir de `fields_schema`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { utilityBillsApi, UtilityBillProvider } from '../../src/api/superAppApi';

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  electricity: 'flash',
  water: 'water',
  tv: 'tv',
  internet: 'wifi',
  phone: 'call',
};

type PayMethod = 'wallet' | 'orange_money' | 'wave' | 'mtn_money' | 'moov_money';

const PAY_METHODS: { id: PayMethod; name: string; color: string }[] = [
  { id: 'wallet', name: 'Portefeuille AfriWonder', color: Colors.primary },
  { id: 'orange_money', name: 'Orange Money', color: '#FF6B00' },
  { id: 'wave', name: 'Wave', color: '#1DC1EC' },
  { id: 'mtn_money', name: 'MTN Mobile Money', color: '#FFCC00' },
  { id: 'moov_money', name: 'Moov Money', color: '#0066CC' },
];

export default function PayBillScreen() {
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState<UtilityBillProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UtilityBillProvider | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('wallet');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await utilityBillsApi.listProviders();
      setProviders(list);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const byCategory = useMemo(() => {
    const map = new Map<string, UtilityBillProvider[]>();
    for (const p of providers) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries());
  }, [providers]);

  const handlePay = async () => {
    if (!selected) return;
    const fields = selected.fields_schema?.fields || [];
    const missing = fields.filter((f) => f.required && !formValues[f.name]?.trim());
    if (missing.length > 0) {
      Alert.alert('Champs requis', `Remplissez : ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant positif.');
      return;
    }
    // Le backend attend un account_ref principal. On prend le 1er champ requis.
    const accountRef = (fields.find((f) => f.required)?.name ?? fields[0]?.name ?? 'ref');
    const accountRefValue = formValues[accountRef] ?? '';

    setSubmitting(true);
    try {
      const p = await utilityBillsApi.pay({
        provider_id: selected.id,
        account_ref: accountRefValue.trim(),
        amount_fcfa: amt,
        payment_method: payMethod,
        metadata: formValues,
      });
      const done = p.status === 'paid';
      Alert.alert(
        done ? 'Facture payée ✓' : 'Paiement en cours',
        done
          ? `Quittance : ${p.reference}\n${amt.toLocaleString('fr-FR')} FCFA débités via portefeuille.`
          : `Suivez le popup ${PAY_METHODS.find((m) => m.id === payMethod)?.name} sur votre téléphone pour valider.`,
        [{ text: 'OK', onPress: () => router.replace('/bills' as never) }],
      );
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Paiement impossible. Vérifiez votre solde ou le numéro saisi.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payer une facture</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!selected ? (
          byCategory.map(([cat, items]) => (
            <View key={cat} style={{ gap: Spacing.sm }}>
              <Text style={styles.categoryLabel}>
                <Ionicons name={CATEGORY_ICON[cat] ?? 'receipt'} size={16} color={Colors.primary} />  {cat.toUpperCase()}
              </Text>
              {items.map((p) => (
                <TouchableOpacity key={p.id} style={styles.providerCard} onPress={() => setSelected(p)}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <>
            <View style={styles.providerSelected}>
              <Ionicons name={CATEGORY_ICON[selected.category] ?? 'receipt'} size={28} color={Colors.primary} />
              <Text style={styles.providerSelectedName}>{selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.changeLink}>Changer</Text>
              </TouchableOpacity>
            </View>

            {(selected.fields_schema?.fields || []).map((f) => (
              <View key={f.name}>
                <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
                <TextInput
                  value={formValues[f.name] ?? ''}
                  onChangeText={(v) => setFormValues((prev) => ({ ...prev, [f.name]: v }))}
                  placeholder={f.label}
                  placeholderTextColor={Colors.textMuted}
                  style={styles.input}
                  keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                />
              </View>
            ))}

            <Text style={styles.label}>Montant à payer *</Text>
            <View style={styles.amountBox}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                style={styles.amountInput}
                maxLength={8}
              />
              <Text style={styles.currency}>FCFA</Text>
            </View>

            <Text style={styles.label}>Moyen de paiement</Text>
            {PAY_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodRow, payMethod === m.id && styles.methodRowActive]}
                onPress={() => setPayMethod(m.id)}
              >
                <View style={[styles.methodDot, { backgroundColor: m.color }]} />
                <Text style={styles.methodName}>{m.name}</Text>
                {payMethod === m.id ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.payBtn, (submitting || !amount) && styles.btnDisabled]}
              onPress={handlePay}
              disabled={submitting || !amount}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                  <Text style={styles.payBtnText}>Payer {amount ? `${Number(amount).toLocaleString('fr-FR')} FCFA` : ''}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.xl, gap: Spacing.md },

  categoryLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: '700', marginTop: Spacing.md, letterSpacing: 1 },
  providerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  providerName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },

  providerSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primary },
  providerSelectedName: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  changeLink: { color: Colors.primary, fontWeight: '600' },

  label: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md },
  input: {
    padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: FontSizes.md,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  amountBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  amountInput: {
    flex: 1, color: Colors.text, fontSize: 28, fontWeight: 'bold',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  currency: { color: Colors.textSecondary, fontSize: FontSizes.lg, fontWeight: '600' },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  methodRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  methodDot: { width: 10, height: 10, borderRadius: 5 },
  methodName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, marginTop: Spacing.xl },
  payBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  btnDisabled: { opacity: 0.5 },
});
