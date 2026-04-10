import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const TABS = ['Tous', 'En cours', 'Livres', 'Annules'];

const ORDERS = [
  { id: 'o1', status: 'En cours', date: '25 Jun 2025', total: 32000, items: [{ name: 'Robe Bogolan', image: 'https://picsum.photos/80/80?random=30', qty: 1 }, { name: 'Huile de karite', image: 'https://picsum.photos/80/80?random=31', qty: 2 }], seller: 'Awa Mode', tracking: 'En preparation' },
  { id: 'o2', status: 'Livres', date: '20 Jun 2025', total: 185000, items: [{ name: 'Samsung A54', image: 'https://picsum.photos/80/80?random=32', qty: 1 }], seller: 'Tech Mali', tracking: 'Livre' },
  { id: 'o3', status: 'En cours', date: '23 Jun 2025', total: 5000, items: [{ name: 'Panier fruits', image: 'https://picsum.photos/80/80?random=33', qty: 1 }], seller: 'Marche Frais', tracking: 'En livraison' },
  { id: 'o4', status: 'Annules', date: '15 Jun 2025', total: 15000, items: [{ name: 'Bijoux traditionnels', image: 'https://picsum.photos/80/80?random=34', qty: 1 }], seller: 'Artisanat Bamako', tracking: 'Annule' },
];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);

  const filteredOrders = activeTab === 0 ? ORDERS : ORDERS.filter((o) => o.status === TABS[activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours': return Colors.info;
      case 'Livres': return Colors.success;
      case 'Annules': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes commandes</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === index && styles.tabActive]} onPress={() => setActiveTab(index)}>
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {filteredOrders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push(`/orders/${order.id}`)}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderDate}>{order.date}</Text>
                <Text style={styles.orderSeller}>{order.seller}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.tracking}</Text>
              </View>
            </View>
            <View style={styles.orderItems}>
              {order.items.map((item, i) => (
                <View key={i} style={styles.orderItemRow}>
                  <Image source={{ uri: item.image }} style={styles.orderItemImage} />
                  <Text style={styles.orderItemName}>{item.name} x{item.qty}</Text>
                </View>
              ))}
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>{order.total.toLocaleString()} FCFA</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  tabsContainer: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, maxHeight: 44 },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, marginRight: Spacing.sm, backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '500' },
  tabTextActive: { color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  orderCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  orderDate: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  orderSeller: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  orderItems: { marginBottom: Spacing.md },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  orderItemImage: { width: 48, height: 48, borderRadius: BorderRadius.sm },
  orderItemName: { color: Colors.text, fontSize: FontSizes.md },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  orderTotal: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
