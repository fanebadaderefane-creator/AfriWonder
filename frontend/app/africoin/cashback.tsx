import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';

export default function AfricoinCashbackScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ton cash back</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="logo-usd" size={22} color="#111" />
            <Text style={styles.statLabel}>Cash back total</Text>
            <Text style={styles.statVal}>USD 0.00</Text>
          </View>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/africoin/referral-friends' as never)}>
            <Ionicons name="person-add-outline" size={22} color="#111" />
            <Text style={styles.statLabel}>Ami(e)s ayant rechargé</Text>
            <Text style={styles.statVal}>0</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>Comment ça marche</Text>
        <View style={styles.step}>
          <View style={styles.stepN}>
            <Text style={styles.stepNText}>1</Text>
          </View>
          <Text style={styles.stepT}>Invite via ton lien unique AfriWonder.</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepN}>
            <Text style={styles.stepNText}>2</Text>
          </View>
          <Text style={styles.stepT}>Jusqu’à 3 % de cash back sur leurs achats de Pièces.</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepN}>
            <Text style={styles.stepNText}>3</Text>
          </View>
          <Text style={styles.stepT}>Tes ami(e)s obtiennent des coupons (ex. 5 %).</Text>
        </View>
        <View style={styles.coupon}>
          <Text style={styles.couponBadge}>5 %</Text>
          <Text style={styles.couponText}>Jusqu’à 250 USD remboursés sur 1 commande (exemple produit).</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepN}>
            <Text style={styles.stepNText}>4</Text>
          </View>
          <Text style={styles.stepT}>Recharge pour débloquer des cadeaux spéciaux (catalogue à venir).</Text>
        </View>

        <TouchableOpacity onPress={() => router.push('/terms' as never)}>
          <Text style={styles.rules}>Voir les règles &gt;</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: FontSizes.lg, color: '#111' },
  body: { padding: Spacing.lg, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, gap: 6 },
  statLabel: { fontSize: 12, color: '#555', fontWeight: '700' },
  statVal: { fontSize: 16, fontWeight: '900', color: '#111' },
  h2: { fontWeight: '900', fontSize: 16, marginBottom: 12, color: '#111' },
  step: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  stepN: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNText: { fontWeight: '900', color: '#111', fontSize: 12 },
  stepT: { flex: 1, fontSize: 14, color: '#444', lineHeight: 20 },
  coupon: { marginVertical: 12, padding: 12, borderRadius: BorderRadius.md, backgroundColor: '#fff8f9', borderWidth: 1, borderColor: '#ffd6de' },
  couponBadge: { fontWeight: '900', color: '#fe2c55', marginBottom: 6 },
  couponText: { fontSize: 13, color: '#444', lineHeight: 18 },
  rules: { marginTop: 20, textAlign: 'center', color: '#fe2c55', fontWeight: '800' },
});
