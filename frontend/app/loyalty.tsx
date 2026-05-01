/**
 * Écran Programmes de fidélité — vue agrégée des points par vendeur.
 * Branché sur GET /api/proxy/loyalty/me .
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';

type LoyaltyEntry = {
  id?: string;
  seller_id?: string;
  seller_name?: string;
  points?: number;
  tier?: string;
  next_reward?: { points?: number; description?: string };
};

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient.get('/loyalty/me');
      const data = res.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const totalPoints = items.reduce((sum, it) => sum + (Number(it.points) || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes points fidélité</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Points totaux</Text>
        <Text style={styles.summaryValue}>{totalPoints.toLocaleString()}</Text>
        <Text style={styles.summaryHint}>Cumulés chez {items.length} vendeur{items.length > 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={Colors.primary}
            />
          }
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Pas encore de points</Text>
              <Text style={styles.emptyText}>
                Achetez chez nos vendeurs partenaires et gagnez des points fidélité à chaque commande.
              </Text>
              <TouchableOpacity style={styles.cta} onPress={() => router.push('/(tabs)/market')}>
                <Text style={styles.ctaText}>Découvrir le marketplace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((it, i) => (
              <View key={it.id ?? i} style={styles.card}>
                <View style={styles.cardLeft}>
                  <Ionicons name="ribbon" size={28} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{it.seller_name || 'Vendeur'}</Text>
                  {it.tier && <Text style={styles.cardTier}>Niveau : {it.tier}</Text>}
                  {it.next_reward?.description && (
                    <Text style={styles.cardNext} numberOfLines={2}>
                      Prochain : {it.next_reward.description}
                      {it.next_reward.points ? ` (${it.next_reward.points} pts)` : ''}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.cardPoints}>{Number(it.points || 0).toLocaleString()}</Text>
                  <Text style={styles.cardPointsLabel}>pts</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  summary: { padding: Spacing.xl, alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.xl, borderRadius: BorderRadius.lg },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  summaryValue: { color: Colors.primary, fontSize: 36, fontWeight: 'bold', marginTop: Spacing.sm },
  summaryHint: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  empty: { alignItems: 'center', padding: Spacing.xxxl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  cta: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  ctaText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  cardLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  cardName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  cardTier: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  cardNext: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  cardPoints: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: 'bold', textAlign: 'right' },
  cardPointsLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'right' },
});
