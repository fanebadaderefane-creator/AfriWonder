import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import {
  fetchInsuranceProviders,
  fetchMyInsurancePolicies,
  subscribeInsurancePolicy,
  createInsuranceQuoteRequest,
  createInsuranceClaim,
  type InsurancePolicyRow,
  type InsuranceProviderPublic,
} from '../../src/api/insuranceApi';

const TYPE_LABELS: Record<string, string> = {
  health: 'Santé',
  vehicle: 'Auto/Moto',
  property: 'Habitation',
  travel: 'Voyage',
  life: 'Vie',
  micro: 'Micro-assurance',
};

const INSURANCE_TYPES = [
  { id: 'health', name: 'Santé', icon: 'heart-outline' as const, premium: 5000 },
  { id: 'vehicle', name: 'Auto/Moto', icon: 'car-outline' as const, premium: 15000 },
  { id: 'property', name: 'Habitation', icon: 'home-outline' as const, premium: 8000 },
  { id: 'travel', name: 'Voyage', icon: 'airplane-outline' as const, premium: 3000 },
  { id: 'life', name: 'Vie', icon: 'people-outline' as const, premium: 10000 },
  { id: 'micro', name: 'Micro-assurance', icon: 'shield-outline' as const, premium: 1500 },
];

const DEVIS_BY_TYPE: Record<string, { key: string; name: string; priceDisplay: string }> = {
  health: { key: 'sante_standard', name: 'Assurance Santé Standard', priceDisplay: '5 000 FCFA/mois' },
  vehicle: { key: 'auto_basique', name: 'Assurance Auto Basique', priceDisplay: '50 000 FCFA/an' },
  property: { key: 'habitation_standard', name: 'Assurance Habitation Standard', priceDisplay: '8 000 FCFA/mois' },
  travel: { key: 'voyage_trajet', name: 'Assurance Voyage par trajet', priceDisplay: '3 000 FCFA/trajet' },
  life: { key: 'vie_standard', name: 'Assurance Vie Standard', priceDisplay: '10 000 FCFA/mois' },
  micro: { key: 'micro_standard', name: 'Micro-assurance', priceDisplay: '1 500 FCFA/mois' },
};

function formatPolicy(p: InsurancePolicyRow) {
  const typeLabel = p.policy_type ? TYPE_LABELS[p.policy_type] || p.policy_type : p.plan_name || 'Assurance';
  const next = p.next_payment_date
    ? new Date(p.next_payment_date).toLocaleDateString('fr-FR')
    : '—';
  return { id: p.id, typeLabel, provider: p.provider, status: p.status, next, premium: p.premium_amount };
}

