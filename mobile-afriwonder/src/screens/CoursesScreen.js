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
import { api } from '../api/client';
import { MOCK_FORMATIONS } from '../data/formationsMock';

const LEVEL_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' };
const FORMAT_LABELS = { online: 'En ligne', presential: 'Présentiel', hybrid: 'Hybride' };
const FORMAT_COLORS = { online: '#dbeafe', presential: '#dcfce7', hybrid: '#f3e8ff' };

export default function CoursesScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('all');
  const [level, setLevel] = useState('all');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.formations.list();
      const courses = res?.courses ?? res?.formations ?? [];
      const mapped = Array.isArray(courses) ? courses.map((c) => ({
        id: c.id,
        title: c.title ?? c.name,
        description: c.description,
        format: c.format ?? 'online',
        level: c.level ?? 'beginner',
        category: c.category,
        duration: c.duration,
        total_enrollments: c.total_enrollments ?? 0,
        average_rating: c.average_rating ?? 0,
        is_free: c.is_free ?? true,
        price: c.price,
        cover_url: c.cover_url ?? c.coverUrl,
      })) : [];
      setList(mapped.length > 0 ? mapped : MOCK_FORMATIONS);
    } catch {
      setList(MOCK_FORMATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = list.filter((f) => {
    const matchSearch = !search.trim() ||
      (f.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(search.toLowerCase());
    const matchFormat = format === 'all' || f.format === format;
    const matchLevel = level === 'all' || f.level === level;
    return matchSearch && matchFormat && matchLevel;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Formations</Text>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une formation, catégorie..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity style={[styles.filterChip, format === 'all' && styles.filterChipActive]} onPress={() => setFormat('all')}>
            <Text style={[styles.filterChipText, format === 'all' && styles.filterChipTextActive]}>Tous formats</Text>
          </TouchableOpacity>
          {Object.entries(FORMAT_LABELS).map(([k, v]) => (
            <TouchableOpacity key={k} style={[styles.filterChip, format === k && styles.filterChipActive]} onPress={() => setFormat(k)}>
              <Text style={[styles.filterChipText, format === k && styles.filterChipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity style={[styles.filterChip, level === 'all' && styles.filterChipActive]} onPress={() => setLevel('all')}>
            <Text style={[styles.filterChipText, level === 'all' && styles.filterChipTextActive]}>Tous niveaux</Text>
          </TouchableOpacity>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => (
            <TouchableOpacity key={k} style={[styles.filterChip, level === k && styles.filterChipActive]} onPress={() => setLevel(k)}>
              <Text style={[styles.filterChipText, level === k && styles.filterChipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="school-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>Aucune formation trouvée</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={styles.card}
              onPress={() => navigation.navigate('CourseDetails', { id: f.id })}
            >
              <View style={styles.coverWrap}>
                {f.cover_url ? (
                  <Image source={{ uri: f.cover_url }} style={styles.cover} />
                ) : (
                  <View style={styles.coverPlaceholder}><Ionicons name="school" size={40} color="#a7f3d0" /></View>
                )}
                <View style={[styles.formatBadge, { backgroundColor: FORMAT_COLORS[f.format] || '#e5e7eb' }]}>
                  <Text style={styles.formatBadgeText}>{FORMAT_LABELS[f.format]}</Text>
                </View>
                {f.is_free && (
                  <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>Gratuit</Text></View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{f.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{f.description}</Text>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{LEVEL_LABELS[f.level]}</Text>
                  {f.category && <Text style={styles.metaText}> · {f.category}</Text>}
                </View>
                <View style={styles.metaRow}>
                  {f.duration && <Text style={styles.metaSmall}><Ionicons name="time-outline" size={14} /> {f.duration}</Text>}
                  {f.total_enrollments > 0 && <Text style={styles.metaSmall}>{f.total_enrollments} inscrits</Text>}
                  {f.average_rating > 0 && <Text style={styles.metaSmall}>{f.average_rating.toFixed(1)}</Text>}
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.price}>{f.is_free ? 'Gratuit' : `${(f.price || 0).toLocaleString()} FCFA`}</Text>
                  <TouchableOpacity style={styles.inscribeBtn} onPress={() => navigation.navigate('CourseDetails', { id: f.id })}>
                    <Text style={styles.inscribeBtnText}>S'inscrire</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111' },
  filters: { paddingHorizontal: 16, marginBottom: 8 },
  filtersContent: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  coverWrap: { height: 160, backgroundColor: '#d1fae5', position: 'relative' },
  cover: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  formatBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  formatBadgeText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
  freeBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freeBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  meta: { flexDirection: 'row', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metaSmall: { fontSize: 12, color: '#6b7280' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 18, fontWeight: '700', color: '#047857' },
  inscribeBtn: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  inscribeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
