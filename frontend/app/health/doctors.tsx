/**
 * Liste des médecins pour téléconsultation.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import teleconsultationApi, { Doctor } from '../../src/api/teleconsultationApi';

const SPECIALTIES = ['Tous', 'Médecine générale', 'Pédiatrie', 'Gynécologie', 'Cardiologie', 'Dermatologie', 'Dentiste'];

export default function DoctorsListScreen() {
  const insets = useSafeAreaInsets();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('Tous');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await teleconsultationApi.listDoctors({
        search: search.trim() || undefined,
        specialty: specialty === 'Tous' ? undefined : specialty,
        available_now: onlyAvailable || undefined,
      });
      setDoctors(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, specialty, onlyAvailable]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  const renderItem = ({ item }: { item: Doctor }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/health/book', params: { doctorId: item.id } } as Href)}
      activeOpacity={0.85}
    >
      <View style={styles.avatarWrap}>
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="medical" size={28} color={Colors.primary} />
          </View>
        )}
        {item.is_available_now ? <View style={styles.availDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>Dr. {item.full_name}</Text>
        <Text style={styles.specialty} numberOfLines={1}>{item.specialty}</Text>
        <View style={styles.cardMeta}>
          {item.is_verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.verifiedText}>Vérifié</Text>
            </View>
          ) : null}
          {item.average_rating ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {item.city ? <Text style={styles.city}>{item.city}</Text> : null}
        </View>
      </View>
      <View style={styles.feeWrap}>
        <Text style={styles.feeValue}>
          {item.consultation_fee_fcfa ? `${item.consultation_fee_fcfa.toLocaleString('fr-FR')}` : '—'}
        </Text>
        <Text style={styles.feeUnit}>FCFA</Text>
      </View>
    </TouchableOpacity>
  );

  const filteredSpecialtyChips = useMemo(() => SPECIALTIES, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Téléconsultation</Text>
        <TouchableOpacity onPress={() => router.push('/health/my-appointments' as Href)} style={styles.backBtn}>
          <Ionicons name="calendar" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Chercher un médecin, une spécialité…"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filteredSpecialtyChips}
          keyExtractor={(s) => s}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, specialty === item && styles.chipActive]}
              onPress={() => setSpecialty(item)}
            >
              <Text style={[styles.chipText, specialty === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <TouchableOpacity style={styles.filterRow} onPress={() => setOnlyAvailable((v) => !v)}>
        <Ionicons
          name={onlyAvailable ? 'checkbox' : 'square-outline'}
          size={20}
          color={onlyAvailable ? Colors.primary : Colors.textSecondary}
        />
        <Text style={styles.filterText}>Disponibles maintenant</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={doctors.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="medical-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucun médecin</Text>
              <Text style={styles.emptyText}>Essayez une autre spécialité ou retirez le filtre "Disponibles maintenant".</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, color: Colors.text, fontSize: FontSizes.md, paddingVertical: Spacing.md,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },

  chipsRow: { marginTop: Spacing.md },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, paddingHorizontal: Spacing.xl },
  filterText: { color: Colors.text, fontSize: FontSizes.md },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.background },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  availDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: Colors.surface },
  name: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  specialty: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6, flexWrap: 'wrap' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { color: '#4CAF50', fontSize: FontSizes.xs, fontWeight: '600' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  city: { color: Colors.textMuted, fontSize: FontSizes.xs },

  feeWrap: { alignItems: 'flex-end' },
  feeValue: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '800' },
  feeUnit: { color: Colors.textMuted, fontSize: FontSizes.xs },
});
