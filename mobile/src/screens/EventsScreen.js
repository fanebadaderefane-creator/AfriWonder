import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CATEGORIES, MOCK_EVENTS, PAYMENT_METHODS } from '../data/eventsMock';

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('orange_money');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const params = { page: 1, limit: 50, status: 'published' };
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory !== 'all') params.category = selectedCategory;
        const res = await api.events.list(params);
        const list = res?.events ?? res ?? [];
        setEvents(Array.isArray(list) ? list : []);
      } else {
        setEvents(MOCK_EVENTS);
      }
    } catch (_) {
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, selectedCategory]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    let list = events.length > 0 ? events : MOCK_EVENTS;
    return list.filter((event) => {
      if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (event.title && event.title.toLowerCase().includes(q)) ||
          (event.description && event.description.toLowerCase().includes(q)) ||
          (event.location && event.location.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const allForStats = events.length > 0 ? events : MOCK_EVENTS;
  const totalEvents = allForStats.length;
  const now = new Date();
  const thisMonthEvents = allForStats.filter((e) => {
    const d = new Date(e.start_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalTicketsSold = events.length === 0 ? 2400 : allForStats.reduce((sum, e) => sum + (e.tickets_sold || 0), 0);

  const handleBuyTickets = (event) => {
    setSelectedEvent(event);
    setTicketQuantity(1);
    setSelectedPaymentMethod('orange_money');
    setShowBuyModal(true);
  };

  const handlePayment = async () => {
    if (!selectedEvent) return;
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setPurchaseSuccess(true);
      setShowBuyModal(false);
      setShowConfirmModal(true);
    } catch (_) {}
  };

  const renderEventCard = ({ item: event }) => {
    const price = event.is_free ? 0 : (event.price || 0);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EventDetails', { id: event.id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardImageWrap}>
          {event.image ? (
            <Image source={{ uri: event.image }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="calendar" size={48} color="#3b82f6" />
            </View>
          )}
          <View style={[styles.priceBadge, event.is_free && styles.priceBadgeFree]}>
            <Text style={styles.priceBadgeText}>
              {event.is_free ? 'Gratuit' : `${formatCurrency(price)} F CFA`}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.cardDetail}>{formatDate(event.start_date)}</Text>
          </View>
          {event.location ? (
            <View style={styles.cardRow}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.cardDetail} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
          <View style={styles.cardRow}>
            <Ionicons name="people-outline" size={14} color="#6b7280" />
            <Text style={styles.cardDetail}>
              {event.capacity_remaining != null ? `${event.capacity_remaining} billets disponibles` : `${event.tickets_sold || 0} inscrits`}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.organizer}>Par {event.organizer_name || 'Organisateur'}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{event.category || 'Événement'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuyTickets(event)}>
            <Ionicons name="ticket" size={18} color="#fff" />
            <Text style={styles.buyBtnText}>Acheter des billets</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Événements</Text>
          <Text style={styles.subtitle}>Découvrez les événements au Mali</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent')}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.createBtnText}>Créer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#3b82f6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un événement..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsWrap} contentContainerStyle={styles.chipsContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Ionicons name="calendar" size={20} color="#2563eb" />
          </View>
          <Text style={styles.statValue}>{totalEvents}</Text>
          <Text style={styles.statLabel}>Événements</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Ionicons name="time" size={20} color="#2563eb" />
          </View>
          <Text style={styles.statValue}>{thisMonthEvents}</Text>
          <Text style={styles.statLabel}>Ce mois</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Ionicons name="ticket" size={20} color="#2563eb" />
          </View>
          <Text style={styles.statValue}>
            {totalTicketsSold >= 1000 ? `${(totalTicketsSold / 1000).toFixed(1)}K` : totalTicketsSold}
          </Text>
          <Text style={styles.statLabel}>Billets vendus</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Aucun événement trouvé</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showBuyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Acheter des billets</Text>
            {selectedEvent ? (
              <>
                <Text style={styles.modalEventTitle} numberOfLines={2}>{selectedEvent.title}</Text>
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Quantité</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity onPress={() => setTicketQuantity((q) => Math.max(1, q - 1))}>
                      <Ionicons name="remove-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{ticketQuantity}</Text>
                    <TouchableOpacity onPress={() => setTicketQuantity((q) => q + 1)}>
                      <Ionicons name="add-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.paymentLabel}>Moyen de paiement</Text>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm.id}
                    style={[styles.paymentRow, selectedPaymentMethod === pm.id && styles.paymentRowActive]}
                    onPress={() => setSelectedPaymentMethod(pm.id)}
                  >
                    <Text style={styles.paymentIcon}>{pm.icon}</Text>
                    <Text style={styles.paymentName}>{pm.label}</Text>
                    {selectedPaymentMethod === pm.id && <Ionicons name="checkmark-circle" size={22} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
                <Text style={styles.totalText}>
                  Total : {(selectedEvent.is_free ? 0 : (selectedEvent.price || 0)) * ticketQuantity + 500} F CFA
                </Text>
                <TouchableOpacity style={styles.confirmPayBtn} onPress={handlePayment}>
                  <Text style={styles.confirmPayBtnText}>Confirmer le paiement</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowBuyModal(false)}>
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={styles.confirmTitle}>Paiement réussi</Text>
            <Text style={styles.confirmSubtitle}>Vos billets ont été réservés.</Text>
            <TouchableOpacity style={styles.confirmOkBtn} onPress={() => { setShowConfirmModal(false); setPurchaseSuccess(false); }}>
              <Text style={styles.confirmOkBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerCenter: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, gap: 6 },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginLeft: 12 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, paddingLeft: 4, fontSize: 14, color: '#111827' },
  chipsWrap: { maxHeight: 44, marginBottom: 16 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  statIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#6b7280' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardImageWrap: { height: 180, backgroundColor: '#eff6ff', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  priceBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(30, 58, 138, 0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  priceBadgeFree: { backgroundColor: '#2563eb' },
  priceBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardDetail: { flex: 1, fontSize: 13, color: '#6b7280' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  organizer: { fontSize: 12, color: '#9ca3af' },
  categoryBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  categoryBadgeText: { fontSize: 12, color: '#6b7280' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, gap: 8 },
  buyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalEventTitle: { fontSize: 15, color: '#374151', marginBottom: 16 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  quantityLabel: { fontSize: 14, color: '#374151' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quantityValue: { fontSize: 18, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  paymentLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, backgroundColor: '#f9fafb' },
  paymentRowActive: { backgroundColor: '#dbeafe' },
  paymentIcon: { fontSize: 20, marginRight: 12 },
  paymentName: { flex: 1, fontSize: 15, color: '#111827' },
  totalText: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 16 },
  confirmPayBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmPayBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  closeModalBtn: { marginTop: 16, alignItems: 'center' },
  closeModalText: { fontSize: 15, color: '#6b7280' },
  confirmContent: { backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16 },
  confirmSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  confirmOkBtn: { marginTop: 24, backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  confirmOkBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
