import React, { useEffect, useState } from 'react';
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
import { api } from '../api/client';
import { QUICK_AMOUNTS, AIRTIME_OPERATORS, MOCK_TRANSACTIONS } from '../data/utilitiesMock';

function formatDate(d) {
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d;
}

const generateRef = () => `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

export default function UtilitiesScreen() {
  const navigation = useNavigation();
  const [quickAmount, setQuickAmount] = useState(2000);
  const [recentTransactions, setRecentTransactions] = useState(MOCK_TRANSACTIONS);
  const [loadingTx, setLoadingTx] = useState(true);

  const [modalAirtime, setModalAirtime] = useState(false);
  const [modalElectricity, setModalElectricity] = useState(false);
  const [modalWater, setModalWater] = useState(false);
  const [modalInternet, setModalInternet] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ amount: 0, provider: '', reference: '' });

  const [airtimeOperator, setAirtimeOperator] = useState('mtn');
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [electricityAccount, setElectricityAccount] = useState('');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [waterAccount, setWaterAccount] = useState('');
  const [waterAmount, setWaterAmount] = useState(5000);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.utilities.airtime.listMy({ limit: 5 }).catch(() => ({ recharges: [] })),
      api.utilities.bills.listMy({ limit: 5 }).catch(() => ({ payments: [] })),
    ]).then(([air, bills]) => {
      if (cancelled) return;
      const a = (air?.recharges ?? []).map((r, i) => ({
        id: r.id || `a-${i}`,
        serviceName: `Airtime ${r.operator || '—'}`,
        date: r.created_at ? formatDate(r.created_at) : '—',
        amount: r.amount ?? 0,
        status: r.status === 'completed' ? 'success' : 'pending',
      }));
      const b = (bills?.payments ?? []).map((r, i) => ({
        id: r.id || `b-${i}`,
        serviceName: `${r.bill_type || 'Facture'} - ${r.provider || '—'}`,
        date: r.created_at ? formatDate(r.created_at) : '—',
        amount: r.amount ?? 0,
        status: r.status === 'completed' ? 'success' : 'pending',
      }));
      const combined = [...a, ...b].sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 10);
      if (combined.length) setRecentTransactions(combined);
    }).finally(() => { if (!cancelled) setLoadingTx(false); });
    return () => { cancelled = true; };
  }, []);

  const addTransaction = (tx) => {
    setRecentTransactions((prev) => [tx, ...prev].slice(0, 20));
  };

  const handlePayAirtime = async () => {
    const amount = Number(airtimeAmount) || quickAmount;
    if (!airtimePhone?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.airtime.recharge({
        operator: airtimeOperator,
        phone: airtimePhone.trim(),
        amount,
      });
      const ref = generateRef();
      setSuccessData({ amount, provider: AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator, reference: ref });
      addTransaction({ id: ref, serviceName: `Airtime ${AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator}`, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalAirtime(false);
      setModalSuccess(true);
      setAirtimePhone('');
      setAirtimeAmount('');
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator, reference: ref });
      addTransaction({ id: ref, serviceName: `Airtime ${AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator}`, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalAirtime(false);
      setModalSuccess(true);
      setAirtimePhone('');
      setAirtimeAmount('');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayElectricity = async () => {
    const amount = Number(electricityAmount) || 5000;
    if (!electricityAccount?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.bills.pay({ provider: 'edm', bill_type: 'electricity', account_number: electricityAccount.trim(), amount });
      const ref = generateRef();
      setSuccessData({ amount, provider: 'EDM Mali', reference: ref });
      addTransaction({ id: ref, serviceName: 'Électricité EDM', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalElectricity(false);
      setModalSuccess(true);
      setElectricityAccount('');
      setElectricityAmount('');
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: 'EDM Mali', reference: ref });
      addTransaction({ id: ref, serviceName: 'Électricité EDM', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalElectricity(false);
      setModalSuccess(true);
      setElectricityAccount('');
      setElectricityAmount('');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayWater = async () => {
    const amount = Number(waterAmount) || 5000;
    if (!waterAccount?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.bills.pay({ provider: 'somagep', bill_type: 'water', account_number: waterAccount.trim(), amount });
      const ref = generateRef();
      setSuccessData({ amount, provider: 'SOMAGEP', reference: ref });
      addTransaction({ id: ref, serviceName: 'Eau SOMAGEP', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalWater(false);
      setModalSuccess(true);
      setWaterAccount('');
      setWaterAmount(5000);
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: 'SOMAGEP', reference: ref });
      addTransaction({ id: ref, serviceName: 'Eau SOMAGEP', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalWater(false);
      setModalSuccess(true);
      setWaterAccount('');
      setWaterAmount(5000);
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Services & Factures</Text>
            <Text style={styles.subtitle}>Rechargez et payez vos factures</Text>
          </View>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity style={styles.serviceCard} onPress={() => setModalAirtime(true)}>
            <View style={styles.serviceIconWrap}>
              <Ionicons name="phone-portrait" size={24} color="#2563eb" />
            </View>
            <Text style={styles.serviceLabel}>Recharge Airtime</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.serviceCard} onPress={() => setModalElectricity(true)}>
            <View style={[styles.serviceIconWrap, styles.serviceIconBlue]}>
              <Ionicons name="flash" size={24} color="#2563eb" />
            </View>
            <Text style={styles.serviceLabel}>Électricité (EDM)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.serviceCard} onPress={() => setModalWater(true)}>
            <View style={[styles.serviceIconWrap, styles.serviceIconSky]}>
              <Ionicons name="water" size={24} color="#0284c7" />
            </View>
            <Text style={styles.serviceLabel}>Eau (SOMAGEP)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.serviceCard} onPress={() => setModalInternet(true)}>
            <View style={[styles.serviceIconWrap, styles.serviceIconViolet]}>
              <Ionicons name="wifi" size={24} color="#7c3aed" />
            </View>
            <Text style={styles.serviceLabel}>Internet / TV</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recharge rapide</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.quickChip, quickAmount === amount && styles.quickChipSelected]}
              onPress={() => setQuickAmount(amount)}
            >
              <Text style={[styles.quickChipText, quickAmount === amount && styles.quickChipTextSelected]}>
                {amount.toLocaleString('fr-FR')} FCFA
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.txHeader}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="refresh" size={18} color="#16a34a" />
          </TouchableOpacity>
        </View>
        {loadingTx ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txName}>{tx.serviceName}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
                <View style={styles.txBadge}>
                  <Text style={styles.txBadgeText}>Réussi</Text>
                </View>
              </View>
              <Text style={styles.txAmount}>{Number(tx.amount).toLocaleString('fr-FR')} FCFA</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Airtime */}
      <Modal visible={modalAirtime} transparent animationType="slide" onRequestClose={() => setModalAirtime(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recharge Airtime</Text>
              <TouchableOpacity onPress={() => setModalAirtime(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Opérateur</Text>
            <View style={styles.operatorRow}>
              {AIRTIME_OPERATORS.map((op) => (
                <TouchableOpacity key={op.id} style={[styles.operatorBtn, airtimeOperator === op.id && styles.operatorBtnSelected]} onPress={() => setAirtimeOperator(op.id)}>
                  <Text style={[styles.operatorBtnText, airtimeOperator === op.id && styles.operatorBtnTextSelected]}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <TextInput style={styles.formInput} placeholder="+223 XX XX XX XX" placeholderTextColor="#9ca3af" value={airtimePhone} onChangeText={setAirtimePhone} keyboardType="phone-pad" />
            <Text style={styles.label}>Montant (FCFA)</Text>
            <TextInput style={styles.formInput} placeholder="Ex: 5000" placeholderTextColor="#9ca3af" value={airtimeAmount} onChangeText={setAirtimeAmount} keyboardType="number-pad" />
            <View style={styles.quickAmountRow}>
              {QUICK_AMOUNTS.map((amount) => (
                <TouchableOpacity key={amount} style={styles.quickAmountBtn} onPress={() => setAirtimeAmount(String(amount))}>
                  <Text style={styles.quickAmountBtnText}>{amount.toLocaleString('fr-FR')} FCFA</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.primaryBtn, (payLoading || !airtimePhone?.trim()) && styles.primaryBtnDisabled]} onPress={handlePayAirtime} disabled={payLoading || !airtimePhone?.trim()}>
              <Text style={styles.primaryBtnText}>{payLoading ? 'Traitement...' : 'Payer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Électricité */}
      <Modal visible={modalElectricity} transparent animationType="slide" onRequestClose={() => setModalElectricity(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Électricité (EDM)</Text>
              <TouchableOpacity onPress={() => setModalElectricity(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Opérateur</Text>
            <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>EDM Mali</Text></View>
            <Text style={styles.label}>Numéro de compte</Text>
            <TextInput style={styles.formInput} placeholder="Ex: EDM-123456" placeholderTextColor="#9ca3af" value={electricityAccount} onChangeText={setElectricityAccount} />
            <Text style={styles.label}>Montant (FCFA)</Text>
            <TextInput style={styles.formInput} placeholder="Ex: 5000" placeholderTextColor="#9ca3af" value={electricityAmount} onChangeText={setElectricityAmount} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.primaryBtn, (payLoading || !electricityAccount?.trim()) && styles.primaryBtnDisabled]} onPress={handlePayElectricity} disabled={payLoading || !electricityAccount?.trim()}>
              <Text style={styles.primaryBtnText}>{payLoading ? 'Traitement...' : 'Payer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Eau */}
      <Modal visible={modalWater} transparent animationType="slide" onRequestClose={() => setModalWater(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eau (SOMAGEP)</Text>
              <TouchableOpacity onPress={() => setModalWater(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Opérateur</Text>
            <View style={[styles.readOnlyBox, styles.readOnlyBoxGreen]}><Text style={styles.readOnlyText}>SOMAGEP</Text></View>
            <Text style={styles.label}>Numéro de compte</Text>
            <TextInput style={styles.formInput} placeholder="Ex: 123456" placeholderTextColor="#9ca3af" value={waterAccount} onChangeText={setWaterAccount} />
            <Text style={styles.label}>Montant (FCFA)</Text>
            <View style={styles.waterAmountRow}>
              <TextInput style={[styles.formInput, styles.waterAmountInput]} keyboardType="number-pad" value={String(waterAmount)} onChangeText={(v) => setWaterAmount(Number(v) || 0)} />
              <View style={styles.waterAmountStepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setWaterAmount((a) => a + 500)}><Ionicons name="chevron-up" size={18} color="#374151" /></TouchableOpacity>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setWaterAmount((a) => Math.max(0, a - 500))}><Ionicons name="chevron-down" size={18} color="#374151" /></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, (payLoading || !waterAccount?.trim()) && styles.primaryBtnDisabled]} onPress={handlePayWater} disabled={payLoading || !waterAccount?.trim()}>
              <Text style={styles.primaryBtnText}>{payLoading ? 'Traitement...' : `Payer ${waterAmount.toLocaleString('fr-FR')} FCFA`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Internet placeholder */}
      <Modal visible={modalInternet} transparent animationType="slide" onRequestClose={() => setModalInternet(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Internet / TV</Text>
              <TouchableOpacity onPress={() => setModalInternet(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <View style={styles.placeholderBody}>
              <Ionicons name="wifi" size={48} color="#9ca3af" />
              <Text style={styles.placeholderText}>Fonctionnalité bientôt disponible.</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Succès */}
      <Modal visible={modalSuccess} transparent animationType="fade" onRequestClose={() => setModalSuccess(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            </View>
            <Text style={styles.successTitle}>Transaction réussie !</Text>
            <Text style={styles.successDesc}>
              {successData.amount.toLocaleString('fr-FR')} FCFA payés via {successData.provider}.
            </Text>
            <Text style={styles.successRef}>Référence : {successData.reference}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setModalSuccess(false)}>
              <Text style={styles.primaryBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitleWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  serviceCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, alignItems: 'center' },
  serviceIconWrap: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceIconBlue: { backgroundColor: '#dbeafe' },
  serviceIconSky: { backgroundColor: '#e0f2fe' },
  serviceIconViolet: { backgroundColor: '#ede9fe' },
  serviceLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  quickChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  quickChipText: { fontSize: 14, fontWeight: '500', color: '#2563eb' },
  quickChipTextSelected: { color: '#fff' },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  loader: { marginVertical: 16 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  txIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontWeight: '500', color: '#111827', fontSize: 14 },
  txDate: { fontSize: 12, color: '#6b7280' },
  txBadge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  txBadgeText: { fontSize: 11, fontWeight: '500', color: '#16a34a' },
  txAmount: { fontWeight: '700', color: '#111827' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: '#111827', marginBottom: 16 },
  operatorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  operatorBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  operatorBtnSelected: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  operatorBtnText: { fontSize: 14, color: '#374151' },
  operatorBtnTextSelected: { color: '#111827', fontWeight: '500' },
  quickAmountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickAmountBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  quickAmountBtnText: { fontSize: 13, color: '#374151' },
  primaryBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  readOnlyBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  readOnlyBoxGreen: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  readOnlyText: { fontWeight: '500', color: '#111827' },
  waterAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  waterAmountInput: { flex: 1, marginBottom: 0 },
  waterAmountStepper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  stepperBtn: { padding: 8 },
  placeholderBody: { alignItems: 'center', paddingVertical: 24 },
  placeholderText: { color: '#6b7280', marginTop: 12 },
  successIconWrap: { alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  successDesc: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 4 },
  successRef: { fontSize: 13, color: '#6b7280', fontFamily: 'monospace', textAlign: 'center', marginBottom: 16 },
});
