import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

export default function AdminHotelsScreen() {
  return (
    <AdminListScreen<any, 'all'>
      title="Hôtels & Réservations"
      fetch={async () => {
        const [hotels, bookings] = await Promise.all([
          adminSuperAppApi.listHotels(),
          adminSuperAppApi.listHotelBookings(),
        ]);
        // Fusion : d'abord les hôtels (en-tête), puis les réservations
        return [
          ...hotels.map((h: any) => ({ __kind: 'hotel', ...h })),
          ...bookings.map((b: any) => ({ __kind: 'booking', ...b })),
        ];
      }}
      keyExtractor={(r: any) => `${r.__kind}-${r.id}`}
      emptyLabel="Aucun hôtel ni réservation"
      renderItem={(r: any) => {
        if (r.__kind === 'hotel') {
          return (
            <View style={styles.hotelCard}>
              <View style={styles.hotelHeader}>
                <Ionicons name="bed" size={20} color={Colors.primary} />
                <Text style={styles.title}>{r.name}</Text>
                {r.star_rating ? <Text style={styles.stars}>{'★'.repeat(Math.round(r.star_rating))}</Text> : null}
              </View>
              <Text style={styles.sub}>{r.city} · {r._count?.rooms ?? 0} chambres · {r._count?.bookings ?? 0} réservations</Text>
              {r.price_fcfa_from ? <Text style={styles.price}>À partir de {r.price_fcfa_from.toLocaleString('fr-FR')} FCFA</Text> : null}
              <TouchableOpacity
                style={styles.editRow}
                onPress={() => router.push(`/(admin)/super-app-hotel-edit/${r.id}` as never)}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
                <Text style={styles.editText}>Modifier (hôtel + chambres)</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={styles.bookingCard}>
            <Text style={styles.title}>{r.hotel?.name} — {r.nights} nuit(s)</Text>
            <Text style={styles.sub}>
              {r.guest?.username} · du {new Date(r.check_in).toLocaleDateString('fr-FR')} au {new Date(r.check_out).toLocaleDateString('fr-FR')}
            </Text>
            <Text style={styles.sub}>{r.total_fcfa?.toLocaleString('fr-FR')} FCFA · {r.payment_status}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  hotelCard: { padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  hotelHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stars: { color: '#FFD700', fontWeight: '700' },
  bookingCard: { padding: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  title: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  price: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700' },
  editRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  editText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700' },
});
