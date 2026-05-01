import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';
import eventsApi, { EventItem } from '../../src/api/eventsApi';

function formatDateRange(start?: string, end?: string): string {
  if (!start) return '';
  try {
    const s = new Date(start);
    const sStr = s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end) return sStr;
    const e = new Date(end);
    const eStr = e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return sStr === eStr ? sStr : `${sStr} → ${eStr}`;
  } catch {
    return '';
  }
}

export default function EventsScreen() {
  if (!featureFlags.servicesHub) {
    return <ComingSoonScreen title="Événements" description="La billetterie événements sera bientôt disponible." icon="ticket-outline" />;
  }
  return <EventsContent />;
}

function EventsContent() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await eventsApi.list({ page: 1, limit: 30 });
      setEvents(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les événements.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true).finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Événements</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>Événements indisponibles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="ticket-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun événement</Text>
          <Text style={styles.emptyText}>Aucun événement programmé pour le moment.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {events.map((ev) => {
            const start = ev.start_date ?? ev.startDate;
            const end = ev.end_date ?? ev.endDate;
            return (
              <TouchableOpacity
                key={ev.id}
                style={styles.card}
                onPress={() => router.push(`/services/event/${ev.id}` as any)}
              >
                {ev.cover_image || ev.images?.[0] ? (
                  <Image source={{ uri: ev.cover_image ?? ev.images?.[0] }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.cardImageFallback]}>
                    <Ionicons name="calendar-outline" size={36} color={Colors.textSecondary} />
                  </View>
                )}
                <View style={styles.cardOverlay}>
                  {ev.event_type ? <Text style={styles.eventType}>{ev.event_type}</Text> : null}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{ev.title}</Text>
                  <Text style={styles.cardMeta}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} /> {formatDateRange(start, end)}
                  </Text>
                  {ev.location || ev.city ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {ev.location ?? ev.city}
                    </Text>
                  ) : null}
                  {typeof ev.ticket_price === 'number' ? (
                    <Text style={styles.price}>
                      {ev.ticket_price === 0 ? 'Gratuit' : `À partir de ${ev.ticket_price.toLocaleString()} FCFA`}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  errorTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  cardImage: { width: '100%', height: 180, backgroundColor: Colors.card },
  cardImageFallback: { alignItems: 'center', justifyContent: 'center' },
  cardOverlay: { position: 'absolute', top: Spacing.md, left: Spacing.md },
  eventType: {
    backgroundColor: Colors.primary,
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    textTransform: 'uppercase',
  },
  cardInfo: { padding: Spacing.md, gap: Spacing.xs },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  cardMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  price: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold', marginTop: Spacing.xs },
});
