import React, { useCallback, useEffect, useState } from 'react';
import {
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

const MOCK_POLICIES = [
  { id: 1, type: 'Santé', provider: 'NSIA Assurances', status: 'active', nextPayment: '15 Mars 2027', premium: 5000 },
  { id: 2, type: 'Auto', provider: 'Sunu Assurances', status: 'active', nextPayment: '22 Mars 2027', premium: 15000 },
];

const insuranceTypes = [
  { id: 'health', name: 'Santé', price: 'À partir de 5 000 F/mois', premium: 5000 },
  { id: 'vehicle', name: 'Auto/Moto', price: 'À partir de 15 000 F/an', premium: 15000 },
  { id: 'property', name: 'Habitation', price: 'À partir de 10 000 F/an', premium: 10000 },
  { id: 'travel', name: 'Voyage', price: 'À partir de 3 000 F/voyage', premium: 3000 },
  { id: 'life', name: 'Vie', price: 'Sur devis', premium: null },
  { id: 'micro', name: 'Micro-assurance', price: 'À partir de 500 F/mois', premium: 500 },
];

const coverageByType = {
  health: ['Hospitalisation', 'Consultations', 'Médicaments', 'Analyses'],
  vehicle: ['Responsabilité civile', 'Dommages collision', 'Vol', 'Bris de glace'],
  property: ['Incendie', 'Vol', 'Dégâts des eaux', 'Responsabilité civile'],
  travel: ['Annulation', 'Rapatriement', 'Soins à l\'étranger', 'Bagages'],
  life: ['Décès', 'Invalidité', 'Épargne'],
  micro: ['Santé basique', 'Accident', 'Décès'],
};

const devisOffersByType = {
  health: [{ name: 'Pack Santé Essentiel', price: 5000 }, { name: 'Pack Santé Famille', price: 12000 }],
  vehicle: [{ name: 'RC seule', price: 15000 }, { name: 'Tous risques', price: 45000 }],
  property: [{ name: 'Multirisque Habitation', price: 10000 }],
  travel: [{ name: 'Voyage 7 jours', price: 3000 }],
  life: [{ name: 'Devis sur mesure', price: null }],
  micro: [{ name: 'Micro Santé', price: 500 }],
};

const PROVIDERS_FALLBACK = [
  { id: 'p1', name: 'NSIA Assurances', logo_url: null, rating: 4.5 },
  { id: 'p2', name: 'Sunu Assurances', logo_url: null, rating: 4.3 },
  { id: 'p3', name: 'Allianz', logo_url: null, rating: 4.7 },
  { id: 'p4', name: 'AXA', logo_url: null, rating: 4.4 },
];

export default function InsuranceScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [selectedType, setSelectedType] = useState('health');
  const [myPolicies, setMyPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [policyDetail, setPolicyDetail] = useState(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [prestataireOpen, setPrestataireOpen] = useState(false);
  const [devisOpen, setDevisOpen] = useState(false);
  const [subscribeForm, setSubscribeForm] = useState({ provider_id: '', premium: '', frequency: 'monthly' });
  const [claimForm, setClaimForm] = useState({ policy_id: '', incident_date: '', description: '', claim_amount: '' });
  const [prestataireForm, setPrestataireForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', address: '', city: '', description: '',
    types_offered: { health: false, vehicle: false, property: false, travel: false, life: false, micro: false },
    license_ref: '',
  });
  const [devisForm, setDevisForm] = useState({ offer_name: '', offer_price: '', fullName: '', phone: '', additionalInfo: '' });
  const [approvedProviders, setApprovedProviders] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const list = await api.insurance.policies.listMy();
      setMyPolicies(Array.isArray(list) && list.length > 0 ? list : MOCK_POLICIES);
    } catch {
      setMyPolicies(MOCK_POLICIES);
    } finally {
      setLoadingPolicies(false);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const list = await api.insurance.providers.list();
      setApprovedProviders(Array.isArray(list) && list.length > 0 ? list : PROVIDERS_FALLBACK);
    } catch {
      setApprovedProviders(PROVIDERS_FALLBACK);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
    loadProviders();
  }, [loadPolicies, loadProviders]);

  const currentTypeConfig = insuranceTypes.find((t) => t.id === selectedType) || insuranceTypes[0];
  const coverageList = coverageByType[selectedType] || coverageByType.health;
  const devisOffers = devisOffersByType[selectedType] || [];

  const handleSubscribeSubmit = async () => {
    if (!subscribeForm.provider_id || !subscribeForm.premium) {
      showToast('Veuillez remplir assureur et prime.', true);
      return;
    }
    try {
      await api.insurance.policies.subscribe({
        provider_id: subscribeForm.provider_id,
        premium: Number(subscribeForm.premium),
        frequency: subscribeForm.frequency,
        type: selectedType,
      });
      showToast('Souscription enregistrée.');
      setSubscribeOpen(false);
      setSubscribeForm({ provider_id: '', premium: '', frequency: 'monthly' });
      loadPolicies();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur souscription', true);
    }
  };

  const handleDevisSubmit = async () => {
    const offer = devisOffers[0];
    if (!devisForm.fullName?.trim() || !devisForm.phone?.trim()) {
      showToast('Nom et téléphone requis.', true);
      return;
    }
    try {
      await api.insurance.quoteRequests.create({
        type: selectedType,
        offer_name: devisForm.offer_name || offer?.name,
        offer_price: devisForm.offer_price ? Number(devisForm.offer_price) : offer?.price,
        full_name: devisForm.fullName.trim(),
        phone: devisForm.phone.trim(),
        additional_info: devisForm.additionalInfo?.trim() || undefined,
      });
      showToast('Demande de devis envoyée.');
      setDevisOpen(false);
      setDevisForm({ offer_name: '', offer_price: '', fullName: '', phone: '', additionalInfo: '' });
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur devis', true);
    }
  };

  const handleClaimSubmit = async () => {
    if (!claimForm.policy_id || !claimForm.incident_date || !claimForm.description?.trim()) {
      showToast('Remplissez au moins police, date et description.', true);
      return;
    }
    try {
      await api.insurance.claims.create({
        policy_id: claimForm.policy_id,
        incident_date: claimForm.incident_date,
        description: claimForm.description.trim(),
        claim_amount: claimForm.claim_amount ? Number(claimForm.claim_amount) : undefined,
      });
      showToast('Sinistre déclaré.');
      setClaimOpen(false);
      setClaimForm({ policy_id: '', incident_date: '', description: '', claim_amount: '' });
      setPolicyDetail(null);
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur déclaration', true);
    }
  };

  const handlePrestataireSubmit = async () => {
    if (!prestataireForm.company_name?.trim() || !prestataireForm.contact_name?.trim() || !prestataireForm.email?.trim() || !prestataireForm.phone?.trim()) {
      showToast('Company, contact, email et téléphone requis.', true);
      return;
    }
    try {
      await api.insurance.providers.register({
        company_name: prestataireForm.company_name.trim(),
        contact_name: prestataireForm.contact_name.trim(),
        email: prestataireForm.email.trim(),
        phone: prestataireForm.phone.trim(),
        address: prestataireForm.address?.trim(),
        city: prestataireForm.city?.trim(),
        description: prestataireForm.description?.trim(),
        types_offered: Object.keys(prestataireForm.types_offered).filter((k) => prestataireForm.types_offered[k]),
        license_ref: prestataireForm.license_ref?.trim(),
      });
      showToast('Demande enregistrée. Nous vous recontacterons.');
      setPrestataireOpen(false);
      setPrestataireForm({
        company_name: '', contact_name: '', email: '', phone: '', address: '', city: '', description: '',
        types_offered: { health: false, vehicle: false, property: false, travel: false, life: false, micro: false },
        license_ref: '',
      });
    } catch (e) {
      showToast(e?.response?.data?.message || 'Erreur inscription', true);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#60a5fa" />
          </TouchableOpacity>
          <Text style={styles.title}>Assurances</Text>
        </View>

        <Text style={styles.sectionTitle}>Mes assurances</Text>
        {loadingPolicies ? (
          <Text style={styles.muted}>Chargement...</Text>
        ) : (
          <View style={styles.cardsRow}>
            {myPolicies.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.policyCard}
                onPress={() => setPolicyDetail(p)}
              >
                <Text style={styles.policyType}>{p.type}</Text>
                <Text style={styles.policyProvider} numberOfLines={1}>{p.provider}</Text>
                <Text style={styles.policyNext}>Prochaine échéance: {p.nextPayment}</Text>
                <Text style={styles.policyPremium}>{Number(p.premium).toLocaleString('fr-FR')} FCFA</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Types d'assurance</Text>
        <View style={styles.grid}>
          {insuranceTypes.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeCard, selectedType === t.id && styles.typeCardSelected]}
              onPress={() => setSelectedType(t.id)}
            >
              <Text style={styles.typeName}>{t.name}</Text>
              <Text style={styles.typePrice}>{t.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Assurance {currentTypeConfig.name}</Text>
          {coverageList.map((c, i) => (
            <Text key={i} style={styles.coverageItem}>• {c}</Text>
          ))}
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setSubscribeOpen(true)}>
              <Text style={styles.primaryBtnText}>Souscrire maintenant</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDevisOpen(true)}>
              <Text style={styles.outlineBtnText}>Demander un devis</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Compagnies d'assurance</Text>
        {approvedProviders.map((pr) => (
          <View key={pr.id} style={styles.providerRow}>
            <View style={styles.providerLogo}>
              <Ionicons name="business" size={24} color="#60a5fa" />
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{pr.name}</Text>
              <Text style={styles.providerRating}>★ {pr.rating ?? 4}</Text>
            </View>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Voir offres</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.actionCard} onPress={() => setPrestataireOpen(true)}>
          <Ionicons name="person-add" size={28} color="#60a5fa" />
          <Text style={styles.actionCardTitle}>Vous êtes assureur ?</Text>
          <Text style={styles.actionCardSub}>Devenir prestataire</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setClaimOpen(true)}>
          <Ionicons name="warning" size={28} color="#f59e0b" />
          <Text style={styles.actionCardTitle}>Déclarer un sinistre</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setDocsOpen(true)}>
          <Ionicons name="document-text" size={28} color="#94a3b8" />
          <Text style={styles.actionCardTitle}>Documents & Aide</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast && (
        <View style={[styles.toast, toast.isError && styles.toastError]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Modal Policy detail */}
      <Modal visible={!!policyDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail assurance</Text>
              <TouchableOpacity onPress={() => setPolicyDetail(null)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            {policyDetail && (
              <>
                <Text style={styles.modalLabel}>Type: {policyDetail.type}</Text>
                <Text style={styles.modalLabel}>Assureur: {policyDetail.provider}</Text>
                <Text style={styles.modalLabel}>Prochaine échéance: {policyDetail.nextPayment}</Text>
                <Text style={styles.modalLabel}>Prime: {Number(policyDetail.premium).toLocaleString('fr-FR')} FCFA</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => setPolicyDetail(null)}>
                    <Text style={styles.outlineBtnText}>Fermer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => {
                      setClaimForm((f) => ({ ...f, policy_id: String(policyDetail.id) }));
                      setPolicyDetail(null);
                      setClaimOpen(true);
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Déclarer sinistre</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Subscribe */}
      <Modal visible={subscribeOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Souscrire</Text>
              <TouchableOpacity onPress={() => setSubscribeOpen(false)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Assureur</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {approvedProviders.map((pr) => (
                <TouchableOpacity
                  key={pr.id}
                  style={[styles.chip, subscribeForm.provider_id === pr.id && styles.chipSelected]}
                  onPress={() => setSubscribeForm((f) => ({ ...f, provider_id: pr.id }))}
                >
                  <Text style={[styles.chipText, subscribeForm.provider_id === pr.id && styles.chipTextSelected]}>{pr.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Prime (FCFA)</Text>
            <TextInput
              style={styles.input}
              value={subscribeForm.premium}
              onChangeText={(v) => setSubscribeForm((f) => ({ ...f, premium: v }))}
              placeholder="Ex: 5000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
            <Text style={styles.modalLabel}>Fréquence</Text>
            <View style={styles.row}>
              {['monthly', 'quarterly', 'yearly'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.chip, subscribeForm.frequency === freq && styles.chipSelected]}
                  onPress={() => setSubscribeForm((s) => ({ ...s, frequency: freq }))}
                >
                  <Text style={[styles.chipText, subscribeForm.frequency === freq && styles.chipTextSelected]}>
                    {freq === 'monthly' ? 'Mensuel' : freq === 'quarterly' ? 'Trimestriel' : 'Annuel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubscribeSubmit}>
              <Text style={styles.primaryBtnText}>Souscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Devis */}
      <Modal visible={devisOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demander un devis</Text>
              <TouchableOpacity onPress={() => setDevisOpen(false)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            {devisOffers.length > 0 && (
              <>
                <Text style={styles.modalLabel}>Offre</Text>
                <TextInput
                  style={styles.input}
                  value={devisForm.offer_name}
                  onChangeText={(v) => setDevisForm((f) => ({ ...f, offer_name: v }))}
                  placeholder={devisOffers[0]?.name}
                  placeholderTextColor="#64748b"
                />
                <Text style={styles.modalLabel}>Prix (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={devisForm.offer_price}
                  onChangeText={(v) => setDevisForm((f) => ({ ...f, offer_price: v }))}
                  placeholder={devisOffers[0]?.price != null ? String(devisOffers[0].price) : 'Sur devis'}
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
              </>
            )}
            <Text style={styles.modalLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={devisForm.fullName}
              onChangeText={(v) => setDevisForm((f) => ({ ...f, fullName: v }))}
              placeholder="Nom complet"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.modalLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={devisForm.phone}
              onChangeText={(v) => setDevisForm((f) => ({ ...f, phone: v }))}
              placeholder="Téléphone"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
            <Text style={styles.modalLabel}>Informations complémentaires</Text>
            <TextInput
              style={[styles.input, styles.inputArea]}
              value={devisForm.additionalInfo}
              onChangeText={(v) => setDevisForm((f) => ({ ...f, additionalInfo: v }))}
              placeholder="Optionnel"
              placeholderTextColor="#64748b"
              multiline
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleDevisSubmit}>
              <Text style={styles.primaryBtnText}>Envoyer la demande</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Claim */}
      <Modal visible={claimOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Déclarer un sinistre</Text>
              <TouchableOpacity onPress={() => setClaimOpen(false)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Police</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {myPolicies.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, claimForm.policy_id === String(p.id) && styles.chipSelected]}
                  onPress={() => setClaimForm((f) => ({ ...f, policy_id: String(p.id) }))}
                >
                  <Text style={[styles.chipText, claimForm.policy_id === String(p.id) && styles.chipTextSelected]}>{p.type} - {p.provider}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Date de l'incident</Text>
            <TextInput
              style={styles.input}
              value={claimForm.incident_date}
              onChangeText={(v) => setClaimForm((f) => ({ ...f, incident_date: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputArea]}
              value={claimForm.description}
              onChangeText={(v) => setClaimForm((f) => ({ ...f, description: v }))}
              placeholder="Décrivez les faits"
              placeholderTextColor="#64748b"
              multiline
            />
            <Text style={styles.modalLabel}>Montant réclamé (FCFA)</Text>
            <TextInput
              style={styles.input}
              value={claimForm.claim_amount}
              onChangeText={(v) => setClaimForm((f) => ({ ...f, claim_amount: v }))}
              placeholder="Optionnel"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleClaimSubmit}>
              <Text style={styles.primaryBtnText}>Déclarer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Documents & Aide */}
      <Modal visible={docsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Documents & Aide</Text>
              <TouchableOpacity onPress={() => setDocsOpen(false)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              Consultez vos documents d'assurance dans "Mes assurances". Pour toute question, contactez le support ou votre assureur.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setDocsOpen(false)}>
              <Text style={styles.primaryBtnText}>Compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Prestataire */}
      <Modal visible={prestataireOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Devenir prestataire</Text>
                <TouchableOpacity onPress={() => setPrestataireOpen(false)}>
                  <Ionicons name="close" size={24} color="#e2e8f0" />
                </TouchableOpacity>
              </View>
              {['company_name', 'contact_name', 'email', 'phone', 'address', 'city', 'description', 'license_ref'].map((key) => (
                <React.Fragment key={key}>
                  <Text style={styles.modalLabel}>
                    {key === 'company_name' && 'Société'}
                    {key === 'contact_name' && 'Contact'}
                    {key === 'email' && 'Email'}
                    {key === 'phone' && 'Téléphone'}
                    {key === 'address' && 'Adresse'}
                    {key === 'city' && 'Ville'}
                    {key === 'description' && 'Description'}
                    {key === 'license_ref' && 'Réf. agrément'}
                  </Text>
                  <TextInput
                    style={key === 'description' ? [styles.input, styles.inputArea] : styles.input}
                    value={prestataireForm[key]}
                    onChangeText={(v) => setPrestataireForm((f) => ({ ...f, [key]: v }))}
                    placeholder={key}
                    placeholderTextColor="#64748b"
                    multiline={key === 'description'}
                  />
                </React.Fragment>
              ))}
              <Text style={styles.modalLabel}>Types proposés</Text>
              {Object.keys(prestataireForm.types_offered).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.checkRow}
                  onPress={() => setPrestataireForm((f) => ({
                    ...f,
                    types_offered: { ...f.types_offered, [t]: !f.types_offered[t] },
                  }))}
                >
                  <Ionicons name={prestataireForm.types_offered[t] ? 'checkbox' : 'square-outline'} size={22} color="#60a5fa" />
                  <Text style={styles.checkLabel}>{insuranceTypes.find((i) => i.id === t)?.name || t}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.primaryBtn} onPress={handlePrestataireSubmit}>
                <Text style={styles.primaryBtnText}>Envoyer la demande</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginBottom: 10 },
  muted: { color: '#64748b', marginBottom: 12 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  policyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, width: '48%', minWidth: 140 },
  policyType: { fontSize: 16, fontWeight: '700', color: '#fff' },
  policyProvider: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  policyNext: { fontSize: 12, color: '#64748b', marginTop: 4 },
  policyPremium: { fontSize: 14, fontWeight: '600', color: '#60a5fa', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, width: '48%', minWidth: 140 },
  typeCardSelected: { borderWidth: 2, borderColor: '#3b82f6' },
  typeName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  typePrice: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  detailCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  coverageItem: { fontSize: 14, color: '#e2e8f0', marginBottom: 4 },
  detailActions: { marginTop: 16, gap: 10 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: '#475569', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  outlineBtnText: { color: '#94a3b8' },
  providerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 10 },
  providerLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  providerRating: { fontSize: 13, color: '#eab308', marginTop: 2 },
  linkBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  linkBtnText: { color: '#60a5fa', fontWeight: '600' },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
  actionCardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 12, flex: 1 },
  actionCardSub: { fontSize: 13, color: '#94a3b8' },
  toast: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#22c55e', padding: 14, borderRadius: 10 },
  toastError: { backgroundColor: '#dc2626' },
  toastText: { color: '#fff', textAlign: 'center', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalLabel: { fontSize: 13, color: '#94a3b8', marginTop: 10, marginBottom: 4 },
  modalBodyText: { color: '#e2e8f0', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  input: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15 },
  inputArea: { minHeight: 80 },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#334155', marginRight: 8 },
  chipSelected: { backgroundColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkLabel: { color: '#e2e8f0', marginLeft: 8 },
});