export default function InsuranceScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [selectedType, setSelectedType] = useState('health');
  const [devisOpen, setDevisOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [devisForm, setDevisForm] = useState({ fullName: '', phone: '', info: '' });
  const [subscribeProvider, setSubscribeProvider] = useState('');
  const [claimForm, setClaimForm] = useState({
    policyId: '',
    incidentDate: '',
    description: '',
    amount: '',
  });

  const providersQuery = useQuery({
    queryKey: ['insurance', 'providers'],
    queryFn: fetchInsuranceProviders,
  });

  const policiesQuery = useQuery({
    queryKey: ['insurance', 'policies'],
    queryFn: fetchMyInsurancePolicies,
    enabled: isAuthenticated,
  });

  const providerNames = useMemo(() => {
    const list = providersQuery.data ?? [];
    return list.map((p) => p.company_name).filter(Boolean);
  }, [providersQuery.data]);

  const policiesDisplay = useMemo(() => {
    const raw = policiesQuery.data ?? [];
    return raw.map(formatPolicy);
  }, [policiesQuery.data]);

  const selectedMeta = INSURANCE_TYPES.find((t) => t.id === selectedType) ?? INSURANCE_TYPES[0];
  const devisOffer = DEVIS_BY_TYPE[selectedType] ?? DEVIS_BY_TYPE.vehicle;

  const quoteMutation = useMutation({
    mutationFn: createInsuranceQuoteRequest,
    onSuccess: () => {
      setDevisOpen(false);
      setDevisForm({ fullName: '', phone: '', info: '' });
      Alert.alert('Demande envoyée', 'Un conseiller vous contactera.');
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
        : '';
      Alert.alert('Erreur', msg || 'Impossible d’envoyer la demande.');
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: subscribeInsurancePolicy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insurance', 'policies'] });
      setSubscribeOpen(false);
      Alert.alert('Souscription', 'Votre demande a été enregistrée (statut en attente).');
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
        : '';
      Alert.alert('Erreur', msg || 'Souscription impossible.');
    },
  });

  const claimMutation = useMutation({
    mutationFn: createInsuranceClaim,
    onSuccess: () => {
      setClaimOpen(false);
      setClaimForm({ policyId: '', incidentDate: '', description: '', amount: '' });
      Alert.alert('Réclamation', 'Votre dossier a été transmis.');
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
        : '';
      Alert.alert('Erreur', msg || 'Réclamation refusée (KYC ou assurance désactivée).');
    },
  });

  const openSubscribe = useCallback(() => {
    const first = providerNames[0] || (providersQuery.data?.[0] as InsuranceProviderPublic | undefined)?.company_name || '';
    setSubscribeProvider(first || '');
    setSubscribeOpen(true);
  }, [providerNames, providersQuery.data]);

  const onSubmitDevis = () => {
    const fullName = devisForm.fullName.trim();
    const phone = devisForm.phone.trim();
    if (!fullName || !phone) {
      Alert.alert('Champs requis', 'Nom complet et téléphone obligatoires.');
      return;
    }
    quoteMutation.mutate({
      full_name: fullName,
      phone,
      additional_info: devisForm.info.trim() || undefined,
      offer_key: devisOffer.key,
      offer_name: devisOffer.name,
      price_display: devisOffer.priceDisplay,
    });
  };

  const onSubmitSubscribe = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion', 'Connectez-vous pour souscrire une assurance.');
      return;
    }
    const provider = subscribeProvider.trim();
    if (!provider) {
      Alert.alert('Prestataire', 'Choisissez ou saisissez un assureur.');
      return;
    }
    subscribeMutation.mutate({
      policy_type: selectedType,
      provider,
      plan_name: devisOffer.name,
      premium_amount: selectedMeta.premium,
      payment_frequency: 'monthly',
    });
  };

  const onSubmitClaim = () => {
    const policy_id = claimForm.policyId.trim();
    const incident_date = claimForm.incidentDate.trim();
    const description = claimForm.description.trim();
    const claim_amount = Number(claimForm.amount.replace(',', '.'));
    if (!policy_id || !incident_date || !description || !Number.isFinite(claim_amount)) {
      Alert.alert('Formulaire', 'Renseignez police, date (AAAA-MM-JJ), description et montant.');
      return;
    }
    claimMutation.mutate({
      policy_id,
      incident_date,
      description,
      claim_amount,
    });
  };

  const loading = providersQuery.isPending || (isAuthenticated && policiesQuery.isPending);
  const refresh = useCallback(() => {
    void providersQuery.refetch();
    if (isAuthenticated) void policiesQuery.refetch();
  }, [providersQuery, policiesQuery, isAuthenticated]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Assurances</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={providersQuery.isRefetching} onRefresh={refresh} tintColor="#fff" />}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
        ) : null}

        <Text style={styles.sectionTitle}>Types d’assurance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesRow}>
          {INSURANCE_TYPES.map((t) => {
            const active = t.id === selectedType;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setSelectedType(t.id)}
              >
                <Ionicons name={t.icon} size={18} color={active ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedMeta.name}</Text>
          <Text style={styles.detailSub}>Prime indicative : {selectedMeta.premium.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.detailOffer}>{devisOffer.name} — {devisOffer.priceDisplay}</Text>
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setDevisOpen(true)}>
              <Text style={styles.btnSecondaryText}>Demander un devis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={openSubscribe}>
              <Text style={styles.btnPrimaryText}>Souscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isAuthenticated ? (
          <>
            <Text style={styles.sectionTitle}>Mes assurances</Text>
            {policiesDisplay.length === 0 ? (
              <Text style={styles.empty}>Aucune police enregistrée pour le moment.</Text>
            ) : (
              policiesDisplay.map((p) => (
                <View key={p.id} style={styles.policyCard}>
                  <View style={styles.policyTop}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.policyType}>{p.typeLabel}</Text>
                      <Text style={styles.policyProv}>{p.provider}</Text>
                    </View>
                    <View style={[styles.statusPill, p.status === 'active' && styles.statusActive]}>
                      <Text style={styles.statusText}>{p.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.policyMeta}>Prochain paiement : {p.next}</Text>
                  <Text style={styles.policyMeta}>Prime : {String(p.premium)} FCFA</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.linkClaim} onPress={() => setClaimOpen(true)}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.linkClaimText}>Déclarer une réclamation</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.hint}>Connectez-vous pour voir vos polices et souscrire en ligne.</Text>
        )}

        <Text style={styles.sectionTitle}>Compagnies partenaires</Text>
        {(providersQuery.data ?? []).length === 0 ? (
          <Text style={styles.empty}>Aucun prestataire approuvé pour l’instant. Les demandes de devis restent possibles.</Text>
        ) : (
          (providersQuery.data ?? []).map((c) => (
            <View key={c.id} style={styles.providerCard}>
              <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.providerName}>{c.company_name}</Text>
                {c.city ? <Text style={styles.providerCity}>{c.city}</Text> : null}
                {c.description ? <Text style={styles.providerDesc} numberOfLines={3}>{c.description}</Text> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={devisOpen} transparent animationType="slide" onRequestClose={() => setDevisOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.modalTitle}>Demande de devis</Text>
            <Text style={styles.modalSub}>{devisOffer.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor={Colors.textMuted}
              value={devisForm.fullName}
              onChangeText={(fullName) => setDevisForm((s) => ({ ...s, fullName }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={devisForm.phone}
              onChangeText={(phone) => setDevisForm((s) => ({ ...s, phone }))}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Infos complémentaires (optionnel)"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={devisForm.info}
              onChangeText={(info) => setDevisForm((s) => ({ ...s, info }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setDevisOpen(false)}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, quoteMutation.isPending && { opacity: 0.7 }]}
                onPress={onSubmitDevis}
                disabled={quoteMutation.isPending}
              >
                {quoteMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Envoyer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={subscribeOpen} transparent animationType="slide" onRequestClose={() => setSubscribeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.modalTitle}>Souscription</Text>
            <Text style={styles.modalSub}>{selectedMeta.name} — {devisOffer.priceDisplay}</Text>
            <Text style={styles.label}>Prestataire / assureur</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de la compagnie"
              placeholderTextColor={Colors.textMuted}
              value={subscribeProvider}
              onChangeText={setSubscribeProvider}
            />
            {providerNames.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                {providerNames.map((n) => (
                  <TouchableOpacity key={n} style={styles.miniChip} onPress={() => setSubscribeProvider(n)}>
                    <Text style={styles.miniChipText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setSubscribeOpen(false)}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, subscribeMutation.isPending && { opacity: 0.7 }]}
                onPress={onSubmitSubscribe}
                disabled={subscribeMutation.isPending}
              >
                {subscribeMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={claimOpen} transparent animationType="slide" onRequestClose={() => setClaimOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.modalTitle}>Réclamation</Text>
            <Text style={styles.modalSub}>ID de police (copier depuis « Mes assurances »)</Text>
            <TextInput
              style={styles.input}
              placeholder="UUID de la police"
              placeholderTextColor={Colors.textMuted}
              value={claimForm.policyId}
              onChangeText={(policyId) => setClaimForm((s) => ({ ...s, policyId }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Date sinistre AAAA-MM-JJ"
              placeholderTextColor={Colors.textMuted}
              value={claimForm.incidentDate}
              onChangeText={(incidentDate) => setClaimForm((s) => ({ ...s, incidentDate }))}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={claimForm.description}
              onChangeText={(description) => setClaimForm((s) => ({ ...s, description }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Montant réclamé (FCFA)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={claimForm.amount}
              onChangeText={(amount) => setClaimForm((s) => ({ ...s, amount }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setClaimOpen(false)}>
                <Text style={styles.btnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, claimMutation.isPending && { opacity: 0.7 }]}
                onPress={onSubmitClaim}
                disabled={claimMutation.isPending}
              >
                {claimMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Envoyer</Text>}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  typesRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  typeChipActive: { backgroundColor: Colors.primary },
  typeChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSizes.sm },
  typeChipTextActive: { color: '#fff' },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  detailTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  detailSub: { color: Colors.textSecondary, marginTop: 4, fontSize: FontSizes.sm },
  detailOffer: { color: Colors.accent, marginTop: Spacing.sm, fontSize: FontSizes.md, fontWeight: '600' },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.md },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  btnSecondaryText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  empty: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  hint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginVertical: Spacing.md },
  policyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  policyTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  policyType: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  policyProv: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  policyMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255,193,7,0.2)',
  },
  statusActive: { backgroundColor: 'rgba(76,175,80,0.25)' },
  statusText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  linkClaim: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: Spacing.md },
  linkClaimText: { color: Colors.accent, fontWeight: '700', fontSize: FontSizes.md },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  providerName: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  providerCity: { color: Colors.textMuted, fontSize: FontSizes.xs },
  providerDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  modalSub: { color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg, fontSize: FontSizes.sm },
  label: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  btnGhost: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  btnGhostText: { color: Colors.textSecondary, fontWeight: '700' },
  miniChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
  },
  miniChipText: { color: Colors.text, fontSize: FontSizes.sm },
});
