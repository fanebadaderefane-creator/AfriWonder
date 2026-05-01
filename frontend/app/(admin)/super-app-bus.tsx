import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, Modal, TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type Tab = 'companies' | 'bookings';

export default function AdminBusScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('companies');
  const [companies, setCompanies] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'companies') setCompanies(await adminSuperAppApi.listBusCompanies());
      else setBookings(await adminSuperAppApi.listBusBookings());
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return Alert.alert('Nom requis', 'Saisissez le nom de la compagnie.');
    try {
      await adminSuperAppApi.createBusCompany({ name: form.name.trim(), phone: form.phone.trim() || undefined });
      setForm({ name: '', phone: '' });
      setOpenModal(false);
      await load();
    } catch { Alert.alert('Erreur', 'Création impossible.'); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus (Mali)</Text>
        {tab === 'companies' ? (
          <TouchableOpacity onPress={() => setOpenModal(true)} style={styles.backBtn}>
            <Ionicons name="add" size={26} color={Colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <View style={styles.tabs}>
        {(['companies', 'bookings'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'companies' ? 'Compagnies' : 'Réservations'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'companies' ? (
            companies.length === 0 ? (
              <Text style={styles.empty}>Aucune compagnie — créez-en une pour que les trajets apparaissent.</Text>
            ) : (
              companies.map((c: any) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardSub}>{c._count?.routes ?? 0} trajets · {c.phone ?? '—'}</Text>
                </View>
              ))
            )
          ) : (
            bookings.length === 0 ? <Text style={styles.empty}>Aucune réservation</Text> : (
              bookings.map((b: any) => (
                <View key={b.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{b.passenger_name} · {b.seats} places</Text>
                  <Text style={styles.cardSub}>
                    {b.route?.company?.name} · {b.route?.origin_city} → {b.route?.destination_city}
                  </Text>
                  <Text style={styles.cardSub}>
                    {new Date(b.travel_date).toLocaleDateString('fr-FR')} · {b.total_fcfa?.toLocaleString('fr-FR')} FCFA · {b.payment_status}
                  </Text>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      <Modal visible={openModal} transparent animationType="slide" onRequestClose={() => setOpenModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle compagnie</Text>
            <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} />
            <TextInput style={styles.input} placeholder="Téléphone" placeholderTextColor={Colors.textMuted} value={form.phone} onChangeText={(v) => setForm((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalGhost} onPress={() => setOpenModal(false)}><Text style={styles.modalGhostText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={handleCreate}><Text style={styles.modalPrimaryText}>Créer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.text, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, gap: Spacing.sm },
  empty: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', padding: Spacing.xxl },
  card: { padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  cardSub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.sm },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800', marginBottom: Spacing.sm },
  input: {
    padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, color: Colors.text, fontSize: FontSizes.md,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalGhost: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center' },
  modalGhostText: { color: Colors.text, fontWeight: '600' },
  modalPrimary: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  modalPrimaryText: { color: '#FFF', fontWeight: '700' },
});
