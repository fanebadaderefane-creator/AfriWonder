import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
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
import { TRANSACTION_OPTIONS, PROPERTY_TYPE_OPTIONS, MOCK_PROPERTIES } from '../data/realEstateMock';

function formatPrice(price, listingType) {
  const n = Number(price);
  const s = n.toLocaleString('fr-FR') + ' FCFA';
  return listingType === 'rent' ? s + '/mois' : s;
}

export default function RealEstateScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [searchQuery, setSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [detailProperty, setDetailProperty] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    listing_type: 'rent',
    property_type: 'apartment',
    title: '',
    address: '',
    city: '',
    neighborhood: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    surface_area: '',
    description: '',
    owner_phone: '',
  });

  const params = useMemo(() => {
    const p = { limit: 50, page: 1 };
    if (transactionFilter) p.listing_type = transactionFilter;
    if (propertyTypeFilter) p.property_type = propertyTypeFilter;
    if (searchQuery.trim()) p.city = searchQuery.trim();
    return p;
  }, [transactionFilter, propertyTypeFilter, searchQuery]);

  const loadList = useCallback(() => {
    setLoading(true);
    api.properties
      .list(params)
      .then((res) => {
        const list = res?.properties ?? [];
        setProperties(list);
        setPagination(res?.pagination ?? { total: list.length, totalPages: 1 });
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const displayList = useMemo(() => {
    if (properties.length > 0) return properties;
    return MOCK_PROPERTIES.filter((m) => {
      if (transactionFilter && m.listing_type !== transactionFilter) return false;
      if (propertyTypeFilter && m.property_type !== propertyTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return [m.city, m.neighborhood, m.title, m.address].some((s) => s && String(s).toLowerCase().includes(q));
      }
      return true;
    });
  }, [properties, transactionFilter, propertyTypeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = properties.length > 0 ? (pagination.total ?? properties.length) : 1200;
    const sales = transactionFilter === 'sale' ? (properties.length > 0 ? (pagination.total ?? properties.length) : 234) : (transactionFilter === 'rent' ? 0 : 234);
    const rentals = transactionFilter === 'rent' ? (properties.length > 0 ? (pagination.total ?? properties.length) : 890) : (transactionFilter === 'sale' ? 0 : 890);
    return {
      total: total >= 1000 ? (total / 1000).toFixed(1) + 'K+' : String(total) + (total > 0 ? '+' : ''),
      sales: sales >= 1000 ? (sales / 1000).toFixed(1) + 'K+' : String(sales),
      rentals: rentals >= 1000 ? (rentals / 1000).toFixed(1) + 'K+' : String(rentals),
    };
  }, [pagination.total, properties.length, transactionFilter]);

  const openDetail = (p) => {
    if (!p) return;
    if (p._mock) {
      setDetailProperty(p);
      return;
    }
    api.properties.getById(p.id).then(setDetailProperty).catch(() => {});
  };

  const handleCreateSubmit = async () => {
    if (!isAuthenticated) return;
    const { listing_type, property_type, title, address, city, neighborhood, price, bedrooms, bathrooms, surface_area, description, owner_phone } = createForm;
    if (!title.trim() || !address.trim() || !price) return;
    setCreateSubmitting(true);
    try {
      await api.properties.create({
        listing_type,
        property_type,
        title: title.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        price: Number(price),
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        surface_area: surface_area ? Number(surface_area) : undefined,
        description: description.trim() || undefined,
        owner_phone: owner_phone.trim() || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ listing_type: 'rent', property_type: 'apartment', title: '', address: '', city: '', neighborhood: '', price: '', bedrooms: '', bathrooms: '', surface_area: '', description: '', owner_phone: '' });
      loadList();
    } catch (_) {}
    finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>Immobilier</Text>
          <Text style={styles.subtitle}>Trouvez votre bien idéal au Mali</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#2563eb" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Rechercher par ville, quartier..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={styles.filterRow}>
          {TRANSACTION_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value || 'all'} style={[styles.filterChip, transactionFilter === opt.value && styles.filterChipSelected]} onPress={() => setTransactionFilter(opt.value)}>
              <Text style={[styles.filterChipText, transactionFilter === opt.value && styles.filterChipTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {PROPERTY_TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value || 'all'} style={[styles.typeChip, propertyTypeFilter === opt.value && styles.typeChipSelected]} onPress={() => setPropertyTypeFilter(opt.value)}>
              <Text style={[styles.typeChipText, propertyTypeFilter === opt.value && styles.typeChipTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Annonces</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.sales}</Text><Text style={styles.statLabel}>Ventes</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.rentals}</Text><Text style={styles.statLabel}>Locations</Text></View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : displayList.length === 0 ? (
          <Text style={styles.emptyText}>Aucune annonce pour le moment.</Text>
        ) : (
          <View style={styles.grid}>
            {displayList.map((p) => {
              const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';
              const location = [p.neighborhood, p.city].filter(Boolean).join(', ') || p.address || '';
              const amenitiesList = Array.isArray(p.amenities) ? p.amenities : [];
              const isRent = p.listing_type === 'rent';
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardImageWrap}>
                    <Image source={{ uri: img }} style={styles.cardImage} />
                    <View style={[styles.badge, isRent ? styles.badgeRent : styles.badgeSale]}>
                      <Text style={styles.badgeText}>{isRent ? 'Location' : 'Vente'}</Text>
                    </View>
                    <Text style={styles.cardPrice}>{formatPrice(p.price, p.listing_type)}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{p.title}</Text>
                    {location ? <View style={styles.cardLocation}><Ionicons name="location" size={14} color="#6b7280" /><Text style={styles.cardLocationText} numberOfLines={1}>{location}</Text></View> : null}
                    <View style={styles.cardMeta}>
                      {p.bedrooms != null && <Text style={styles.cardMetaText}>{p.bedrooms} ch.</Text>}
                      {p.bathrooms != null && <Text style={styles.cardMetaText}>{p.bathrooms} sdb.</Text>}
                      {p.surface_area != null && <Text style={styles.cardMetaText}>{p.surface_area} m²</Text>}
                    </View>
                    {amenitiesList.length > 0 && (
                      <View style={styles.amenitiesRow}>
                        {amenitiesList.slice(0, 4).map((a) => (
                          <View key={a} style={styles.amenityTag}><Text style={styles.amenityTagText}>{typeof a === 'string' ? a : a}</Text></View>
                        ))}
                      </View>
                    )}
                    <View style={styles.cardActions}>
                      {p.owner_phone ? (
                        <TouchableOpacity style={styles.cardBtnOutline} onPress={() => Linking.openURL(`tel:${p.owner_phone}`)}>
                          <Ionicons name="call" size={16} color="#2563eb" /><Text style={styles.cardBtnOutlineText}>Appeler</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity style={styles.cardBtnPrimary} onPress={() => openDetail(p)}>
                        <Text style={styles.cardBtnPrimaryText}>Voir détails</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.publishCard}>
          <Ionicons name="business" size={48} color="#2563eb" style={styles.publishIcon} />
          <Text style={styles.publishTitle}>Vous avez un bien à louer ou vendre ?</Text>
          <Text style={styles.publishDesc}>Publiez votre annonce. Elle sera visible après validation par l'administrateur.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.primaryBtnText}>Publier une annonce</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Détail */}
      <Modal visible={!!detailProperty} transparent animationType="slide" onRequestClose={() => setDetailProperty(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{detailProperty?.title}</Text>
              <TouchableOpacity onPress={() => setDetailProperty(null)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            {detailProperty && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Image source={{ uri: Array.isArray(detailProperty.images) && detailProperty.images[0] ? detailProperty.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800' }} style={styles.modalImage} />
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPrice}>{formatPrice(detailProperty.price, detailProperty.listing_type)}</Text>
                  <View style={styles.availableBadge}><Text style={styles.availableBadgeText}>Disponible</Text></View>
                </View>
                <View style={styles.modalAddress}>
                  <Ionicons name="location" size={16} color="#6b7280" />
                  <Text style={styles.modalAddressText}>{[detailProperty.address, detailProperty.neighborhood, detailProperty.city].filter(Boolean).join(', ') || '—'}</Text>
                </View>
                {detailProperty.description ? <Text style={styles.modalDesc}>{detailProperty.description}</Text> : null}
                <View style={styles.modalSpecs}>
                  {detailProperty.bedrooms != null && <View style={styles.specBox}><Ionicons name="bed" size={20} color="#2563eb" /><Text style={styles.specValue}>{detailProperty.bedrooms}</Text><Text style={styles.specLabel}>Chambres</Text></View>}
                  {detailProperty.bathrooms != null && <View style={styles.specBox}><Ionicons name="water" size={20} color="#2563eb" /><Text style={styles.specValue}>{detailProperty.bathrooms}</Text><Text style={styles.specLabel}>Sdb</Text></View>}
                  {detailProperty.surface_area != null && <View style={styles.specBox}><Ionicons name="resize" size={20} color="#2563eb" /><Text style={styles.specValue}>{detailProperty.surface_area}</Text><Text style={styles.specLabel}>m²</Text></View>}
                </View>
                {Array.isArray(detailProperty.amenities) && detailProperty.amenities.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Équipements</Text>
                    <View style={styles.amenitiesWrap}>{detailProperty.amenities.map((a) => <View key={a} style={styles.amenityChip}><Text style={styles.amenityChipText}>{typeof a === 'string' ? a : a}</Text></View>)}</View>
                  </>
                )}
                <View style={styles.modalActions}>
                  {detailProperty.owner_phone ? (
                    <TouchableOpacity style={styles.modalBtnOutline} onPress={() => Linking.openURL(`tel:${detailProperty.owner_phone}`)}>
                      <Ionicons name="call" size={18} color="#2563eb" /><Text style={styles.modalBtnOutlineText}>Appeler l'agent</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => detailProperty.owner_phone && Linking.openURL(`https://wa.me/${detailProperty.owner_phone.replace(/\D/g, '')}`)}>
                    <Ionicons name="logo-whatsapp" size={18} color="#fff" /><Text style={styles.modalBtnPrimaryText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Publier */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollForm} contentContainerStyle={styles.modalScrollFormContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Publier une annonce</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Transaction</Text>
                <View style={styles.pickerRow}>
                  {[{ value: 'rent', label: 'Location' }, { value: 'sale', label: 'Vente' }].map((o) => (
                    <TouchableOpacity key={o.value} style={[styles.pickerOpt, createForm.listing_type === o.value && styles.pickerOptSel]} onPress={() => setCreateForm((f) => ({ ...f, listing_type: o.value }))}><Text style={[styles.pickerOptText, createForm.listing_type === o.value && styles.pickerOptTextSel]}>{o.label}</Text></TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de bien</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typePickerRow}>
                  {PROPERTY_TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                    <TouchableOpacity key={o.value} style={[styles.pickerOpt, createForm.property_type === o.value && styles.pickerOptSel]} onPress={() => setCreateForm((f) => ({ ...f, property_type: o.value }))}><Text style={[styles.pickerOptText, createForm.property_type === o.value && styles.pickerOptTextSel]}>{o.label}</Text></TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.formGroup}><Text style={styles.label}>Titre *</Text><TextInput style={styles.input} placeholder="Titre de l'annonce" placeholderTextColor="#9ca3af" value={createForm.title} onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))} /></View>
              <View style={styles.formGroup}><Text style={styles.label}>Adresse *</Text><TextInput style={styles.input} placeholder="Adresse" placeholderTextColor="#9ca3af" value={createForm.address} onChangeText={(v) => setCreateForm((f) => ({ ...f, address: v }))} /></View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}><Text style={styles.label}>Ville</Text><TextInput style={styles.input} placeholder="Ville" placeholderTextColor="#9ca3af" value={createForm.city} onChangeText={(v) => setCreateForm((f) => ({ ...f, city: v }))} /></View>
                <View style={[styles.formGroup, { flex: 1 }]}><Text style={styles.label}>Quartier</Text><TextInput style={styles.input} placeholder="Quartier" placeholderTextColor="#9ca3af" value={createForm.neighborhood} onChangeText={(v) => setCreateForm((f) => ({ ...f, neighborhood: v }))} /></View>
              </View>
              <View style={styles.formGroup}><Text style={styles.label}>Prix (FCFA) *</Text><TextInput style={styles.input} keyboardType="number-pad" placeholder="Prix" placeholderTextColor="#9ca3af" value={createForm.price} onChangeText={(v) => setCreateForm((f) => ({ ...f, price: v }))} /></View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}><Text style={styles.label}>Chambres</Text><TextInput style={styles.input} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9ca3af" value={createForm.bedrooms} onChangeText={(v) => setCreateForm((f) => ({ ...f, bedrooms: v }))} /></View>
                <View style={[styles.formGroup, { flex: 1 }]}><Text style={styles.label}>Sdb</Text><TextInput style={styles.input} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9ca3af" value={createForm.bathrooms} onChangeText={(v) => setCreateForm((f) => ({ ...f, bathrooms: v }))} /></View>
                <View style={[styles.formGroup, { flex: 1 }]}><Text style={styles.label}>m²</Text><TextInput style={styles.input} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9ca3af" value={createForm.surface_area} onChangeText={(v) => setCreateForm((f) => ({ ...f, surface_area: v }))} /></View>
              </View>
              <View style={styles.formGroup}><Text style={styles.label}>Description</Text><TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#9ca3af" value={createForm.description} onChangeText={(v) => setCreateForm((f) => ({ ...f, description: v }))} multiline numberOfLines={3} /></View>
              <View style={styles.formGroup}><Text style={styles.label}>Téléphone contact</Text><TextInput style={styles.input} placeholder="+223 XX XX XX XX" placeholderTextColor="#9ca3af" value={createForm.owner_phone} onChangeText={(v) => setCreateForm((f) => ({ ...f, owner_phone: v }))} keyboardType="phone-pad" /></View>
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}><Text style={styles.cancelBtnText}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, createSubmitting && styles.primaryBtnDisabled]} onPress={handleCreateSubmit} disabled={createSubmitting}><Text style={styles.primaryBtnText}>{createSubmitting ? 'Envoi...' : 'Publier'}</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  headerBar: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitleWrap: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  searchSection: { padding: 16, paddingTop: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: '#111827' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  filterChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 14, color: '#374151' },
  filterChipTextSelected: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8, paddingRight: 16 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  typeChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeChipText: { fontSize: 13, color: '#374151' },
  typeChipTextSelected: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  loader: { marginVertical: 24 },
  emptyText: { textAlign: 'center', color: '#6b7280', paddingVertical: 24 },
  grid: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  cardImageWrap: { aspectRatio: 4 / 3, backgroundColor: '#f3f4f6', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSale: { backgroundColor: '#2563eb' },
  badgeRent: { backgroundColor: '#6b7280' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cardPrice: { position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 18, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  cardBody: { padding: 16 },
  cardTitle: { fontWeight: '600', color: '#111827', marginBottom: 8 },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardLocationText: { fontSize: 13, color: '#6b7280', flex: 1 },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  cardMetaText: { fontSize: 13, color: '#4b5563' },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  amenityTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#f3f4f6' },
  amenityTagText: { fontSize: 11, color: '#4b5563' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cardBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb' },
  cardBtnOutlineText: { fontSize: 13, fontWeight: '500', color: '#2563eb' },
  cardBtnPrimary: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cardBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  publishCard: { marginTop: 24, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 24, alignItems: 'center' },
  publishIcon: { marginBottom: 12 },
  publishTitle: { fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  publishDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  primaryBtn: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  modalScroll: { maxHeight: 400 },
  modalImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#f3f4f6', marginBottom: 16 },
  modalPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalPrice: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  availableBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  availableBadgeText: { fontSize: 12, fontWeight: '600', color: '#1d4ed8' },
  modalAddress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modalAddressText: { fontSize: 14, color: '#4b5563', flex: 1 },
  modalDesc: { fontSize: 14, color: '#4b5563', marginBottom: 16 },
  modalSpecs: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  specBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, alignItems: 'center' },
  specValue: { fontWeight: '700', color: '#111827', marginTop: 4 },
  specLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  modalSectionTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  amenityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  amenityChipText: { fontSize: 13, color: '#374151' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: '#2563eb', borderRadius: 10 },
  modalBtnOutlineText: { color: '#2563eb', fontWeight: '600' },
  modalBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10 },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '600' },
  modalScrollForm: { maxHeight: '90%' },
  modalScrollFormContent: { paddingBottom: 32 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: '#111827' },
  textArea: { minHeight: 80 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  typePickerRow: { marginBottom: 8 },
  pickerOpt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  pickerOptSel: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pickerOptText: { fontSize: 14, color: '#374151' },
  pickerOptTextSel: { color: '#2563eb', fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
});
