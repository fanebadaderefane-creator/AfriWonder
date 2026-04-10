import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import mobileApiClient from '../../src/api/mobileClient';

const REGIONS = ['Mali', 'Sénégal', 'Côte d\'Ivoire', 'Guinée', 'Burkina Faso', 'Afrique de l\'Ouest'];
const INTERESTS = ['Mode', 'Musique', 'Cuisine', 'Sport', 'Tech', 'Beauté', 'Business', 'Education'];
const BUDGETS = [5000, 10000, 25000, 50000, 100000, 250000];

export default function AdsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'create'|'my'>('create');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('7');
  const [region, setRegion] = useState('Mali');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [ctaText, setCtaText] = useState('En savoir plus');
  const [loading, setLoading] = useState(false);
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  const loadMyAds = async () => {
    setLoadingAds(true);
    try {
      const res = await mobileApiClient.get('/mobile/ads/my');
      setMyAds(res.data?.data || []);
    } catch {} finally { setLoadingAds(false); }
  };

  useEffect(() => { if (tab === 'my') loadMyAds(); }, [tab]);

  const toggleInterest = (i: string) => setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const handleCreateAd = async () => {
    if (!title.trim()) { Alert.alert('Erreur', 'Titre requis'); return; }
    if (!budget || parseFloat(budget) < 1000) { Alert.alert('Erreur', 'Budget minimum: 1,000 FCFA'); return; }
    setLoading(true);
    try {
      await mobileApiClient.post('/mobile/ads/create', {
        title: title.trim(), description: description.trim(),
        budget: parseFloat(budget), duration_days: parseInt(duration) || 7,
        target_audience: { region, interests: selectedInterests },
        cta_text: ctaText, payment_method: 'orange-money',
      });
      Alert.alert('Publicité créée!', 'Votre publicité est maintenant active.', [{ text: 'OK', onPress: () => { setTab('my'); loadMyAds(); setTitle(''); setDescription(''); setBudget(''); } }]);
    } catch (e: any) { Alert.alert('Erreur', e.response?.data?.detail || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>AfriWonder Ads</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'create' && styles.tabActive]} onPress={() => setTab('create')}>
          <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>Créer une pub</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'my' && styles.tabActive]} onPress={() => setTab('my')}>
          <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>Mes pubs</Text>
        </TouchableOpacity>
      </View>

      {tab === 'create' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.label}>Titre de la publicité</Text>
          <TextInput style={styles.input} placeholder="Ex: Promo été 2025" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Décrivez votre offre..." placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />

          <Text style={styles.label}>Budget (FCFA)</Text>
          <View style={styles.budgetRow}>
            {BUDGETS.slice(0, 3).map(b => (
              <TouchableOpacity key={b} style={[styles.budgetChip, budget === b.toString() && styles.budgetChipActive]} onPress={() => setBudget(b.toString())}>
                <Text style={[styles.budgetChipText, budget === b.toString() && { color: '#FFF' }]}>{(b/1000)}K</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.budgetRow}>
            {BUDGETS.slice(3).map(b => (
              <TouchableOpacity key={b} style={[styles.budgetChip, budget === b.toString() && styles.budgetChipActive]} onPress={() => setBudget(b.toString())}>
                <Text style={[styles.budgetChipText, budget === b.toString() && { color: '#FFF' }]}>{(b/1000)}K</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Durée: {duration} jours</Text>
          <View style={styles.budgetRow}>
            {[3, 7, 14, 30].map(d => (
              <TouchableOpacity key={d} style={[styles.budgetChip, duration === d.toString() && styles.budgetChipActive]} onPress={() => setDuration(d.toString())}>
                <Text style={[styles.budgetChipText, duration === d.toString() && { color: '#FFF' }]}>{d}j</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Ciblage - Région</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {REGIONS.map(r => (
              <TouchableOpacity key={r} style={[styles.budgetChip, region === r && styles.budgetChipActive]} onPress={() => setRegion(r)}>
                <Text style={[styles.budgetChipText, region === r && { color: '#FFF' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Ciblage - Intérêts</Text>
          <View style={[styles.budgetRow, { flexWrap: 'wrap' }]}>
            {INTERESTS.map(i => (
              <TouchableOpacity key={i} style={[styles.budgetChip, selectedInterests.includes(i) && styles.budgetChipActive]} onPress={() => toggleInterest(i)}>
                <Text style={[styles.budgetChipText, selectedInterests.includes(i) && { color: '#FFF' }]}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.submitBtn, (!title || !budget || loading) && { opacity: 0.5 }]} onPress={handleCreateAd} disabled={!title || !budget || loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="megaphone" size={20} color="#FFF" /><Text style={styles.submitBtnText}>Lancer la publicité</Text></>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {loadingAds ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : myAds.length === 0 ? (
            <View style={styles.emptyState}><Ionicons name="megaphone-outline" size={50} color="rgba(255,255,255,0.3)" /><Text style={styles.emptyText}>Aucune publicité</Text></View>
          ) : myAds.map(ad => (
            <View key={ad.id} style={styles.adCard}>
              <View style={styles.adHeader}>
                <Text style={styles.adTitle}>{ad.title}</Text>
                <View style={[styles.adStatus, { backgroundColor: ad.status === 'active' ? '#4ECDC420' : '#FF6B6B20' }]}>
                  <Text style={{ color: ad.status === 'active' ? '#4ECDC4' : '#FF6B6B', fontSize: 11, fontWeight: '600' }}>{ad.status === 'active' ? 'Active' : 'Terminée'}</Text>
                </View>
              </View>
              <Text style={styles.adDesc} numberOfLines={2}>{ad.description}</Text>
              <View style={styles.adStats}>
                <View style={styles.adStatItem}><Ionicons name="eye" size={14} color={Colors.textSecondary} /><Text style={styles.adStatText}>{(ad.impressions || 0).toLocaleString()}</Text></View>
                <View style={styles.adStatItem}><Ionicons name="finger-print" size={14} color={Colors.textSecondary} /><Text style={styles.adStatText}>{ad.clicks || 0} clics</Text></View>
                <View style={styles.adStatItem}><Ionicons name="cash" size={14} color={Colors.textSecondary} /><Text style={styles.adStatText}>{(ad.spent || 0).toLocaleString()}/{(ad.budget || 0).toLocaleString()}</Text></View>
              </View>
            </View>
          ))}
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
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md },
  budgetRow: { flexDirection: 'row', gap: Spacing.sm },
  budgetChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface },
  budgetChipActive: { backgroundColor: Colors.primary },
  budgetChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#667eea', borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.xl, gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  adCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  adHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  adTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', flex: 1 },
  adStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  adStats: { flexDirection: 'row', gap: Spacing.lg },
  adStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adStatText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
});
