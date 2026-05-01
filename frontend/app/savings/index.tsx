/**
 * Écran Épargne programmée — liste + création + gestion.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { savingsApi, SavingsPlan, SavingsFrequency } from '../../src/api/superAppApi';

const FREQ_LABEL: Record<SavingsFrequency, string> = {
  daily: 'Quotidienne',
  weekly: 'Hebdomadaire',
  biweekly: 'Bi-mensuelle',
  monthly: 'Mensuelle',
};

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [freq, setFreq] = useState<SavingsFrequency>('weekly');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await savingsApi.listMine();
      setPlans(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setFreq('weekly');
  };

  const handleCreate = async () => {
    const amt = Number(amount);
    if (!name.trim()) return Alert.alert('Nom requis', 'Donnez un nom à votre objectif (ex : "Voyage Bamako").');
    if (!amt || amt <= 0) return Alert.alert('Montant invalide', 'Le montant à épargner doit être positif.');
    setSubmitting(true);
    try {
      await savingsApi.create({ name: name.trim(), contribution_amount: amt, frequency: freq });
      resetForm();
      setOpenCreate(false);
      await load();
      Alert.alert('Plan créé ✓', 'Les débits automatiques démarrent selon la fréquence choisie.');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Création impossible.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const togglePause = async (p: SavingsPlan) => {
    try {
      if (p.status === 'active') await savingsApi.pause(p.id);
      else if (p.status === 'paused') await savingsApi.resume(p.id);
      await load();
    } catch {
      Alert.alert('Action impossible', 'Réessayez dans un instant.');
    }
  };

  const handleWithdraw = (p: SavingsPlan) => {
    if (p.balance <= 0) {
      Alert.alert('Solde vide', 'Rien à retirer sur ce plan.');
      return;
    }
    Alert.alert(
      'Retirer vers le portefeuille ?',
      `Transférer ${p.balance.toLocaleString('fr-FR')} ${p.currency} de votre plan "${p.name}" vers votre portefeuille ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          onPress: async () => {
            try {
              await savingsApi.withdraw(p.id, p.balance);
              await load();
            } catch {
              Alert.alert('Retrait impossible', 'Réessayez dans un instant.');
            }
          },
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Épargne programmée</Text>
        <TouchableOpacity onPress={() => setOpenCreate(true)} style={styles.backBtn}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={plans.length === 0 ? styles.emptyContainer : styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      >
        {plans.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="trending-up" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Commencez à épargner</Text>
            <Text style={styles.emptyText}>Mettez de côté un montant régulier — nous débitons automatiquement votre portefeuille.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setOpenCreate(true)}>
              <Text style={styles.primaryBtnText}>Créer mon premier plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((p) => {
            const progress = p.target_amount ? Math.min(1, p.balance / p.target_amount) : 0;
            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{p.name}</Text>
                  <View style={[styles.badge, p.status === 'active' ? styles.badgeActive : p.status === 'paused' ? styles.badgePaused : styles.badgeClosed]}>
                    <Text style={styles.badgeText}>{p.status === 'active' ? 'Actif' : p.status === 'paused' ? 'Pause' : 'Clôturé'}</Text>
                  </View>
                </View>
                <Text style={styles.balance}>{p.balance.toLocaleString('fr-FR')} {p.currency}</Text>
                <Text style={styles.contrib}>
                  {p.contribution_amount.toLocaleString('fr-FR')} {p.currency} · {FREQ_LABEL[p.frequency]}
                </Text>
                {p.target_amount ? (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                ) : null}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => void togglePause(p)} disabled={p.status === 'closed'}>
                    <Ionicons name={p.status === 'active' ? 'pause' : 'play'} size={16} color={Colors.text} />
                    <Text style={styles.actionText}>{p.status === 'active' ? 'Mettre en pause' : 'Reprendre'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleWithdraw(p)} disabled={p.balance <= 0}>
                    <Ionicons name="cash" size={16} color={Colors.text} />
                    <Text style={styles.actionText}>Retirer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={openCreate} transparent animationType="slide" onRequestClose={() => setOpenCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau plan d'épargne</Text>
            <Text style={styles.label}>Objectif</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Voyage, Fêtes, Achat..." placeholderTextColor={Colors.textMuted} style={styles.input} />
            <Text style={styles.label}>Montant par cycle (FCFA)</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5000" placeholderTextColor={Colors.textMuted} style={styles.input} />
            <Text style={styles.label}>Fréquence</Text>
            <View style={{ gap: 6 }}>
              {(['daily', 'weekly', 'biweekly', 'monthly'] as SavingsFrequency[]).map((f) => (
                <TouchableOpacity key={f} style={[styles.freqRow, freq === f && styles.freqRowActive]} onPress={() => setFreq(f)}>
                  <Text style={[styles.freqText, freq === f && styles.freqTextActive]}>{FREQ_LABEL[f]}</Text>
                  {freq === f ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => { resetForm(); setOpenCreate(false); }} disabled={submitting}>
                <Text style={styles.modalGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimary, submitting && styles.btnDisabled]} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalPrimaryText}>Créer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: Spacing.xxl },
  emptyBox: { alignItems: 'center', gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },

  card: { padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
  badgeActive: { backgroundColor: '#4CAF5022' },
  badgePaused: { backgroundColor: '#FFB02022' },
  badgeClosed: { backgroundColor: Colors.border },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.text },
  balance: { color: Colors.primary, fontSize: 28, fontWeight: '800' },
  contrib: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  actionText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.sm },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800', marginBottom: Spacing.sm },
  label: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.sm },
  input: {
    padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: FontSizes.md,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  freqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  freqRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  freqText: { color: Colors.text, fontSize: FontSizes.md },
  freqTextActive: { color: Colors.primary, fontWeight: '700' },

  modalBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalGhost: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center' },
  modalGhostText: { color: Colors.text, fontWeight: '600' },
  modalPrimary: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  modalPrimaryText: { color: '#FFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
