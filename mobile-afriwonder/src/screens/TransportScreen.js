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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_DRIVERS, POPULAR_DESTINATIONS } from '../data/transportMock';

const estimateFare = 3671;
const estimateDuration = '~5 min';

export default function TransportScreen() {
  const navigation = useNavigation();
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedDestinationTag, setSelectedDestinationTag] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDriverFoundModal, setShowDriverFoundModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showBecomeDriverModal, setShowBecomeDriverModal] = useState(false);
  const [rideRequested, setRideRequested] = useState(false);
  const [becomeDriverForm, setBecomeDriverForm] = useState({
    fullName: '',
    phone: '',
    vehicleMakeModel: '',
    vehicleColor: '',
    licensePlate: '',
    licenseNumber: '',
  });
  const [becomeDriverLoading, setBecomeDriverLoading] = useState(false);
  const [becomeDriverError, setBecomeDriverError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.transport.drivers
      .listNearby({ limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const list = res?.drivers ?? [];
        if (list.length) {
          const valid = list.filter(
            (d) => d.admin_validated !== false && d.subscription_active === true
          );
          setDrivers(
            valid.map((d) => ({
              id: d.id,
              name: d.full_name || d.name,
              vehicle: [d.vehicle_brand, d.vehicle_model].filter(Boolean).join(' ') || 'Véhicule',
              plate: d.license_plate || '',
              rating: d.rating ?? 5,
              courses: d.total_rides ?? 0,
              avatar: d.avatar || 'https://i.pravatar.cc/150?img=12',
              online: d.is_online !== false,
            }))
          );
        } else {
          setDrivers(MOCK_DRIVERS);
        }
      })
      .catch(() => {
        if (!cancelled) setDrivers(MOCK_DRIVERS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRequestRide = () => {
    if (!departure.trim() || !destination.trim()) return;
    setRideRequested(true);
    setSelectedDriver(drivers[0] || null);
    setShowDriverFoundModal(true);
  };

  const handleBecomeDriverSubmit = async () => {
    if (!becomeDriverForm.fullName?.trim() || !becomeDriverForm.phone?.trim()) {
      setBecomeDriverError('Veuillez remplir au moins le nom et le téléphone.');
      return;
    }
    if (!becomeDriverForm.licensePlate?.trim()) {
      setBecomeDriverError("La plaque d'immatriculation est requise.");
      return;
    }
    setBecomeDriverError(null);
    setBecomeDriverLoading(true);
    try {
      await api.transport.drivers.updateProfile({
        full_name: becomeDriverForm.fullName.trim(),
        phone: becomeDriverForm.phone.trim(),
        vehicle_type: 'car',
        vehicle_brand: becomeDriverForm.vehicleMakeModel.split(' ')[0] || undefined,
        vehicle_model: becomeDriverForm.vehicleMakeModel.split(' ').slice(1).join(' ').trim() || undefined,
        vehicle_color: becomeDriverForm.vehicleColor?.trim() || undefined,
        license_plate: becomeDriverForm.licensePlate.trim(),
        license_number: becomeDriverForm.licenseNumber?.trim() || undefined,
      });
      setShowBecomeDriverModal(false);
      setBecomeDriverForm({
        fullName: '',
        phone: '',
        vehicleMakeModel: '',
        vehicleColor: '',
        licensePlate: '',
        licenseNumber: '',
      });
      navigation.navigate('DriverDashboard');
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;
      if (status === 401) {
        setBecomeDriverError('Connectez-vous pour vous inscrire comme chauffeur.');
      } else {
        setBecomeDriverError(msg || 'Une erreur est survenue. Réessayez.');
      }
    } finally {
      setBecomeDriverLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Transport</Text>
            <Text style={styles.subtitle}>Réservez une course rapidement</Text>
          </View>
          <TouchableOpacity
            style={styles.becomeDriverBtn}
            onPress={() => {
              setBecomeDriverError(null);
              setShowBecomeDriverModal(true);
            }}
          >
            <Ionicons name="car" size={18} color="#fff" />
            <Text style={styles.becomeDriverBtnText}>Devenir chauffeur</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="location" size={48} color="#2563eb" />
          <Text style={styles.mapTitle}>Carte interactive</Text>
          <Text style={styles.mapSubtitle}>Bamako, Mali</Text>
        </View>

        <Text style={styles.sectionTitle}>Où allez-vous ?</Text>
        <View style={styles.inputRow}>
          <View style={styles.dot} />
          <TextInput
            style={styles.input}
            placeholder="Point de départ"
            placeholderTextColor="#9ca3af"
            value={departure}
            onChangeText={setDeparture}
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.dot} />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            placeholderTextColor="#9ca3af"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        <Text style={styles.popularLabel}>Destinations populaires</Text>
        <View style={styles.tagsRow}>
          {POPULAR_DESTINATIONS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedDestinationTag === tag && styles.tagSelected]}
              onPress={() => {
                setDestination(tag);
                setSelectedDestinationTag(selectedDestinationTag === tag ? null : tag);
              }}
            >
              <Text style={[styles.tagText, selectedDestinationTag === tag && styles.tagTextSelected]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rideRequested && (
          <View style={styles.estimateCard}>
            <View>
              <Text style={styles.estimateLabel}>Estimation</Text>
              <Text style={styles.estimateValue}>{estimateFare} F CFA</Text>
            </View>
            <View>
              <Text style={styles.estimateLabel}>Durée estimée</Text>
              <Text style={styles.estimateValue}>{estimateDuration}</Text>
            </View>
            <Text style={styles.driverFoundText}>Chauffeur trouvé !</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowDriverFoundModal(true)}
            >
              <Text style={styles.primaryBtnText}>Course en cours...</Text>
            </TouchableOpacity>
          </View>
        )}

        {!rideRequested && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRequestRide}
          >
            <Text style={styles.primaryBtnText}>Demander une course</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Chauffeurs disponibles</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          drivers.map((driver) => (
            <View key={driver.id} style={styles.driverCard}>
              <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                <Text style={styles.driverVehicle} numberOfLines={1}>{driver.vehicle}</Text>
                <View style={styles.driverMeta}>
                  <Ionicons name="star" size={14} color="#eab308" />
                  <Text style={styles.driverRating}>{driver.rating}</Text>
                  <Text style={styles.driverCourses}>{driver.courses} courses</Text>
                </View>
              </View>
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineBadgeText}>En ligne</Text>
              </View>
              <TouchableOpacity
                style={styles.chooseBtn}
                onPress={() => {
                  setSelectedDriver(driver);
                  setShowDriverFoundModal(true);
                }}
              >
                <Text style={styles.chooseBtnText}>Choisir</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Chauffeur trouvé */}
      <Modal
        visible={showDriverFoundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverFoundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chauffeur trouvé !</Text>
              <TouchableOpacity onPress={() => setShowDriverFoundModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {selectedDriver && (
              <>
                <View style={styles.modalDriverRow}>
                  <Image source={{ uri: selectedDriver.avatar }} style={styles.modalDriverAvatar} />
                  <View style={styles.modalDriverInfo}>
                    <Text style={styles.modalDriverName}>{selectedDriver.name}</Text>
                    <Text style={styles.modalDriverVehicle}>
                      {selectedDriver.vehicle} · {selectedDriver.plate || '—'}
                    </Text>
                    <View style={styles.modalDriverMeta}>
                      <Ionicons name="star" size={14} color="#eab308" />
                      <Text style={styles.modalDriverRating}>{selectedDriver.rating}</Text>
                      <Text style={styles.modalDriverCourses}>({selectedDriver.courses} courses)</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.modalFareRow}>
                  <View style={styles.modalFareLeft}>
                    <Ionicons name="time" size={18} color="#374151" />
                    <Text style={styles.modalFareLabel}>Arrivée dans 5 min</Text>
                  </View>
                  <Text style={styles.modalFareValue}>{estimateFare} FCFA</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionBtn}>
                    <Ionicons name="call" size={18} color="#2563eb" />
                    <Text style={styles.modalActionBtnText}>Appeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalActionBtn}>
                    <Ionicons name="chatbubble" size={18} color="#374151" />
                    <Text style={styles.modalActionBtnTextOut}>Message</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowDriverFoundModal(false)}
                >
                  <Text style={styles.primaryBtnText}>Confirmer la course</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Devenir chauffeur */}
      <Modal
        visible={showBecomeDriverModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBecomeDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Devenir chauffeur</Text>
                <TouchableOpacity onPress={() => setShowBecomeDriverModal(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDesc}>
                Rejoignez notre réseau de chauffeurs et gagnez en popularité au Mali ! Les inscriptions
                sont validées par un administrateur et un abonnement payant est requis.
              </Text>
              {becomeDriverError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{becomeDriverError}</Text>
                </View>
              ) : null}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Votre nom complet"
                  placeholderTextColor="#9ca3af"
                  value={becomeDriverForm.fullName}
                  onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, fullName: v }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="+223 XX XX XX XX"
                  placeholderTextColor="#9ca3af"
                  value={becomeDriverForm.phone}
                  onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.formSectionTitle}>Informations du véhicule</Text>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Marque/Modèle</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Toyota Corolla"
                    placeholderTextColor="#9ca3af"
                    value={becomeDriverForm.vehicleMakeModel}
                    onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, vehicleMakeModel: v }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Couleur</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Blanc"
                    placeholderTextColor="#9ca3af"
                    value={becomeDriverForm.vehicleColor}
                    onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, vehicleColor: v }))}
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Plaque d'immatriculation *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="BA-1234-ML"
                  placeholderTextColor="#9ca3af"
                  value={becomeDriverForm.licensePlate}
                  onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, licensePlate: v }))}
                />
              </View>
              <Text style={styles.formSectionTitle}>Documents</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro de permis de conduire</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ML-123456789"
                  placeholderTextColor="#9ca3af"
                  value={becomeDriverForm.licenseNumber}
                  onChangeText={(v) => setBecomeDriverForm((f) => ({ ...f, licenseNumber: v }))}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, becomeDriverLoading && styles.primaryBtnDisabled]}
                onPress={handleBecomeDriverSubmit}
                disabled={becomeDriverLoading}
              >
                <Text style={styles.primaryBtnText}>S'inscrire comme chauffeur</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  backBtn: { padding: 8, marginRight: 4 },
  headerTitleWrap: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e3a8a' },
  subtitle: { fontSize: 14, color: '#1d4ed8', marginTop: 2 },
  becomeDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  becomeDriverBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  mapPlaceholder: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: 24,
  },
  mapTitle: { fontWeight: '600', color: '#1e3a8a', marginTop: 8 },
  mapSubtitle: { fontSize: 12, color: '#2563eb', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e3a8a', marginBottom: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', padding: 0 },
  popularLabel: { fontSize: 14, fontWeight: '500', color: '#1e40af', marginTop: 8, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e5e7eb' },
  tagSelected: { backgroundColor: '#2563eb' },
  tagText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  tagTextSelected: { color: '#fff' },
  estimateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  estimateLabel: { fontSize: 12, color: '#6b7280' },
  estimateValue: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  driverFoundText: { fontWeight: '700', color: '#2563eb', marginTop: 8, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  loader: { marginVertical: 16 },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  driverAvatar: { width: 48, height: 48, borderRadius: 24 },
  driverInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  driverName: { fontWeight: '700', color: '#111827' },
  driverVehicle: { fontSize: 13, color: '#4b5563' },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  driverRating: { fontSize: 13, fontWeight: '500', color: '#374151' },
  driverCourses: { fontSize: 12, color: '#6b7280' },
  onlineBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dbeafe', marginRight: 8 },
  onlineBadgeText: { fontSize: 12, fontWeight: '500', color: '#1d4ed8' },
  chooseBtn: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  chooseBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalScroll: { maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalDesc: { fontSize: 14, color: '#4b5563', marginBottom: 16 },
  modalDriverRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  modalDriverAvatar: { width: 64, height: 64, borderRadius: 12 },
  modalDriverInfo: { flex: 1 },
  modalDriverName: { fontWeight: '700', color: '#111827' },
  modalDriverVehicle: { fontSize: 13, color: '#4b5563' },
  modalDriverMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  modalDriverRating: { fontSize: 13, fontWeight: '500' },
  modalDriverCourses: { fontSize: 12, color: '#6b7280' },
  modalFareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6', marginBottom: 16 },
  modalFareLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalFareLabel: { color: '#374151' },
  modalFareValue: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  modalActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modalActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: '#2563eb', borderRadius: 10 },
  modalActionBtnText: { color: '#2563eb', fontWeight: '500' },
  modalActionBtnTextOut: { color: '#374151', fontWeight: '500' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 12 },
  formInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: '#111827' },
});
