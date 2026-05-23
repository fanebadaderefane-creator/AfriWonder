/**
 * Admin : courses VTC — liste + assignation chauffeur en un clic.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type RideFilter = 'all' | 'requested' | 'accepted' | 'in_progress';

const FILTERS: { id: RideFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'requested', label: 'Demandées' },
  { id: 'accepted', label: 'Acceptées' },
  { id: 'in_progress', label: 'En cours' },
];

export default function AdminSuperAppRidesScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<RideFilter>('all');
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerRide, setPickerRide] = useState<any | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const status = filter === 'all' ? undefined : filter;
      const [r, d] = await Promise.all([
        adminSuperAppApi.listRides(status),
        adminSuperAppApi.listDriversForAdmin(),
      ]);
      setRides(r);
      setDrivers(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAssign = (driverUserId: string) => {
    if (!pickerRide) return;
    setAssigning(true);
    void (async () => {
      try {
        await adminSuperAppApi.assignDriverToRide(pickerRide.id, driverUserId);
        setPickerRide(null);
        await load();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
        Alert.alert('Assignation impossible', msg || 'Réessayez dans quelques instants.');
      } finally {
        setAssigning(false);
      }
    })();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Courses & chauffeurs</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune course pour ce filtre</Text>
          </View>
        }
        renderItem={({ item: r }) => {
          const canAssign = !['completed', 'cancelled'].includes(r.status);
          return (
            <View style={styles.card}>
              <Text style={styles.route}>
                {r.pickup_location} → {r.dropoff_location}
              </Text>
              <Text style={styles.sub}>
                {r.passenger?.username} · {r.status} ·{' '}
                {r.price != null ? `${Number(r.price).toLocaleString('fr-FR')} FCFA` : '—'}
              </Text>
              {r.driver ? (
                <Text style={styles.driverLine}>
                  Chauffeur : {r.driver_name || r.driver?.full_name || r.driver?.username}
                </Text>
              ) : (
                <Text style={styles.noDriver}>Aucun chauffeur assigné</Text>
              )}
              {canAssign ? (
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => setPickerRide(r)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.assignBtnText}>
                    {r.driver_id ? 'Changer le chauffeur' : 'Assigner un chauffeur'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={!!pickerRide} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choisir un chauffeur</Text>
            <Text style={styles.modalHint} numberOfLines={2}>
              {pickerRide ? `${pickerRide.pickup_location} → ${pickerRide.dropoff_location}` : ''}
            </Text>
            {assigning ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : (
              <FlatList
                data={drivers}
                keyExtractor={(d) => d.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item: d }) => (
                  <TouchableOpacity
                    style={styles.driverRow}
                    onPress={() => onAssign(d.user_id)}
                  >
                    <Ionicons name="car" size={20} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{d.full_name}</Text>
                      <Text style={styles.sub}>
                        {d.vehicle_type} · {d.license_plate}
                        {!d.is_verified ? ' · non vérifié' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.cancelModal} onPress={() => !assigning && setPickerRide(null)}>
              <Text style={styles.cancelModalText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  list: { padding: Spacing.xl, gap: Spacing.sm, paddingBottom: 100 },
  card: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  route: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  driverLine: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  noDriver: { color: '#C62828', fontSize: FontSizes.sm },
  assignBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text },
  modalHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4, marginBottom: Spacing.md },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  driverName: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  cancelModal: { marginTop: Spacing.md, alignItems: 'center', padding: Spacing.md },
  cancelModalText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.md },
});
