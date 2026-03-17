import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function WishlistScreen({ navigation }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const list = await api.entities.Wishlist.filter({
          user_id: user.id,
        });
        let w = Array.isArray(list) && list.length > 0 ? list[0] : null;
        if (!w) {
          w = await api.entities.Wishlist.create({
            user_id: user.id,
            name: "Ma liste d'envies",
            products: [],
          });
        }
        if (!cancelled) setWishlist(w);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const updateWishlist = async (updates) => {
    if (!wishlist || mutating) return;
    setMutating(true);
    try {
      await api.entities.Wishlist.update(wishlist.id, updates);
      const next = { ...wishlist, ...updates };
      setWishlist(next);
    } finally {
      setMutating(false);
    }
  };

  const removeProduct = async (productId) => {
    if (!wishlist || mutating) return;
    const current = wishlist.products || [];
    const updated = current.filter(
      (p) => p.product_id !== productId,
    );
    await updateWishlist({ products: updated });
  };

  const addToCart = async (product) => {
    if (!user) return;
    try {
      setMutating(true);
      const productId = product.id || product.product_id;
      await api.cart.add(productId, 1);
    } finally {
      setMutating(false);
    }
  };

  if (!user || loading || !wishlist) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  const products = wishlist.products || [];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nom de la liste"
                placeholderTextColor="#9ca3af"
                style={styles.nameInput}
                autoFocus
              />
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (newName.trim()) {
                    updateWishlist({ name: newName.trim() });
                    setEditingName(false);
                  }
                }}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.headerTitle}>
                {wishlist.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setNewName(wishlist.name || '');
                  setEditingName(true);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.headerSubtitle}>
            {products.length} produit(s)
          </Text>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name={
                    wishlist.is_public
                      ? 'earth-outline'
                      : 'lock-closed-outline'
                  }
                  size={20}
                  color="#111827"
                />
                <View>
                  <Text style={styles.settingTitle}>
                    Liste publique
                  </Text>
                  <Text style={styles.settingDesc}>
                    Visible par les autres
                  </Text>
                </View>
              </View>
              <Switch
                value={!!wishlist.is_public}
                onValueChange={(val) =>
                  updateWishlist({ is_public: val })
                }
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#111827"
                />
                <View>
                  <Text style={styles.settingTitle}>
                    Notifications promo
                  </Text>
                  <Text style={styles.settingDesc}>
                    Alertes quand un produit est en promo
                  </Text>
                </View>
              </View>
              <Switch
                value={!!wishlist.notify_on_promo}
                onValueChange={(val) =>
                  updateWishlist({ notify_on_promo: val })
                }
              />
            </View>
          </View>
        }
        data={products}
        keyExtractor={(item) => String(item.product_id)}
        contentContainerStyle={
          products.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        renderItem={({ item }) => {
          const price =
            item.product_price != null
              ? item.product_price
              : 0;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                {item.product_image ? (
                  <Image
                    source={{ uri: item.product_image }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.cardImage,
                      styles.cardImagePlaceholder,
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={26}
                      color="#9ca3af"
                    />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    {item.product_name}
                  </Text>
                  <Text style={styles.cardPrice}>
                    {price.toLocaleString('fr-FR')} FCFA
                  </Text>
                  {!!item.added_date && (
                    <Text style={styles.cardMeta}>
                      Ajouté le{' '}
                      {new Date(
                        item.added_date,
                      ).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => addToCart(item)}
                  disabled={mutating}
                >
                  <Ionicons
                    name="cart-outline"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.primaryBtnText}>
                    Ajouter au panier
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() =>
                    removeProduct(item.product_id)
                  }
                  disabled={mutating}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#b91c1c"
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="heart-outline"
              size={56}
              color="#d1d5db"
            />
            <Text style={styles.emptyTitle}>
              Votre liste d'envies est vide
            </Text>
            <Text style={styles.emptyText}>
              Ajoutez des produits depuis le marketplace.
            </Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Text style={styles.secondaryBtnText}>
                Découvrir des produits
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    color: '#111827',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTop: {
    flexDirection: 'row',
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 10,
  },
  cardImagePlaceholder: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#f97316',
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});

