import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const STATS = [
  { label: 'Produits', value: '24', icon: 'cube' },
  { label: 'Ventes', value: '156', icon: 'receipt' },
  { label: 'Revenus', value: '450K', icon: 'cash' },
  { label: 'Note', value: '4.8', icon: 'star' },
];

const RECENT_ORDERS = [
  { id: 'so1', product: 'Robe Bogolan', buyer: 'Aminata D.', amount: 25000, status: 'En preparation', date: 'Aujourd\'hui' },
  { id: 'so2', product: 'Sac en cuir', buyer: 'Moussa K.', amount: 35000, status: 'Expedie', date: 'Hier' },
  { id: 'so3', product: 'Bijoux set', buyer: 'Fanta C.', amount: 15000, status: 'Livre', date: '22 Jun' },
];

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau de bord vendeur</Text>
        <TouchableOpacity><Ionicons name="settings" size={22} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Revenus ce mois</Text>
          <Text style={styles.revenueAmount}>125 000 FCFA</Text>
          <View style={styles.revenueTrend}>
            <Ionicons name="trending-up" size={16} color={Colors.success} />
            <Text style={styles.revenueTrendText}>+23% vs mois dernier</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="add-circle" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Ajouter produit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="pricetag" size={22} color={Colors.accent} />
            <Text style={styles.actionText}>Promotions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="analytics" size={22} color={Colors.info} />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        <Text style={styles.sectionTitle}>Commandes recentes</Text>
        {RECENT_ORDERS.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderProduct}>{order.product}</Text>
              <Text style={styles.orderBuyer}>{order.buyer} - {order.date}</Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderAmount}>{order.amount.toLocaleString()} FCFA</Text>
              <Text style={[styles.orderStatus, { color: order.status === 'Livre' ? Colors.success : order.status === 'Expedie' ? Colors.info : Colors.accent }]}>{order.status}</Text>
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
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  revenueCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.md },
  revenueAmount: { color: Colors.text, fontSize: 32, fontWeight: 'bold', marginVertical: Spacing.xs },
  revenueTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  revenueTrendText: { color: Colors.success, fontSize: FontSizes.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  statLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xxl },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginHorizontal: 4, gap: 4 },
  actionText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '500', textAlign: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  orderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm },
  orderInfo: { flex: 1 },
  orderProduct: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  orderBuyer: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  orderStatus: { fontSize: FontSizes.xs, fontWeight: '600' },
});
