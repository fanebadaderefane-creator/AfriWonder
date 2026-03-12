import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_CAMPAIGNS } from '../data/crowdfundingMock';

export default function CampaignDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id || '';
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.crowdfunding.getById(id).then(setCampaign).catch(() => setCampaign(MOCK_CAMPAIGNS.find((c) => c.id === id) || null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Campagne</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const campaignData = campaign || MOCK_CAMPAIGNS.find((c) => c.id === id);

  if (!campaignData) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Campagne</Text>
        </View>
        <Text style={styles.empty}>Campagne introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Crowdfunding')}><Text style={styles.backBtnText}>Retour</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const raised = campaignData.amount_raised ?? campaignData.current_amount ?? 0;
  const goal = campaignData.goal ?? campaignData.goal_amount ?? 1;
  const img = campaignData.image_url ?? (campaignData.images && campaignData.images[0]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{campaignData.title ?? campaignData.name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {img ? <Image source={{ uri: img }} style={styles.cover} /> : null}
        <Text style={styles.desc}>{campaignData.description ?? ''}</Text>
        <Text style={styles.meta}>{Number(raised).toLocaleString()} / {Number(goal).toLocaleString()} FCFA</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('ContributeCampaign', { id, title: campaignData.title })}>
          <Text style={styles.ctaText}>Contribuer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  backBtn: { marginHorizontal: 24, padding: 14, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  backBtnText: { color: '#fff', fontWeight: '600' },
  loader: { marginTop: 24 },
  content: { padding: 16, paddingBottom: 32 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: '#f3f4f6' },
  desc: { fontSize: 15, color: '#374151', lineHeight: 24 },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  cta: { marginTop: 20, padding: 16, backgroundColor: '#db2777', borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
