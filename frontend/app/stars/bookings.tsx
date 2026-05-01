/**
 * Mes rendez-vous — module Paid Video Calls.
 * Route : `/stars/bookings`.
 *
 * Deux niveaux de filtrage (matching screenshots Baroni-style) :
 *  - Tabs principaux (rôle) : Côté fan / Côté star
 *  - Filtres secondaires (statut) : Tout / En attente / Approuvé / Rejeté
 *
 * Le bouton "Actualiser" est un FAB toujours accessible en bas-droite.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator,
  Alert, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import starsApi, { type StarBooking } from '../../src/api/starsApi';

type RoleTab = 'fan' | 'star';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'En attente', color: '#B8860B' },
  confirmed: { label: 'Approuvé', color: '#2E7D32' },
  ongoing: { label: 'En cours', color: '#1976D2' },
  completed: { label: 'Terminé', color: '#555' },
  cancelled: { label: 'Annulé', color: '#888' },
  no_show_fan: { label: 'Absent(e)', color: '#C62828' },
  no_show_star: { label: 'Star absente', color: '#C62828' },
  disputed: { label: 'Litige', color: '#D84315' },
  refunded: { label: 'Remboursé', color: '#6A1B9A' },
};

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'Tout',
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

/** Mapping filtre UI → liste de statuts backend correspondants. */
function matchesFilter(status: string, f: StatusFilter): boolean {
  if (f === 'all') return true;
  if (f === 'pending') return status === 'pending_payment';
  if (f === 'approved') return ['confirmed', 'ongoing', 'completed'].includes(status);
  if (f === 'rejected') return ['cancelled', 'no_show_fan', 'no_show_star', 'disputed', 'refunded'].includes(status);
  return true;
}

