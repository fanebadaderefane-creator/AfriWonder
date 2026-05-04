/**
 * Hub admin Super-App — KPIs + navigation vers les sous-écrans de contrôle.
 * Ne remplace PAS le `admin-dashboard` existant ; c'est un complément.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import adminSuperAppApi, { AdminSuperAppKpis } from '../../src/api/adminSuperAppApi';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtMoney = (n: number) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

interface ModuleCard {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: Href;
  stat?: string;
  hint?: string;
}

export default function AdminSuperAppScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<AdminSuperAppKpis | null>(null);

  const load = useCallback(async () => {
    try {
      const k = await adminSuperAppApi.kpis();
      setKpis(k);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const modules: ModuleCard[] = [
    {
      id: 'tontines', label: 'Tontines', icon: 'people',
      color: '#FF6B00',
      route: '/(admin)/super-app-tontines' as Href,
      stat: kpis ? `${kpis.tontines.active} actives` : '—',
      hint: kpis ? `${kpis.tontines.total_members} membres` : undefined,
    },
    {
      id: 'crowdfunding', label: 'Crowdfunding', icon: 'heart',
      color: '#E91E63',
      route: '/(admin)/super-app-crowdfunding' as Href,
      stat: kpis?.crowdfunding != null ? `${kpis.crowdfunding.pending} en attente` : '—',
      hint: kpis?.crowdfunding != null ? `${kpis.crowdfunding.active} actives · ${kpis.crowdfunding.suspended} suspendues` : undefined,
    },
    {
      id: 'bus', label: 'Bus', icon: 'bus',
      color: '#2196F3',
      route: '/(admin)/super-app-bus' as Href,
      stat: kpis ? `${kpis.travel.bus_bookings_paid} / ${kpis.travel.bus_bookings_total} payés` : '—',
    },
    {
      id: 'rides', label: 'Courses VTC', icon: 'car',
      color: '#795548',
      route: '/(admin)/super-app-rides' as Href,
      stat: 'Assign. chauffeur',
    },
    {
      id: 'hotels', label: 'Hôtels', icon: 'bed',
      color: '#9C27B0',
      route: '/(admin)/super-app-hotels' as Href,
      stat: kpis ? `${kpis.travel.hotel_bookings_total} réservations` : '—',
    },
    {
      id: 'bills', label: 'Factures utilitaires', icon: 'receipt',
      color: '#4CAF50',
      route: '/(admin)/super-app-bills' as Href,
      stat: kpis ? `${kpis.bills.paid} payées` : '—',
      hint: kpis ? `${kpis.bills.pending} en attente` : undefined,
    },
    {
      id: 'savings', label: 'Épargne', icon: 'trending-up',
      color: '#009688',
      route: '/(admin)/super-app-savings' as Href,
      stat: kpis ? `${kpis.savings.active_plans} plans` : '—',
      hint: kpis ? fmtMoney(kpis.savings.total_balance_fcfa) : undefined,
    },
    {
      id: 'cards', label: 'Cartes virtuelles', icon: 'card',
      color: '#E91E63',
      route: '/(admin)/super-app-cards' as Href,
      stat: kpis ? `${kpis.cards.active} actives` : '—',
    },
    {
      id: 'live-commerce', label: 'Live commerce', icon: 'pricetag',
      color: '#FF5722',
      route: '/(admin)/super-app-live-commerce' as Href,
      stat: kpis ? `${kpis.live_commerce.pinned_products} épinglés` : '—',
    },
    {
      id: 'doctors', label: 'Médecins à valider', icon: 'medical',
      color: '#00BCD4',
      route: '/(admin)/super-app-doctors' as Href,
      stat: 'KYC pending',
    },
    {
      id: 'stars', label: 'Appels vidéo payants', icon: 'videocam',
      color: '#D81B60',
      route: '/(admin)/stars' as Href,
      stat: 'Module isolé',
      hint: 'Stars · bookings · litiges',
    },
    {
      id: 'system-audit',
      label: 'Audit système',
      icon: 'pulse',
      color: '#00BCD4',
      route: '/(admin)/system-audit' as Href,
      stat: 'E2E · R2 · Redis · Paiements',
      hint: 'Données serveur',
    },
  ];

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Super-app — Contrôles</Text>
        <TouchableOpacity onPress={() => void load()} style={styles.backBtn}>
          <Ionicons name="refresh" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      >
        <Text style={styles.intro}>
          Supervision des modules super-app ajoutés (vagues 1-8). Ce tableau est complémentaire au dashboard admin principal — il ne remplace pas les onglets existants.
        </Text>

        {kpis ? (
          <View style={styles.kpiGrid}>
            <KpiCell label="Tontines actives" value={fmt(kpis.tontines.active)} color="#FF6B00" />
            <KpiCell label="Membres tontine" value={fmt(kpis.tontines.total_members)} color="#FF6B00" />
            {kpis.crowdfunding != null ? (
              <>
                <KpiCell label="Campagnes en attente" value={fmt(kpis.crowdfunding.pending)} color="#E91E63" />
                <KpiCell label="Campagnes actives" value={fmt(kpis.crowdfunding.active)} color="#E91E63" />
                <KpiCell label="Campagnes suspendues" value={fmt(kpis.crowdfunding.suspended)} color="#E91E63" />
              </>
            ) : null}
            <KpiCell label="Billets bus payés" value={fmt(kpis.travel.bus_bookings_paid)} color="#2196F3" />
            <KpiCell label="Réservations hôtel" value={fmt(kpis.travel.hotel_bookings_total)} color="#9C27B0" />
            <KpiCell label="Factures payées" value={fmt(kpis.bills.paid)} color="#4CAF50" />
            <KpiCell label="Plans d'épargne" value={fmt(kpis.savings.active_plans)} color="#009688" />
            <KpiCell label="Encours épargne" value={fmtMoney(kpis.savings.total_balance_fcfa)} color="#009688" big />
            <KpiCell label="Cartes virtuelles" value={fmt(kpis.cards.active)} color="#E91E63" />
            <KpiCell label="Produits en live" value={fmt(kpis.live_commerce.pinned_products)} color="#FF5722" />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Modules</Text>
        <View style={styles.modulesGrid}>
          {modules.map((m) => (
            <TouchableOpacity key={m.id} style={styles.moduleCard} onPress={() => router.push(m.route)} activeOpacity={0.85}>
              {m.id === 'crowdfunding' && (kpis?.crowdfunding?.pending ?? 0) > 0 ? (
                <View style={styles.todoBadge}>
                  <Text style={styles.todoBadgeText}>A traiter</Text>
                </View>
              ) : null}
              <View style={[styles.moduleIconWrap, { backgroundColor: m.color + '22' }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <Text style={styles.moduleLabel}>{m.label}</Text>
              <Text style={styles.moduleStat}>{m.stat}</Text>
              {m.hint ? <Text style={styles.moduleHint}>{m.hint}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

function KpiCell({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <View style={[styles.kpiCell, big && styles.kpiCellBig]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  content: { padding: Spacing.xl, gap: Spacing.md },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCell: { flexBasis: '30%', flexGrow: 1, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  kpiCellBig: { flexBasis: '62%' },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },

  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', marginTop: Spacing.lg },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moduleCard: {
    position: 'relative',
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  moduleIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  moduleLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  moduleStat: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  moduleHint: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  todoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#D32F2F',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
