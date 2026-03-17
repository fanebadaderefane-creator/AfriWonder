import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function RestaurantMenuScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id || '';
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.food.getRestaurant?.(id).catch(() => null),
      api.food.menuItems?.listByRestaurant?.(id).catch(() => []),
    ]).then(([r, items]) => {
      setRestaurant(r || { id, name: 'Restaurant', address: '' });
      setMenuItems(Array.isArray(items) ? items : (items?.items ?? []));
    }).catch(() => {
      setRestaurant({ id, name: 'Restaurant', address: '' });
      setMenuItems([]);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Menu</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const name = restaurant?.name || 'Restaurant';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {restaurant?.address ? <Text style={styles.address}>{restaurant.address}</Text> : null}
        {menuItems.length === 0 ? (
          <Text style={styles.empty}>Aucun plat pour le moment</Text>
        ) : (
          menuItems.map((item) => (
            <View key={item.id} style={styles.row}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} /> : null}
              <View style={styles.rowBody}>
                <Text style={styles.itemName}>{item.name || item.title}</Text>
                <Text style={styles.itemPrice}>{(item.price ?? 0).toLocaleString()} FCFA</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
  content: { padding: 16, paddingBottom: 32 },
  address: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  thumb: { width: 56, height: 56, borderRadius: 8, marginRight: 12, backgroundColor: '#f3f4f6' },
  rowBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#111' },
  itemPrice: { fontSize: 14, color: '#059669', marginTop: 4 },
});