export default function StarsBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [role, setRole] = useState<RoleTab>('fan');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [items, setItems] = useState<StarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await starsApi.listMyBookings(role);
      setItems(list);
    } catch (e) {
      Alert.alert('Réservations', (e as Error)?.message || 'Liste indisponible');
    }
  }, [role]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const cancelOne = useCallback(async (b: StarBooking) => {
    Alert.alert(
      'Annuler l’appel ?',
      role === 'fan'
        ? 'Remboursement intégral si tu annules suffisamment à l’avance (fenêtre fixée par AfriWonder). Après cette fenêtre : remboursement partiel — une partie reste pour la plateforme et la star (frais d’annulation tardive).'
        : 'Le fan sera remboursé intégralement. Une pénalité no-show peut s’appliquer sur ton profil star.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler l’appel',
          style: 'destructive',
          onPress: async () => {
            try {
              await starsApi.cancelBooking(b.id, role);
              await load();
            } catch (e) {
              Alert.alert('Annulation', (e as Error)?.message || 'Impossible d’annuler');
            }
          },
        },
      ],
    );
  }, [load, role]);

  const filteredItems = useMemo(
    () => items.filter((b) => matchesFilter(b.status, statusFilter)),
    [items, statusFilter],
  );

  const renderItem = useCallback(({ item }: { item: StarBooking }) => {
    const status = STATUS_LABEL[item.status] ?? { label: item.status, color: '#777' };
    const counterpart = role === 'fan' ? item.star_profile?.user : item.fan;
    const counterpartName = counterpart?.full_name || counterpart?.username || (role === 'fan' ? 'Star' : 'Fan');
    const avatar = counterpart?.profile_image;
    const when = new Date(item.scheduled_start_at).toLocaleString('fr-FR', {
      dateStyle: 'medium', timeStyle: 'short',
    });
    const canJoin = item.status === 'confirmed' || item.status === 'ongoing';
    const canCancel = ['pending_payment', 'confirmed'].includes(item.status);
    const canRate = role === 'fan' && item.status === 'completed' && !item.rating;
    return (
      <View style={styles.card}>
        <View style={styles.rowTop}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{counterpartName}</Text>
            <Text style={styles.when}>{when}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.rowMeta}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{item.duration_minutes + (item.extra_minutes || 0)} min</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaText}>F {item.price_fcfa.toLocaleString('fr-FR')}</Text>
        </View>
        <View style={styles.rowActions}>
          {canJoin ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => router.push(`/stars/call/${item.id}` as never)}
              accessibilityRole="button"
            >
              <Ionicons name="videocam" size={16} color="#FFF" />
              <Text style={styles.btnText}>Rejoindre</Text>
            </TouchableOpacity>
          ) : null}
          {canRate ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => router.push(`/stars/rate/${item.id}` as never)}
              accessibilityRole="button"
            >
              <Ionicons name="star" size={16} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>Noter</Text>
            </TouchableOpacity>
          ) : null}
          {canCancel ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => cancelOne(item)}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color="#FFF" />
              <Text style={styles.btnText}>Annuler</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }, [styles, role, cancelOne, colors]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes rendez-vous</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/stars' as never)}
          accessibilityLabel="Découvrir des stars"
        >
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* TAB ROLE (fan / star) — pill style fort */}
      <View style={styles.roleTabs}>
        <TouchableOpacity
          style={[styles.roleTab, role === 'fan' && styles.roleTabOn]}
          onPress={() => setRole('fan')}
          accessibilityRole="button"
        >
          <Text style={[styles.roleTabText, role === 'fan' && styles.roleTabTextOn]}>Appels vidéo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleTab, role === 'star' && styles.roleTabOn]}
          onPress={() => setRole('star')}
          accessibilityRole="button"
        >
          <Text style={[styles.roleTabText, role === 'star' && styles.roleTabTextOn]}>Côté star</Text>
        </TouchableOpacity>
      </View>

      {/* FILTRES STATUT */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((f) => {
          const isOn = statusFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, isOn && styles.filterChipOn]}
              onPress={() => setStatusFilter(f)}
              accessibilityRole="button"
            >
              <Text style={[styles.filterText, isOn && styles.filterTextOn]}>
                {STATUS_FILTER_LABEL[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun rendez-vous trouvé</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxxl * 2 }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {/* FAB Actualiser (toujours accessible) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel="Actualiser la liste"
      >
        <Ionicons name="refresh" size={16} color="#FFF" />
        <Text style={styles.fabText}>Actualiser</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    iconBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: FontSizes.xl, fontWeight: '800' },

    roleTabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    roleTab: {
      paddingHorizontal: Spacing.lg, paddingVertical: 10,
      borderRadius: BorderRadius.pill, backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
    },
    roleTabOn: { backgroundColor: c.primary, borderColor: c.primary },
    roleTabText: { color: c.text, fontWeight: '700', fontSize: FontSizes.sm },
    roleTabTextOn: { color: '#FFF' },

    filtersRow: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
    filterChip: {
      paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.pill,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    filterChipOn: { backgroundColor: c.primary, borderColor: c.primary },
    filterText: { color: c.text, fontSize: FontSizes.sm, fontWeight: '600' },
    filterTextOn: { color: '#FFF' },

    card: { backgroundColor: c.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: c.border, gap: Spacing.sm },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
    name: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    when: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
    statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
    statusText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '700' },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: c.textSecondary, fontSize: FontSizes.sm },
    metaSep: { color: c.textSecondary, marginHorizontal: 4 },
    rowActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 4 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, height: 36, borderRadius: BorderRadius.pill },
    btnPrimary: { backgroundColor: c.primary },
    btnSecondary: { backgroundColor: c.card, borderWidth: 1, borderColor: c.primary },
    btnDanger: { backgroundColor: '#C62828' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
    emptyText: { color: c.text, fontSize: FontSizes.md },

    fab: {
      position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: Spacing.lg, height: 44, borderRadius: 22, backgroundColor: c.primary,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    },
    fabText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
  });
}
