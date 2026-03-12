import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { MOCK_CAMPAIGNS, CATEGORIES } from '../data/crowdfundingMock';

function getDaysRemaining(endDate) {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function getProgressPercentage(current, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((Number(current) / Number(goal)) * 100));
}

export default function CrowdfundingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.crowdfunding.list({ status: 'active', limit: 100 });
      const list = res?.campaigns ?? [];
      if (Array.isArray(list) && list.length > 0) {
        setCampaigns(list);
      } else {
        setCampaigns(MOCK_CAMPAIGNS);
      }
    } catch {
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const filtered = campaigns.filter((c) => {
    const matchCat = selectedCategory === 'all' || (c.category || '') === selectedCategory;
    const matchSearch = !searchQuery.trim() || (c.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'ending_soon') return new Date(a.end_date) - new Date(b.end_date);
    if (sortBy === 'newest') return new Date(b.created_at || b.end_date) - new Date(a.created_at || a.end_date);
    const progA = getProgressPercentage(a.current_amount, a.goal_amount);
    const progB = getProgressPercentage(b.current_amount, b.goal_amount);
    return progB - progA;
  });

  const totalCollected = sorted.reduce((acc, c) => acc + Number(c.current_amount || 0), 0);
  const totalBackers = sorted.reduce((acc, c) => acc + Number(c.backers_count || 0), 0);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#db2777" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Crowdfunding</Text>
        </View>
        {user && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateCampaign')}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.createBtnText}>Créer</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
            onPress={() => setSelectedCategory(c.id)}
          >
            <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'trending' && styles.sortBtnActive]} onPress={() => setSortBy('trending')}>
          <Text style={[styles.sortBtnText, sortBy === 'trending' && styles.sortBtnTextActive]}>Tendances</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'ending_soon' && styles.sortBtnActive]} onPress={() => setSortBy('ending_soon')}>
          <Text style={[styles.sortBtnText, sortBy === 'ending_soon' && styles.sortBtnTextActive]}>Bientôt terminées</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, sortBy === 'newest' && styles.sortBtnActive]} onPress={() => setSortBy('newest')}>
          <Text style={[styles.sortBtnText, sortBy === 'newest' && styles.sortBtnTextActive]}>Nouveautés</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{sorted.length}</Text>
          <Text style={styles.statLabel}>Campagnes actives</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalBackers.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>Contributeurs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalCollected.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>FCFA collectés</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="small" color="#db2777" style={styles.loader} />
        ) : (
          sorted.map((campaign) => {
            const imageUrl = (campaign.images && campaign.images[0]) || campaign.image;
            const progress = getProgressPercentage(campaign.current_amount, campaign.goal_amount);
            const daysLeft = getDaysRemaining(campaign.end_date);
            return (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => navigation.navigate('CampaignDetails', { id: campaign.id })}
              >
                {campaign.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>À la une</Text>
                  </View>
                )}
                <Image source={{ uri: imageUrl }} style={styles.campaignImage} />
                <View style={styles.campaignBody}>
                  <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
                  <Text style={styles.campaignDesc} numberOfLines={2}>{campaign.description}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#64748b" />
                    <Text style={styles.locationText}>{campaign.location || 'Mali'}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {Number(campaign.current_amount || 0).toLocaleString('fr-FR')} / {Number(campaign.goal_amount || 0).toLocaleString('fr-FR')} FCFA ({progress}%)
                  </Text>
                  <View style={styles.campaignMeta}>
                    <Text style={styles.campaignMetaItem}>{campaign.backers_count ?? 0} contributeurs</Text>
                    <Text style={styles.campaignMetaItem}>{daysLeft} jours restants</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf2f8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 12 },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#db2777', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: '#0f172a' },
  categoriesRow: { paddingLeft: 16, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fce7f3', marginRight: 8 },
  chipActive: { backgroundColor: '#db2777' },
  chipText: { fontSize: 13, color: '#9d174d' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fce7f3' },
  sortBtnActive: { backgroundColor: '#db2777' },
  sortBtnText: { fontSize: 13, color: '#9d174d' },
  sortBtnTextActive: { color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loader: { marginVertical: 24 },
  campaignCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  featuredBadge: { position: 'absolute', top: 10, left: 10, zIndex: 1, backgroundColor: '#db2777', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  featuredBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  campaignImage: { width: '100%', height: 160, backgroundColor: '#e2e8f0' },
  campaignBody: { padding: 14 },
  campaignTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  campaignDesc: { fontSize: 13, color: '#64748b', marginTop: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: { fontSize: 12, color: '#64748b', marginLeft: 4 },
  progressBar: { height: 8, backgroundColor: '#fce7f3', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#db2777', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#64748b', marginTop: 6 },
  campaignMeta: { flexDirection: 'row', marginTop: 8, gap: 16 },
  campaignMetaItem: { fontSize: 12, color: '#94a3b8' },
});
