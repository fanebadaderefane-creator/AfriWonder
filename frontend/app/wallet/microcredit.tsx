import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import microcreditApi, { MicrocreditLoanRow } from '../../src/api/microcreditApi';
import { useAuthStore } from '../../src/store/authStore';

const PURPOSES = [
  { id: 'commerce', label: 'Commerce' },
  { id: 'education', label: 'Éducation' },
  { id: 'sante', label: 'Santé' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'equipement', label: 'Équipement' },
  { id: 'urgence', label: 'Urgence' },
];

const MONTH_OPTIONS = [3, 6, 12];

function statusLabel(s: string) {
  const m: Record<string, string> = {
    active: 'Actif',
    pending: 'En attente',
    funded: 'Financé',
    completed: 'Terminé',
    defaulted: 'Défaut',
    cancelled: 'Annulé',
  };
  return m[s] || s;
}

export default function MicrocreditScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketLoans, setMarketLoans] = useState<MicrocreditLoanRow[]>([]);
  const [myLoans, setMyLoans] = useState<MicrocreditLoanRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('50000');
  const [purpose, setPurpose] = useState('commerce');
  const [months, setMonths] = useState(6);
  const [rateStr, setRateStr] = useState('2');
  const [plan, setPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pub = await microcreditApi.listPublic({ status: 'active', limit: 40, page: 1 });
      setMarketLoans(pub);
      if (token) {
        const mine = await microcreditApi.myLoans();
        setMyLoans(mine);
      } else {
        setMyLoans([]);
      }
    } catch {
      setMarketLoans([]);
      setMyLoans([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const latestScore = myLoans[0]?.credit_score;

  const submitRequest = async () => {
    const amount = Number(String(amountStr).replace(/\s/g, ''));
    const interestRate = Number(String(rateStr).replace(',', '.'));
    if (!token) {
      Alert.alert('Connexion requise', 'Connectez-vous pour déposer une demande de prêt.');
      return;
    }
    if (!amount || amount < 5000) {
      Alert.alert('Montant', 'Indiquez un montant d’au moins 5 000 FCFA.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Objet', 'Choisissez un objet de financement.');
      return;
    }
    if (!interestRate || interestRate < 0) {
      Alert.alert('Taux', 'Indiquez un taux d’intérêt mensuel valide.');
      return;
    }
    setSubmitting(true);
    try {
      await microcreditApi.createRequest({
        amount,
        purpose: purpose.trim(),
        repaymentPeriod: months,
        interestRate,
        business_plan: plan.trim() || undefined,
      });
      setModalOpen(false);
      Alert.alert('Demande enregistrée', 'Votre projet est visible pour le financement participatif.');
      await load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data?.error
          ?.message
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible d’enregistrer la demande.';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Microcrédit</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <View style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{latestScore != null ? Math.round(latestScore) : '—'}</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Score crédit (dernière demande)</Text>
              <Text style={styles.scoreStatus}>
                {latestScore == null ? 'Aucune demande encore' : latestScore >= 70 ? 'Profil favorable' : 'À renforcer'}
              </Text>
              <Text style={styles.scoreDetail}>Financez un projet ou soutenez la communauté.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cta} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={22} color="#FFF" />
            <Text style={styles.ctaText}>Nouvelle demande de prêt</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Mes demandes</Text>
          {myLoans.length === 0 ? (
            <Text style={styles.muted}>Vous n’avez pas encore de dossier.</Text>
          ) : (
            myLoans.map((l) => (
              <View key={l.id} style={styles.loanCard}>
                <Text style={styles.loanAmount}>{Math.round(l.amount_requested).toLocaleString('fr-FR')} FCFA</Text>
                <Text style={styles.loanMeta}>
                  {l.purpose} · {l.repayment_period_months} mois · {statusLabel(l.status)}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (l.amount_requested ? (l.current_amount / l.amount_requested) * 100 : 0) || 0
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.loanFunded}>
                  {Math.round(l.current_amount).toLocaleString('fr-FR')} /{' '}
                  {Math.round(l.amount_requested).toLocaleString('fr-FR')} FCFA · {l.lenders_count ?? 0} soutien(s)
                </Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Projets à financer</Text>
          {marketLoans.length === 0 ? (
            <Text style={styles.muted}>Aucun projet actif pour le moment.</Text>
          ) : (
            marketLoans.map((l) => (
              <View key={l.id} style={styles.marketCard}>
                <Text style={styles.borrower}>{l.borrower_name || 'Emprunteur'}</Text>
                <Text style={styles.loanPurpose}>{l.purpose}</Text>
                {l.business_plan ? (
                  <Text style={styles.planSnippet} numberOfLines={2}>
                    {l.business_plan}
                  </Text>
                ) : null}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (l.amount_requested ? (l.current_amount / l.amount_requested) * 100 : 0) || 0
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.loanFunded}>
                  {Math.round(l.current_amount).toLocaleString('fr-FR')} /{' '}
                  {Math.round(l.amount_requested).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.modalTitle}>Demande de prêt</Text>
            <Text style={styles.inputLabel}>Montant (FCFA)</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="50000"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputLabel}>Objet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.purposeRow}>
              {PURPOSES.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.purposeChip, purpose === p.id && styles.purposeChipOn]}
                  onPress={() => setPurpose(p.id)}
                >
                  <Text style={[styles.purposeChipText, purpose === p.id && styles.purposeChipTextOn]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Durée (mois)</Text>
            <View style={styles.monthRow}>
              {MONTH_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, months === m && styles.monthChipOn]}
                  onPress={() => setMonths(m)}
                >
                  <Text style={[styles.monthChipText, months === m && styles.monthChipTextOn]}>{m} mois</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Taux mensuel (%)</Text>
            <TextInput
              value={rateStr}
              onChangeText={setRateStr}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="2"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputLabel}>Plan (optionnel)</Text>
            <TextInput
              value={plan}
              onChangeText={setPlan}
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez brièvement votre activité…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setModalOpen(false)} disabled={submitting}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => void submitRequest()} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Envoyer</Text>}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { color: Colors.success, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  scoreInfo: { flex: 1 },
  scoreLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  scoreStatus: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: 4 },
  scoreDetail: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  ctaText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '800' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  muted: { color: Colors.textSecondary, marginBottom: Spacing.lg },
  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  loanAmount: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '800' },
  loanMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  marketCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  borrower: { color: Colors.text, fontWeight: '700' },
  loanPurpose: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  planSnippet: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  loanFunded: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.xs },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '92%',
  },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800', marginBottom: Spacing.lg },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  purposeRow: { marginBottom: Spacing.md, maxHeight: 44 },
  purposeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  purposeChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  purposeChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSizes.sm },
  purposeChipTextOn: { color: Colors.primary },
  monthRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  monthChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  monthChipText: { color: Colors.textSecondary, fontWeight: '600' },
  monthChipTextOn: { color: Colors.primary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  btnGhost: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  btnGhostText: { color: Colors.textSecondary, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontWeight: '800' },
});
