import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_LEADERBOARD } from '../data/gamificationMock';

const RANGE_OPTIONS = [
  { id: 'all', label: 'Global' },
  { id: 'weekly', label: 'Hebdo' },
  { id: 'monthly', label: 'Mensuel' },
  { id: 'yearly', label: 'Annuel' },
];

const COUNTRY_OPTIONS = [
  { id: '', label: 'Tous les pays' },
  { id: 'SN', label: 'Sénégal' },
  { id: 'CI', label: "Côte d'Ivoire" },
  { id: 'ML', label: 'Mali' },
  { id: 'BF', label: 'Burkina Faso' },
  { id: 'CM', label: 'Cameroun' },
  { id: 'FR', label: 'France' },
];

const CATEGORY_OPTIONS = [
  { id: '', label: 'Toutes catégories' },
  { id: 'tech', label: 'Technologie' },
  { id: 'business', label: 'Business' },
  { id: 'education', label: 'Éducation' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'sante', label: 'Santé' },
  { id: 'finance', label: 'Finance' },
];

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const [range, setRange] = useState('all');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { range };
      if (country) params.country = country;
      if (category) params.category = category;
      const res = await api.leaderboard.list(params);
      const arr = Array.isArray(res) ? res : (res?.leaderboard ?? []);
      setList(arr.length > 0 ? arr : MOCK_LEADERBOARD);
    } catch {
      setList(MOCK_LEADERBOARD);
    } finally {
      setLoading(false);
    }
  }, [range, country, category]);

  useEffect(() => {
    load();
  }, [load]);

  const getMedal = (rank) => {
    if (rank === 1) return { color: '#3b82f6', icon: 'medal' };
    if (rank === 2) return { color: '#6b7280', icon: 'medal' };
    if (rank === 3) return { color: '#6366f1', icon: 'medal' };
    return { color: '#9ca3af', icon: null };
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Classement</Text>
          <Text style={styles.subtitle}>Les meilleurs créateurs et contributeurs</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {RANGE_OPTIONS.map((r) => (
            <TouchableOpacity key={r.id} style={[styles.rangeChip, range === r.id && styles.rangeChipActive]} onPress={() => setRange(r.id)}>
              <Text style={[styles.rangeChipText, range === r.id && styles.rangeChipTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {COUNTRY_OPTIONS.slice(0, 5).map((c) => (
            <TouchableOpacity key={c.id || 'all'} style={[styles.filterChip, country === c.id && styles.filterChipActive]} onPress={() => setCountry(c.id)}>
              <Text style={[styles.filterChipText, country === c.id && styles.filterChipTextActive]} numberOfLines={1}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {CATEGORY_OPTIONS.slice(0, 5).map((c) => (
            <TouchableOpacity key={c.id || 'cat'} style={[styles.filterChip, category === c.id && styles.filterChipActive]} onPress={() => setCategory(c.id)}>
              <Text style={[styles.filterChipText, category === c.id && styles.filterChipTextActive]} numberOfLines={1}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.map((row, idx) => {
            const rank = row.rank ?? idx + 1;
            const medal = getMedal(rank);
            return (
              <View key={row.user_id || row.id || idx} style={styles.row}>
                <View style={styles.rankWrap}>
                  {medal.icon ? (
                    <Ionicons name={medal.icon} size={28} color={medal.color} />
                  ) : (
                    <Text style={styles.rankText}>{rank}</Text>
                  )}
                </View>
                <Image source={{ uri: row.user_avatar }} style={styles.avatar} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>{row.user_name || row.username || '—'}</Text>
                  <Text style={styles.rowMeta}>Niv. {row.level ?? '—'} · {row.badges_count ?? 0} badges</Text>
                </View>
                <Text style={styles.points}>{row.total_points?.toLocaleString?.() ?? row.total_points ?? 0} pts</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#2563eb' },
  headerCenter: { flex: 1, marginLeft: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  filters: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  rangeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f3f4f6', marginRight: 8 },
  rangeChipActive: { backgroundColor: '#2563eb' },
  rangeChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  rangeChipTextActive: { color: '#fff' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
  filterChipActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  filterChipText: { fontSize: 12, color: '#6b7280' },
  filterChipTextActive: { color: '#2563eb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  rankWrap: { width: 36, alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#e5e7eb' },
  rowBody: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  points: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
});
