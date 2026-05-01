/**
 * Créer une tontine — formulaire complet.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import tontinesApi, { TontineFrequency } from '../../src/api/tontinesApi';

const FREQUENCIES: { id: TontineFrequency; name: string; hint: string }[] = [
  { id: 'weekly', name: 'Hebdomadaire', hint: 'Un cycle par semaine' },
  { id: 'biweekly', name: 'Bi-mensuelle', hint: 'Un cycle toutes les 2 semaines' },
  { id: 'monthly', name: 'Mensuelle', hint: 'Un cycle par mois' },
];

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];
const QUICK_MEMBERS = [5, 8, 10, 12, 15];

export default function CreateTontineScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [members, setMembers] = useState('10');
  const [frequency, setFrequency] = useState<TontineFrequency>('monthly');
  const [payoutMode, setPayoutMode] = useState<'random' | 'manual'>('random');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    const amt = Number(amount);
    const mem = Number(members);
    if (!name.trim()) return Alert.alert('Nom requis', 'Donnez un nom à votre tontine (ex: "Tontine familiale").');
    if (!amt || amt <= 0) return Alert.alert('Montant invalide', 'Le montant par cycle doit être positif.');
    if (!mem || mem < 2 || mem > 50) return Alert.alert('Nombre de membres', 'Entre 2 et 50 membres par tontine.');

    setSubmitting(true);
    try {
      const t = await tontinesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        contribution_amount: amt,
        max_members: mem,
        frequency,
        payout_order_mode: payoutMode,
        currency: 'XOF',
      });
      Alert.alert(
        'Tontine créée ✓',
        `Partagez le code ${t.invite_code} avec vos ${mem - 1} amis pour qu'ils rejoignent.`,
        [{ text: 'OK', onPress: () => router.replace(`/tontines/${t.id}` as never) }],
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'La création a échoué. Vérifiez votre connexion.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPot = (Number(amount) || 0) * (Number(members) || 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle tontine</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nom de la tontine *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex : Tontine familiale, Tontine marché..."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          maxLength={120}
        />

        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Objectif, règles, date de démarrage..."
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, styles.textarea]}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Contribution par cycle *</Text>
        <View style={styles.amountBox}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            style={styles.amountInput}
            keyboardType="numeric"
            maxLength={8}
          />
          <Text style={styles.currency}>FCFA</Text>
        </View>
        <View style={styles.chipsRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity key={q} style={styles.chip} onPress={() => setAmount(String(q))}>
              <Text style={styles.chipText}>{q.toLocaleString('fr-FR')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nombre de membres *</Text>
        <TextInput
          value={members}
          onChangeText={setMembers}
          placeholder="10"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          keyboardType="numeric"
          maxLength={2}
        />
        <View style={styles.chipsRow}>
          {QUICK_MEMBERS.map((n) => (
            <TouchableOpacity key={n} style={styles.chip} onPress={() => setMembers(String(n))}>
              <Text style={styles.chipText}>{n} personnes</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Fréquence de collecte</Text>
        {FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.optionRow, frequency === f.id && styles.optionRowActive]}
            onPress={() => setFrequency(f.id)}
            activeOpacity={0.85}
          >
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionName, frequency === f.id && styles.optionNameActive]}>{f.name}</Text>
              <Text style={styles.optionHint}>{f.hint}</Text>
            </View>
            {frequency === f.id ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : <View style={styles.radio} />}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Ordre de passage</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity style={[styles.segment, payoutMode === 'random' && styles.segmentActive]} onPress={() => setPayoutMode('random')}>
            <Text style={[styles.segmentText, payoutMode === 'random' && styles.segmentTextActive]}>Tirage aléatoire</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segment, payoutMode === 'manual' && styles.segmentActive]} onPress={() => setPayoutMode('manual')}>
            <Text style={[styles.segmentText, payoutMode === 'manual' && styles.segmentTextActive]}>À définir</Text>
          </TouchableOpacity>
        </View>

        {totalPot > 0 ? (
          <View style={styles.potBox}>
            <Text style={styles.potLabel}>Chaque bénéficiaire recevra</Text>
            <Text style={styles.potAmount}>{totalPot.toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.potHint}>
              {Number(amount).toLocaleString('fr-FR')} FCFA × {members || 0} membres — débités de chaque portefeuille à chaque cycle.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !name || !amount) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={submitting || !name || !amount}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Créer ma tontine</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
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
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },

  content: { padding: Spacing.xl, gap: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  textarea: { minHeight: 90 },

  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  currency: { color: Colors.textSecondary, fontSize: FontSizes.lg, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  optionRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  optionTextWrap: { flex: 1 },
  optionName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  optionNameActive: { color: Colors.primary },
  optionHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },

  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { color: Colors.text, fontWeight: '600' },
  segmentTextActive: { color: '#FFF' },

  potBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    gap: 4,
  },
  potLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  potAmount: { color: Colors.primary, fontSize: 32, fontWeight: '800' },
  potHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 4 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  btnDisabled: { opacity: 0.5 },
});
