import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import eventsApi, { EventItem } from '../../../src/api/eventsApi';
import { toAbsoluteMediaUrl } from '../../../src/utils/absoluteMediaUrl';
import { useAuthStore } from '../../../src/store/authStore';
import { getDemoEventById, isAfriWonderDemoId } from '../../../src/demo/superAppDemoSeed';
import { appAlert } from '../../../src/utils/appAlert';
import { DemoContentBanner } from '../../../src/components/common/DemoContentBanner';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.accessToken);
  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState('1');
  const [phone, setPhone] = useState('');
  const [ticketType, setTicketType] = useState<string>('standard');
  const [booking, setBooking] = useState(false);
  const [fromDemo, setFromDemo] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFromDemo(false);
    try {
      const e = await eventsApi.get(String(id));
      setEv(e);
      const types = e.ticket_types;
      if (types?.length) setTicketType(types[0].id || types[0].name || 'standard');
    } catch {
      const demo = getDemoEventById(String(id));
      if (demo) {
        setEv(demo);
        const types = demo.ticket_types;
        if (types?.length) setTicketType(types[0].id || types[0].name || 'standard');
        setFromDemo(true);
      } else {
        setEv(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const cover = ev?.cover_image || ev?.images?.[0];
  const absCover = cover ? toAbsoluteMediaUrl(cover) : '';

  const handleBook = async () => {
    if (isAfriWonderDemoId(String(id))) {
      appAlert(
        'Démonstration',
        'Événement fictif : aucune réservation ni paiement réel.',
      );
      return;
    }
    if (!token) {
      Alert.alert('Connexion', 'Connectez-vous pour réserver des billets.');
      return;
    }
    const q = Math.max(1, parseInt(qty, 10) || 1);
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      Alert.alert('Téléphone', 'Indiquez un numéro valide pour le paiement mobile.');
      return;
    }
    setBooking(true);
    try {
      const res = await eventsApi.book(String(id), {
        phone: phone.trim(),
        quantity: q,
        ticket_type: ticketType,
        payment_method: 'orange_money',
        source: 'expo',
      });
      const payUrl =
        (res as { payment_url?: string })?.payment_url
        || (res as { booking?: { payment_url?: string } })?.booking?.payment_url;
      if (payUrl) {
        const can = await Linking.canOpenURL(payUrl);
        if (can) await Linking.openURL(payUrl);
        else Alert.alert('Paiement', 'Ouvrez le lien de paiement depuis votre navigateur.');
      } else {
        Alert.alert('Réservation', 'Demande enregistrée. Suivez les instructions si un paiement est requis.');
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Réservation impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Événement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.err}>Événement introuvable.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ev.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {fromDemo ? <DemoContentBanner /> : null}
        {absCover ? <Image source={{ uri: absCover }} style={styles.hero} /> : null}
        <Text style={styles.title}>{ev.title}</Text>
        {ev.location ? (
          <Text style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} /> {ev.location}
            {ev.city ? ` · ${ev.city}` : ''}
          </Text>
        ) : null}
        {ev.description ? <Text style={styles.desc}>{ev.description}</Text> : null}

        {ev.ticket_types && ev.ticket_types.length > 0 ? (
          <>
            <Text style={styles.section}>Type de billet</Text>
            {ev.ticket_types.map((t) => {
              const tid = t.id || t.name || 'standard';
              const label = `${t.name || tid} — ${Number(t.price || 0).toLocaleString('fr-FR')} FCFA`;
              const sel = ticketType === tid;
              return (
                <TouchableOpacity
                  key={tid}
                  style={[styles.chip, sel && styles.chipOn]}
                  onPress={() => setTicketType(tid)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}

        <Text style={styles.section}>Quantité</Text>
        <TextInput
          value={qty}
          onChangeText={setQty}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="1"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.section}>Téléphone (paiement)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          placeholder="+223 …"
          placeholderTextColor={Colors.textMuted}
        />

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => void handleBook()}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.bookBtnText}>Réserver</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: Colors.text, fontWeight: '800', fontSize: FontSizes.md, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.lg },
  hero: { width: '100%', height: 200, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, backgroundColor: Colors.card },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  meta: { color: Colors.textSecondary, marginTop: Spacing.sm },
  desc: { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 22 },
  section: { color: Colors.text, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  chip: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  chipText: { color: Colors.textSecondary },
  chipTextOn: { color: Colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  bookBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  bookBtnText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  err: { color: Colors.textSecondary },
});
