import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { MOCK_LOANS, MOCK_ACTIVE_LOAN, CREDIT_PRODUCTS, LOAN_PURPOSE_OPTIONS, CATEGORIES } from '../data/microcreditMock';

export default function MicrocreditScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestStep, setRequestStep] = useState(1);
  const [requestForm, setRequestForm] = useState({
    amount: '',
    purpose: '',
    fullName: '',
    phone: '',
    monthlyIncome: '',
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.microcredit.list({ status: 'active', limit: 100 });
      const list = res?.loans ?? [];
      if (Array.isArray(list) && list.length > 0) {
        setLoans(list);
      } else {
        let sorted = [...MOCK_LOANS];
        if (sortBy === 'credit_score') sorted.sort((a, b) => (b.credit_score ?? 0) - (a.credit_score ?? 0));
        if (sortBy === 'ending_soon') sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        setLoans(sorted);
      }
      setActiveLoan(MOCK_ACTIVE_LOAN);
    } catch {
      let sorted = [...MOCK_LOANS];
      if (sortBy === 'credit_score') sorted.sort((a, b) => (b.credit_score ?? 0) - (a.credit_score ?? 0));
      if (sortBy === 'ending_soon') sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      setLoans(sorted);
      setActiveLoan(MOCK_ACTIVE_LOAN);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const filteredLoans = loans.filter((l) => {
    const matchPurpose = selectedPurpose === 'all' || (l.purpose || '') === selectedPurpose;
    const matchSearch = !searchQuery.trim() || (l.borrower_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.business_plan || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchPurpose && matchSearch;
  });

  const handleRequestSubmit = async () => {
    if (!requestForm.amount || !requestForm.purpose || !requestForm.fullName?.trim() || !requestForm.phone?.trim()) {
      return;
    }
    try {
      await api.microcredit.createRequest({
        product_id: selectedProduct?.id,
        amount: Number(requestForm.amount),
        purpose: requestForm.purpose,
        full_name: requestForm.fullName.trim(),
        phone: requestForm.phone.trim(),
        monthly_income: requestForm.monthlyIncome ? Number(requestForm.monthlyIncome) : undefined,
      });
      setRequestModalOpen(false);
      setRequestStep(1);
      setSelectedProduct(null);
      setRequestForm({ amount: '', purpose: '', fullName: '', phone: '', monthlyIncome: '' });
      setSuccessModalOpen(true);
    } catch (e) {
      console.warn(e);
    }
  };

  const progressPct = (current, requested) => {
    if (!requested || requested <= 0) return 0;
    return Math.min(100, Math.round((Number(current) / Number(requested)) * 100));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#059669" />
        </TouchableOpacity>
        <Text style={styles.title}>Microcrédit</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selectedPurpose === c.id && styles.chipActive]}
            onPress={() => setSelectedPurpose(c.id)}
          >
            <Text style={[styles.chipText, selectedPurpose === c.id && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Trier :</Text>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'newest' && styles.sortBtnActive]} onPress={() => setSortBy('newest')}>
          <Text style={[styles.sortBtnText, sortBy === 'newest' && styles.sortBtnTextActive]}>Plus récents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'credit_score' && styles.sortBtnActive]} onPress={() => setSortBy('credit_score')}>
          <Text style={[styles.sortBtnText, sortBy === 'credit_score' && styles.sortBtnTextActive]}>Score crédit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'ending_soon' && styles.sortBtnActive]} onPress={() => setSortBy('ending_soon')}>
          <Text style={[styles.sortBtnText, sortBy === 'ending_soon' && styles.sortBtnTextActive]}>Bientôt terminés</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeLoan && (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>Mon prêt actif</Text>
            <Text style={styles.activeRepaid}>
              Remboursé : {Math.round((Number(activeLoan.repaidAmount || 0) / Number(activeLoan.totalAmount || 1)) * 100)}%
            </Text>
            <Text style={styles.activeNext}>Prochain paiement : {activeLoan.nextPaymentDate} — {Number(activeLoan.nextPaymentAmount || 0).toLocaleString('fr-FR')} FCFA</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Demander un prêt</Text>
        <View style={styles.productsRow}>
          {CREDIT_PRODUCTS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.productCard}
              onPress={() => {
                setSelectedProduct(p);
                setRequestStep(1);
                setRequestModalOpen(true);
              }}
            >
              <Ionicons name={p.icon} size={28} color="#059669" />
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productDesc}>{p.description}</Text>
              <Text style={styles.productMax}>Jusqu'à {Number(p.maxAmount).toLocaleString('fr-FR')} FCFA</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Prêts en cours</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#059669" style={styles.loader} />
        ) : (
          filteredLoans.map((loan) => (
            <View key={loan.id} style={styles.loanCard}>
              <Text style={styles.loanBorrower}>{loan.borrower_name}</Text>
              <Text style={styles.loanPlan} numberOfLines={1}>{loan.business_plan}</Text>
              <Text style={styles.loanPurpose}>Objectif : {loan.purpose}</Text>
              <Text style={styles.loanAmount}>
                {Number(loan.current_amount || 0).toLocaleString('fr-FR')} / {Number(loan.amount_requested || 0).toLocaleString('fr-FR')} FCFA
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct(loan.current_amount, loan.amount_requested)}%` }]} />
              </View>
              <View style={styles.loanMeta}>
                <Text style={styles.loanMetaItem}>Taux {loan.interest_rate}%</Text>
                <Text style={styles.loanMetaItem}>{loan.repayment_period_months} mois</Text>
                <Text style={styles.loanMetaItem}>{loan.lenders_count} prêteurs</Text>
                <Text style={styles.loanMetaItem}>Score {loan.credit_score ?? '—'}</Text>
              </View>
              <Text style={styles.loanDeadline}>Échéance : {new Date(loan.deadline).toLocaleDateString('fr-FR')}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={requestModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{requestStep === 1 ? 'Choisir un produit' : 'Demande de prêt'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setRequestModalOpen(false);
                  setRequestStep(1);
                  setSelectedProduct(null);
                }}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {requestStep === 1 ? (
              <>
                {CREDIT_PRODUCTS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.modalProductRow, selectedProduct?.id === p.id && styles.modalProductRowActive]}
                    onPress={() => {
                      setSelectedProduct(p);
                      setRequestStep(2);
                      setRequestForm((f) => ({ ...f, amount: String(p.maxAmount ?? '') }));
                    }}
                  >
                    <Text style={styles.modalProductName}>{p.name}</Text>
                    <Text style={styles.modalProductMax}>Max {Number(p.maxAmount).toLocaleString('fr-FR')} FCFA</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <ScrollView>
                <Text style={styles.modalLabel}>Montant (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={requestForm.amount}
                  onChangeText={(v) => setRequestForm((f) => ({ ...f, amount: v }))}
                  placeholder="Montant"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
                <Text style={styles.modalLabel}>Objectif</Text>
                <View style={styles.pickerWrap}>
                  {LOAN_PURPOSE_OPTIONS.filter((o) => o.value).map((o) => (
                    <TouchableOpacity
                      key={o.value}
                      style={[styles.chip, requestForm.purpose === o.value && styles.chipActive]}
                      onPress={() => setRequestForm((f) => ({ ...f, purpose: o.value }))}
                    >
                      <Text style={[styles.chipText, requestForm.purpose === o.value && styles.chipTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalLabel}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={requestForm.fullName}
                  onChangeText={(v) => setRequestForm((f) => ({ ...f, fullName: v }))}
                  placeholder="Nom complet"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.modalLabel}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  value={requestForm.phone}
                  onChangeText={(v) => setRequestForm((f) => ({ ...f, phone: v }))}
                  placeholder="Téléphone"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
                <Text style={styles.modalLabel}>Revenus mensuels (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={requestForm.monthlyIncome}
                  onChangeText={(v) => setRequestForm((f) => ({ ...f, monthlyIncome: v }))}
                  placeholder="Optionnel"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestSubmit}>
                  <Text style={styles.primaryBtnText}>Envoyer la demande</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={successModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={64} color="#059669" style={styles.successIcon} />
            <Text style={styles.successTitle}>Demande enregistrée</Text>
            <Text style={styles.successSub}>Nous vous recontacterons sous peu.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setSuccessModalOpen(false)}>
              <Text style={styles.primaryBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: '#0f172a' },
  chipsRow: { paddingLeft: 16, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#dcfce7', marginRight: 8 },
  chipActive: { backgroundColor: '#059669' },
  chipText: { fontSize: 13, color: '#166534' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 12 },
  sortLabel: { fontSize: 13, color: '#64748b', marginRight: 8 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8, backgroundColor: '#e2e8f0' },
  sortBtnActive: { backgroundColor: '#059669' },
  sortBtnText: { fontSize: 12, color: '#475569' },
  sortBtnTextActive: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  activeCard: { backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#86efac' },
  activeTitle: { fontSize: 16, fontWeight: '700', color: '#166534' },
  activeRepaid: { fontSize: 14, color: '#15803d', marginTop: 6 },
  activeNext: { fontSize: 13, color: '#166534', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  productsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  productCard: { width: '31%', minWidth: 100, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  productName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  productDesc: { fontSize: 11, color: '#64748b', marginTop: 4 },
  productMax: { fontSize: 12, color: '#059669', marginTop: 6 },
  loader: { marginVertical: 24 },
  loanCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  loanBorrower: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  loanPlan: { fontSize: 13, color: '#64748b', marginTop: 4 },
  loanPurpose: { fontSize: 12, color: '#059669', marginTop: 4 },
  loanAmount: { fontSize: 13, color: '#374151', marginTop: 8 },
  progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },
  loanMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 12 },
  loanMetaItem: { fontSize: 12, color: '#64748b' },
  loanDeadline: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalLabel: { fontSize: 13, color: '#64748b', marginTop: 12, marginBottom: 4 },
  modalProductRow: { padding: 14, borderRadius: 10, backgroundColor: '#f1f5f9', marginBottom: 8 },
  modalProductRowActive: { backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#059669' },
  modalProductName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  modalProductMax: { fontSize: 13, color: '#059669', marginTop: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: { backgroundColor: '#059669', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  successIcon: { alignSelf: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
});
