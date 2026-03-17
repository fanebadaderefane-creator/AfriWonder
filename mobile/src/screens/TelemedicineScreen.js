import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { SPECIALTIES, MOCK_DOCTORS, SAMU_PHONE, CNHU_PHONE } from '../data/telemedicineMock';

const CONSULTATION_TYPES = [
  { id: 'video', label: 'Vidéo', icon: 'videocam' },
  { id: 'phone', label: 'Téléphone', icon: 'call' },
  { id: 'in_person', label: 'Présentiel', icon: 'person' },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

const DOCTOR_SPECIALTIES_FOR_REGISTER = [
  { id: 'general', label: 'Médecine générale' },
  { id: 'pediatrie', label: 'Pédiatrie' },
  { id: 'cardiologie', label: 'Cardiologie' },
  { id: 'dermatologie', label: 'Dermatologie' },
  { id: 'gynecologie', label: 'Gynécologie' },
  { id: 'dentiste', label: 'Dentiste' },
  { id: 'ophtalmologie', label: 'Ophtalmologie' },
  { id: 'psychiatrie', label: 'Psychiatrie' },
  { id: 'autre', label: 'Autre' },
];

export default function TelemedicineScreen() {
  const navigation = useNavigation();
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [doctors, setDoctors] = useState(MOCK_DOCTORS);
  const [loading, setLoading] = useState(true);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [consultationType, setConsultationType] = useState('video');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [prestataireModalOpen, setPrestataireModalOpen] = useState(false);
  const [prestataireSuccess, setPrestataireSuccess] = useState(false);
  const [prestataireLoading, setPrestataireLoading] = useState(false);
  const [prestataireError, setPrestataireError] = useState(null);
  const [prestataireForm, setPrestataireForm] = useState({
    full_name: '',
    specialty: 'general',
    phone: '',
    email: '',
    clinic_name: '',
    clinic_address: '',
    city: 'Bamako',
    consultation_fee: 15000,
  });

  useEffect(() => {
    let cancelled = false;
    api.health.doctors
      .list({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.doctors ?? [];
        if (list.length) {
          setDoctors(
            list.map((d) => ({
              id: d.id,
              name: d.full_name || d.name,
              specialty: d.specialty || 'Médecine générale',
              specialtyId: (d.specialty || '').toLowerCase().replace(/\s+/g, '_') || 'medecine_generale',
              rating: d.rating ?? 4.5,
              consultations: d.total_consultations ?? 0,
              nextSlot: d.next_available || "Aujourd'hui 14h00",
              fee: d.consultation_fee ?? 15000,
              avatar: d.profile_photo || d.avatar || 'https://i.pravatar.cc/150?img=25',
            }))
          );
        }
      })
      .catch(() => { if (!cancelled) setDoctors(MOCK_DOCTORS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredDoctors =
    selectedSpecialty === 'all'
      ? doctors
      : doctors.filter((d) => (d.specialtyId || '').toLowerCase() === selectedSpecialty);

  const openBooking = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setConsultationType('video');
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;
    setConfirmLoading(true);
    try {
      await api.health.appointments.create({
        doctor_id: selectedDoctor.id,
        consultation_type: consultationType,
        slot: selectedSlot,
        amount: selectedDoctor.fee,
      });
      setBookingModalOpen(false);
      setSelectedDoctor(null);
      setSelectedSlot(null);
    } catch (e) {
      setBookingModalOpen(false);
      setSelectedDoctor(null);
      setSelectedSlot(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePrestataireSubmit = async () => {
    if (!prestataireForm.full_name?.trim() || !prestataireForm.phone?.trim()) {
      setPrestataireError('Veuillez remplir le nom et le téléphone.');
      return;
    }
    setPrestataireError(null);
    setPrestataireLoading(true);
    try {
      await api.health.doctors.create({
        full_name: prestataireForm.full_name.trim(),
        specialty: prestataireForm.specialty,
        phone: prestataireForm.phone.trim(),
        email: prestataireForm.email?.trim() || undefined,
        clinic_name: prestataireForm.clinic_name?.trim() || undefined,
        clinic_address: prestataireForm.clinic_address?.trim() || undefined,
        city: prestataireForm.city?.trim() || undefined,
        consultation_fee: Number(prestataireForm.consultation_fee) || undefined,
      });
      setPrestataireSuccess(true);
      setPrestataireForm({
        full_name: '',
        specialty: 'general',
        phone: '',
        email: '',
        clinic_name: '',
        clinic_address: '',
        city: 'Bamako',
        consultation_fee: 15000,
      });
    } catch (err) {
      setPrestataireError(err?.response?.data?.message || err?.message || 'Connectez-vous pour vous inscrire.');
    } finally {
      setPrestataireLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Santé & Télémédecine</Text>
            <Text style={styles.subtitle}>Consultez un médecin en ligne</Text>
          </View>
        </View>

        <View style={styles.urgenceCard}>
          <View style={styles.urgenceIcon}>
            <Ionicons name="call" size={20} color="#2563eb" />
          </View>
          <View style={styles.urgenceTextWrap}>
            <Text style={styles.urgenceTitle}>Urgence médicale ?</Text>
            <Text style={styles.urgenceDesc}>Appelez le SAMU: 15 ou le CNHU: +223 20 22 50 02</Text>
          </View>
          <TouchableOpacity style={styles.urgenceBtn} onPress={() => Linking.openURL(`tel:${SAMU_PHONE}`)}>
            <Text style={styles.urgenceBtnText}>Appeler</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={24} color="#2563eb" style={styles.statIcon} />
            <Text style={styles.statValue}>120+</Text>
            <Text style={styles.statLabel}>Médecins</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="videocam" size={24} color="#2563eb" style={styles.statIcon} />
            <Text style={styles.statValue}>5K+</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#2563eb" style={styles.statIcon} />
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
        </View>

        <View style={styles.filtersRow}>
          {SPECIALTIES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.filterChip, selectedSpecialty === s.id && styles.filterChipSelected]}
              onPress={() => setSelectedSpecialty(s.id)}
            >
              <Text style={[styles.filterChipText, selectedSpecialty === s.id && styles.filterChipTextSelected]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          filteredDoctors.map((doctor) => (
            <View key={doctor.id} style={styles.doctorCard}>
              <Image source={{ uri: doctor.avatar }} style={styles.doctorAvatar} />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                <View style={styles.doctorMeta}>
                  <Ionicons name="star" size={14} color="#2563eb" />
                  <Text style={styles.doctorRating}>{doctor.rating}</Text>
                  <Text style={styles.doctorConsultations}>({doctor.consultations} consultations)</Text>
                </View>
                <View style={styles.doctorSlot}>
                  <Ionicons name="time" size={14} color="#2563eb" />
                  <Text style={styles.doctorSlotText}>{doctor.nextSlot}</Text>
                </View>
                <View style={styles.doctorFooter}>
                  <View style={styles.doctorFeeWrap}>
                    <View style={styles.doctorFeeDot} />
                    <Text style={styles.doctorFee}>{Number(doctor.fee).toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  <TouchableOpacity style={styles.consultBtn} onPress={() => openBooking(doctor)}>
                    <Text style={styles.consultBtnText}>Consulter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.prestataireCard}>
          <Ionicons name="medkit" size={48} color="#2563eb" style={styles.prestataireIcon} />
          <Text style={styles.prestataireTitle}>Vous êtes médecin ?</Text>
          <Text style={styles.prestataireDesc}>
            Rejoignez la plateforme télémédecine. Votre profil sera validé par un administrateur avant d'être visible.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setPrestataireError(null);
              setPrestataireSuccess(false);
              setPrestataireModalOpen(true);
            }}
          >
            <Text style={styles.primaryBtnText}>Devenir partenaire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Réservation */}
      <Modal visible={bookingModalOpen} transparent animationType="slide" onRequestClose={() => setBookingModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDoctor ? `Consulter ${selectedDoctor.name}` : ''}</Text>
              <TouchableOpacity onPress={() => setBookingModalOpen(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            {selectedDoctor && (
              <>
                <View style={styles.modalDoctorRow}>
                  <Image source={{ uri: selectedDoctor.avatar }} style={styles.modalDoctorAvatar} />
                  <View>
                    <Text style={styles.modalDoctorName}>{selectedDoctor.name}</Text>
                    <Text style={styles.modalDoctorSpecialty}>{selectedDoctor.specialty}</Text>
                    <Text style={styles.modalDoctorFee}>{Number(selectedDoctor.fee).toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                </View>
                <Text style={styles.label}>Type de consultation</Text>
                <View style={styles.consultTypesRow}>
                  {CONSULTATION_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.consultTypeBtn, consultationType === t.id && styles.consultTypeBtnSelected]}
                      onPress={() => setConsultationType(t.id)}
                    >
                      <Ionicons name={t.icon} size={18} color={consultationType === t.id ? '#2563eb' : '#374151'} />
                      <Text style={[styles.consultTypeBtnText, consultationType === t.id && styles.consultTypeBtnTextSelected]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Choisir un créneau</Text>
                <View style={styles.slotsGrid}>
                  {TIME_SLOTS.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotBtn, selectedSlot === slot && styles.slotBtnSelected]}
                      onPress={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                    >
                      <Text style={[styles.slotBtnText, selectedSlot === slot && styles.slotBtnTextSelected]}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, (confirmLoading || !selectedSlot) && styles.primaryBtnDisabled]}
                  onPress={handleConfirmBooking}
                  disabled={confirmLoading || !selectedSlot}
                >
                  <Text style={styles.primaryBtnText}>
                    {confirmLoading ? 'Traitement...' : `Confirmer le rendez-vous - ${Number(selectedDoctor.fee).toLocaleString('fr-FR')} FCFA`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Inscription médecin */}
      <Modal
        visible={prestataireModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { setPrestataireModalOpen(false); setPrestataireSuccess(false); setPrestataireError(null); }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Inscription médecin</Text>
                <TouchableOpacity onPress={() => { setPrestataireModalOpen(false); setPrestataireSuccess(false); setPrestataireError(null); }}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              {prestataireSuccess ? (
                <View style={styles.successWrap}>
                  <Text style={styles.successText}>Demande enregistrée. Vous serez notifié après validation par l'administrateur.</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setPrestataireModalOpen(false)}>
                    <Text style={styles.primaryBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.modalDesc}>
                    Renseignez vos informations. Un administrateur validera votre profil avant qu'il n'apparaisse sur la plateforme.
                  </Text>
                  {prestataireError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{prestataireError}</Text>
                    </View>
                  ) : null}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nom complet</Text>
                    <TextInput style={styles.formInput} placeholder="Dr. Nom Prénom" placeholderTextColor="#9ca3af" value={prestataireForm.full_name} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, full_name: v }))} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Spécialité</Text>
                    <View style={styles.pickerRow}>
                      {DOCTOR_SPECIALTIES_FOR_REGISTER.map((s) => (
                        <TouchableOpacity key={s.id} style={[styles.pickerOption, prestataireForm.specialty === s.id && styles.pickerOptionSelected]} onPress={() => setPrestataireForm((f) => ({ ...f, specialty: s.id }))}>
                          <Text style={[styles.pickerOptionText, prestataireForm.specialty === s.id && styles.pickerOptionTextSelected]}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput style={styles.formInput} placeholder="+223 XX XX XX XX" placeholderTextColor="#9ca3af" value={prestataireForm.phone} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Email (optionnel)</Text>
                    <TextInput style={styles.formInput} placeholder="email@exemple.com" placeholderTextColor="#9ca3af" value={prestataireForm.email} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, email: v }))} keyboardType="email-address" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Cabinet / Clinique (optionnel)</Text>
                    <TextInput style={styles.formInput} placeholder="Nom du cabinet" placeholderTextColor="#9ca3af" value={prestataireForm.clinic_name} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, clinic_name: v }))} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Adresse du cabinet (optionnel)</Text>
                    <TextInput style={styles.formInput} placeholder="Adresse" placeholderTextColor="#9ca3af" value={prestataireForm.clinic_address} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, clinic_address: v }))} />
                  </View>
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Ville</Text>
                      <TextInput style={styles.formInput} placeholder="Bamako" placeholderTextColor="#9ca3af" value={prestataireForm.city} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, city: v }))} />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Tarif consultation (FCFA)</Text>
                      <TextInput style={styles.formInput} keyboardType="number-pad" value={String(prestataireForm.consultation_fee)} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, consultation_fee: Number(v) || 0 }))} />
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.primaryBtn, prestataireLoading && styles.primaryBtnDisabled]} onPress={handlePrestataireSubmit} disabled={prestataireLoading}>
                    <Text style={styles.primaryBtnText}>{prestataireLoading ? 'Envoi en cours...' : 'Soumettre ma demande'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitleWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#4b5563', marginTop: 4 },
  urgenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 16, marginBottom: 24 },
  urgenceIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  urgenceTextWrap: { flex: 1, minWidth: 0 },
  urgenceTitle: { fontWeight: '600', color: '#111827' },
  urgenceDesc: { fontSize: 13, color: '#374151', marginTop: 2 },
  urgenceBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  urgenceBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, alignItems: 'center' },
  statIcon: { marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },
  filterChipSelected: { backgroundColor: '#2563eb' },
  filterChipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  filterChipTextSelected: { color: '#fff' },
  loader: { marginVertical: 16 },
  doctorCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 16 },
  doctorAvatar: { width: 64, height: 64, borderRadius: 32 },
  doctorInfo: { flex: 1, marginLeft: 16 },
  doctorName: { fontWeight: '700', color: '#111827' },
  doctorSpecialty: { fontSize: 14, color: '#4b5563' },
  doctorMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  doctorRating: { fontSize: 14, fontWeight: '500', color: '#374151' },
  doctorConsultations: { fontSize: 13, color: '#6b7280' },
  doctorSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  doctorSlotText: { fontSize: 14, color: '#2563eb' },
  doctorFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  doctorFeeWrap: { flexDirection: 'row', alignItems: 'center' },
  doctorFeeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginRight: 6 },
  doctorFee: { fontWeight: '700', color: '#111827' },
  consultBtn: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  consultBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  prestataireCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 24, alignItems: 'center' },
  prestataireIcon: { marginBottom: 12 },
  prestataireTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  prestataireDesc: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScroll: { maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 32 },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalDesc: { fontSize: 14, color: '#4b5563', marginBottom: 16 },
  modalDoctorRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  modalDoctorAvatar: { width: 56, height: 56, borderRadius: 28 },
  modalDoctorName: { fontWeight: '700', color: '#111827' },
  modalDoctorSpecialty: { fontSize: 14, color: '#4b5563' },
  modalDoctorFee: { fontSize: 16, fontWeight: '600', color: '#2563eb' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  consultTypesRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  consultTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10 },
  consultTypeBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  consultTypeBtnText: { fontSize: 14, color: '#374151' },
  consultTypeBtnTextSelected: { color: '#2563eb', fontWeight: '500' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  slotBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: '#e5e7eb', minWidth: 70, alignItems: 'center' },
  slotBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  slotBtnText: { fontSize: 14, color: '#374151' },
  slotBtnTextSelected: { color: '#2563eb', fontWeight: '600' },
  successWrap: { paddingVertical: 16 },
  successText: { color: '#2563eb', fontWeight: '500', marginBottom: 16 },
  errorBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#1d4ed8', fontSize: 13 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  formInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: '#111827' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  pickerOptionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pickerOptionText: { fontSize: 13, color: '#374151' },
  pickerOptionTextSelected: { color: '#2563eb', fontWeight: '500' },
});
