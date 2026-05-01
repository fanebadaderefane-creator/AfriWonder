/**
 * Composant générique admin : liste filtrable + action rows.
 * Réutilisé par tous les sous-écrans admin super-app pour garder le code compact.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';

export interface AdminListFilter<K extends string> { id: K; label: string }

export interface AdminListScreenProps<T, F extends string> {
  title: string;
  fetch: (filter: F) => Promise<T[]>;
  filters?: AdminListFilter<F>[];
  initialFilter?: F;
  renderItem: (item: T, refresh: () => void) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyLabel?: string;
  extraHeader?: React.ReactNode;
  onAdd?: () => void;
}

export function AdminListScreen<T, F extends string = string>(props: AdminListScreenProps<T, F>) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<F>(props.initialFilter ?? (props.filters?.[0]?.id as F));

  const load = useCallback(async () => {
    try {
      const data = await props.fetch(filter);
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, props]);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{props.title}</Text>
        {props.onAdd ? (
          <TouchableOpacity onPress={props.onAdd} style={styles.backBtn}>
            <Ionicons name="add" size={26} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {props.filters && props.filters.length > 0 ? (
        <View style={styles.filtersRow}>
          {props.filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {props.extraHeader}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={props.keyExtractor}
          renderItem={({ item }) => <>{props.renderItem(item, load)}</>}
          contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{props.emptyLabel ?? 'Aucune donnée'}</Text>
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
  headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  filtersRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.xl, gap: Spacing.sm, paddingBottom: 100 },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md },
});

export default AdminListScreen;
