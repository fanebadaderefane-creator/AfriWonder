import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const STATUS_LABELS = { draft: 'Brouillon', pending_review: 'En attente', active: 'Active', expired: 'Expiree' };

export default function AdvertiserDashboardScreen() {
  const navigation = useNavigation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.ads.getCampaigns?.({ page: 1, limit: 20 }) ?? { campaigns: [] };
      setCampaigns(res.campaigns ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes campagnes pub</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateAdCampaign')}>
          <Ionicons name="add-circle" size={28} color="#2563eb" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color="#2563eb" style={styles.loader} />
        ) : campaigns.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={56} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Aucune campagne</Text>
            <Text style={styles.emptyDesc}>Creer une campagne pour promouvoir vos contenus.</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateAdCampaign')}>
              <Text style={styles.createBtnText}>Creer une campagne</Text>
            </TouchableOpacity>
          </View>
        ) : (
          campaigns.map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.cardName}>{c.name ?? 'Sans titre'}</Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardStatus}>{STATUS_LABELS[c.status] ?? c.status}</Text>
                <Text style={styles.cardMeta}>{c.duration_days ?? 0} jours</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  loader: { marginTop: 24 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },
  createBtn: { backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 24 },
  createBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardRow: { flexDirection: 'row', marginTop: 8 },
  cardStatus: { fontSize: 13, color: '#2563eb', marginRight: 12 },
  cardMeta: { fontSize: 13, color: '#64748b' },
});
