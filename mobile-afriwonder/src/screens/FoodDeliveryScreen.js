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
import { CATEGORIES, MOCK_RESTAURANTS } from '../data/foodMock';

const MOCK_MENU_ITEMS = [
  { id: '1', name: 'Tô au gombo', description: 'Plat traditionnel malien', price: 1500 },
  { id: '2', name: 'Poulet yassa', description: 'Poulet mariné aux oignons', price: 3500 },
  { id: '3', name: 'Jus de gingembre', description: 'Jus de gingembre frais', price: 500 },
  { id: '4', name: 'Riz au gras', description: 'Riz savoureux au gras de mouton', price: 2000 },
  { id: '5', name: "Jus de bissap", description: "Jus de fleurs d'hibiscus", price: 500 },
];

function formatPrice(n) {
  return `${Number(n).toLocaleString('fr-FR')} F CFA`;
}

export default function FoodDeliveryScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [menuItemsByRestaurant, setMenuItemsByRestaurant] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPrestataireModal, setShowPrestataireModal] = useState(false);
  const [prestataireForm, setPrestataireForm] = useState({
    name: '',
    address: '',
    city: 'Bamako',
    phone: '',
    description: '',
    delivery_time_min: 30,
    minimum_order: 2000,
    delivery_fee: 500,
    cuisine_type: 'malienne',
  });
  const [prestataireLoading, setPrestataireLoading] = useState(false);
  const [prestataireError, setPrestataireError] = useState(null);
  const [prestataireSuccess, setPrestataireSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.food.restaurants
      .list({ limit: 20, search: searchQuery || undefined })
      .then((res) => {
        if (cancelled) return;
        const list = res?.restaurants ?? [];
        if (list.length) {
          setRestaurants(
            list.map((r) => ({
              id: r.id,
              name: r.name,
              cuisine_type: Array.isArray(r.cuisine_type) ? r.cuisine_type : [r.cuisine_type].filter(Boolean),
              cuisineLabel: Array.isArray(r.cuisine_type) ? r.cuisine_type[0] || 'Restaurant' : (r.cuisine_type || 'Restaurant'),
              rating: r.rating ?? 4.5,
              total_reviews: r.total_reviews ?? 0,
              delivery_time_min: r.delivery_time_min ?? 30,
              address: r.address || r.city || '',
              city: r.city || 'Bamako',
              delivery_fee: r.delivery_fee ?? 500,
              minimum_order: r.minimum_order ?? 2000,
              is_open: r.is_open !== false,
              banner_url: r.banner_url || r.logo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            }))
          );
        } else {
          setRestaurants(MOCK_RESTAURANTS);
        }
      })
      .catch(() => {
        if (!cancelled) setRestaurants(MOCK_RESTAURANTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [searchQuery]);

  const filteredRestaurants =
    selectedCategory === 'all'
      ? restaurants
      : restaurants.filter((r) => {
          const types = r.cuisine_type || [];
          return types.some((c) => String(c).toLowerCase() === selectedCategory);
        });

  const firstRestaurant = filteredRestaurants[0];
  const firstRestaurantId = firstRestaurant?.id;

  useEffect(() => {
    if (!firstRestaurantId) return;
    let cancelled = false;
    api.food.menuItems
      .listByRestaurant(firstRestaurantId)
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : items?.menu_items || items?.data || [];
        if (list.length) {
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: list }));
        } else {
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: MOCK_MENU_ITEMS }));
        }
      })
      .catch(() => {
        if (!cancelled)
          setMenuItemsByRestaurant((prev) => ({ ...prev, [firstRestaurantId]: MOCK_MENU_ITEMS }));
      });
    return () => { cancelled = true; };
  }, [firstRestaurantId]);

  const popularMenuItems = (firstRestaurantId && menuItemsByRestaurant[firstRestaurantId]) || MOCK_MENU_ITEMS;

  const handlePrestataireSubmit = async () => {
    if (!prestataireForm.name?.trim() || !prestataireForm.address?.trim() || !prestataireForm.phone?.trim()) {
      setPrestataireError("Veuillez remplir le nom, l'adresse et le téléphone.");
      return;
    }
    setPrestataireError(null);
    setPrestataireLoading(true);
    try {
      await api.food.restaurants.create({
        name: prestataireForm.name.trim(),
        address: prestataireForm.address.trim(),
        city: prestataireForm.city?.trim() || undefined,
        phone: prestataireForm.phone.trim(),
        description: prestataireForm.description?.trim() || undefined,
        delivery_time_min: Number(prestataireForm.delivery_time_min) || 30,
        minimum_order: Number(prestataireForm.minimum_order) || 0,
        delivery_fee: Number(prestataireForm.delivery_fee) || 0,
        cuisine_type: [prestataireForm.cuisine_type].filter(Boolean),
      });
      setPrestataireSuccess(true);
      setPrestataireForm({
        name: '',
        address: '',
        city: 'Bamako',
        phone: '',
        description: '',
        delivery_time_min: 30,
        minimum_order: 2000,
        delivery_fee: 500,
        cuisine_type: 'malienne',
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      setPrestataireError(msg || "Une erreur est survenue. Connectez-vous pour inscrire votre restaurant.");
    } finally {
      setPrestataireLoading(false);
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
            <Text style={styles.title}>Restauration</Text>
            <Text style={styles.subtitle}>Commandez vos plats préférés</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#2563eb" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un restaurant..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Restaurants</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.restaurantsScroll} contentContainerStyle={styles.restaurantsContent}>
            {filteredRestaurants.map((restaurant) => (
              <View key={restaurant.id} style={styles.restaurantCard}>
                <View style={styles.restaurantImageWrap}>
                  <Image source={{ uri: restaurant.banner_url }} style={styles.restaurantImage} />
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#facc15" />
                    <Text style={styles.ratingText}>{restaurant.rating} ({restaurant.total_reviews})</Text>
                  </View>
                  {!restaurant.is_open && (
                    <View style={styles.closedOverlay}>
                      <Text style={styles.closedText}>Fermé</Text>
                    </View>
                  )}
                </View>
                <View style={styles.restaurantBody}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantCuisine}>{restaurant.cuisineLabel}</Text>
                  <View style={styles.restaurantMeta}>
                    <Ionicons name="time" size={14} color="#4b5563" />
                    <Text style={styles.restaurantMetaText}>{restaurant.delivery_time_min}-{restaurant.delivery_time_min + 10} min</Text>
                  </View>
                  <View style={styles.restaurantMeta}>
                    <Ionicons name="location" size={14} color="#4b5563" />
                    <Text style={styles.restaurantMetaText} numberOfLines={1}>{restaurant.address || restaurant.city}</Text>
                  </View>
                  <Text style={styles.restaurantFees}>
                    Livraison: {formatPrice(restaurant.delivery_fee)} · Min: {formatPrice(restaurant.minimum_order)}
                  </Text>
                  <TouchableOpacity
                    style={styles.orderBtn}
                    onPress={() => navigation.navigate('RestaurantMenu', { id: restaurant.id })}
                  >
                    <Text style={styles.orderBtnText}>Commander</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {firstRestaurant && (
          <>
            <Text style={styles.sectionTitle}>Menu populaire — {firstRestaurant.name}</Text>
            <View style={styles.menuGrid}>
              {popularMenuItems.map((item) => (
                <View key={item.id} style={styles.menuItem}>
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="restaurant" size={24} color="#2563eb" />
                  </View>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.description ? <Text style={styles.menuItemDesc} numberOfLines={1}>{item.description}</Text> : null}
                    <Text style={styles.menuItemPrice}>{formatPrice(item.price)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.menuItemAdd}
                    onPress={() => navigation.navigate('RestaurantMenu', { id: firstRestaurant.id })}
                    accessibilityLabel="Ajouter au panier"
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.prestataireCard}>
          <Ionicons name="restaurant" size={48} color="#2563eb" style={styles.prestataireIcon} />
          <Text style={styles.prestataireTitle}>Vous êtes restaurateur ?</Text>
          <Text style={styles.prestataireDesc}>
            Rejoignez AfriWonder et développez votre activité. Votre établissement sera validé par un administrateur avant d'apparaître sur la plateforme.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setPrestataireError(null);
              setPrestataireSuccess(false);
              setShowPrestataireModal(true);
            }}
          >
            <Text style={styles.primaryBtnText}>Devenir partenaire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Prestataire */}
      <Modal
        visible={showPrestataireModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowPrestataireModal(false); setPrestataireSuccess(false); setPrestataireError(null); }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Inscrire mon restaurant</Text>
                <TouchableOpacity onPress={() => { setShowPrestataireModal(false); setPrestataireSuccess(false); setPrestataireError(null); }}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              {prestataireSuccess ? (
                <View style={styles.successWrap}>
                  <Text style={styles.successText}>
                    Demande enregistrée. Vous serez notifié après validation par l'administrateur.
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPrestataireModal(false)}>
                    <Text style={styles.primaryBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.modalDesc}>
                    Renseignez les informations de votre établissement. Un administrateur validera votre inscription avant que le restaurant n'apparaisse sur la plateforme.
                  </Text>
                  {prestataireError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{prestataireError}</Text>
                    </View>
                  ) : null}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nom du restaurant</Text>
                    <TextInput style={styles.formInput} placeholder="Le Djembe" placeholderTextColor="#9ca3af" value={prestataireForm.name} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, name: v }))} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Adresse</Text>
                    <TextInput style={styles.formInput} placeholder="Hamdallaye, Bamako" placeholderTextColor="#9ca3af" value={prestataireForm.address} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, address: v }))} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Ville</Text>
                    <TextInput style={styles.formInput} placeholder="Bamako" placeholderTextColor="#9ca3af" value={prestataireForm.city} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, city: v }))} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput style={styles.formInput} placeholder="+223 XX XX XX XX" placeholderTextColor="#9ca3af" value={prestataireForm.phone} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (optionnel)</Text>
                    <TextInput style={[styles.formInput, styles.textArea]} placeholder="Spécialités, ambiance..." placeholderTextColor="#9ca3af" value={prestataireForm.description} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, description: v }))} multiline numberOfLines={2} />
                  </View>
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Livraison (F CFA)</Text>
                      <TextInput style={styles.formInput} keyboardType="number-pad" value={String(prestataireForm.delivery_fee)} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, delivery_fee: Number(v) || 0 }))} />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Min. commande</Text>
                      <TextInput style={styles.formInput} keyboardType="number-pad" value={String(prestataireForm.minimum_order)} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, minimum_order: Number(v) || 0 }))} />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Délai (min)</Text>
                      <TextInput style={styles.formInput} keyboardType="number-pad" value={String(prestataireForm.delivery_time_min)} onChangeText={(v) => setPrestataireForm((f) => ({ ...f, delivery_time_min: Number(v) || 30 }))} />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Type de cuisine</Text>
                    <View style={styles.pickerRow}>
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.pickerOption, prestataireForm.cuisine_type === c.id && styles.pickerOptionSelected]}
                          onPress={() => setPrestataireForm((f) => ({ ...f, cuisine_type: c.id }))}
                        >
                          <Text style={[styles.pickerOptionText, prestataireForm.cuisine_type === c.id && styles.pickerOptionTextSelected]}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
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
  title: { fontSize: 26, fontWeight: '800', color: '#1e3a8a' },
  subtitle: { fontSize: 14, color: '#1d4ed8', marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111827' },
  categoriesScroll: { marginBottom: 16 },
  categoriesContent: { gap: 8, paddingRight: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },
  categoryChipSelected: { backgroundColor: '#2563eb' },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  categoryChipTextSelected: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e3a8a', marginBottom: 12 },
  loader: { marginVertical: 16 },
  restaurantsScroll: { marginBottom: 24 },
  restaurantsContent: { gap: 16, paddingRight: 16 },
  restaurantCard: { width: 280, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  restaurantImageWrap: { height: 140, position: 'relative' },
  restaurantImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratingBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 11, color: '#fff' },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  closedText: { backgroundColor: '#374151', color: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontWeight: '600', fontSize: 14 },
  restaurantBody: { padding: 12 },
  restaurantName: { fontWeight: '700', color: '#111827' },
  restaurantCuisine: { fontSize: 13, color: '#6b7280' },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  restaurantMetaText: { fontSize: 13, color: '#4b5563', flex: 1 },
  restaurantFees: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  orderBtn: { marginTop: 12, backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  menuGrid: { gap: 12, marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  menuItemIcon: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuItemInfo: { flex: 1, minWidth: 0 },
  menuItemName: { fontWeight: '600', color: '#111827' },
  menuItemDesc: { fontSize: 13, color: '#6b7280' },
  menuItemPrice: { fontWeight: '700', color: '#2563eb', marginTop: 2 },
  menuItemAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
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
  successWrap: { paddingVertical: 16 },
  successText: { color: '#2563eb', fontWeight: '500', marginBottom: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: '#111827' },
  textArea: { minHeight: 60 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  pickerOptionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pickerOptionText: { fontSize: 13, color: '#374151' },
  pickerOptionTextSelected: { color: '#2563eb', fontWeight: '500' },
});
