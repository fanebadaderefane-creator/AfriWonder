/**
 * Écran d'accueil Tontines — liste mes tontines + bouton créer + rejoindre.
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
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import tontinesApi, { Tontine } from '../../src/api/tontinesApi';

const STATUS_LABEL: Record<string, string> = {
  draft: 'En préparation',
  active: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#FFB020',
  active: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#9E9E9E',
};

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Hebdomadaire',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Mensuelle',
};

export default function TontinesListScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Tontine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await tontinesApi.listMine();
      setItems(data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Impossible de charger vos tontines.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Code requis', 'Saisissez le code d\'invitation partagé par le créateur.');
      return;
    }
    setJoining(true);
    try {
      await tontinesApi.joinByCode(code);
      setJoinCode('');
      setJoinModalOpen(false);
      await load();
      Alert.alert('Rejointe !', 'Vous êtes maintenant membre de cette tontine.');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Code invalide ou tontine indisponible.';
      Alert.alert('Impossible de rejoindre', String(msg));
    } finally {
      setJoining(false);
    }
  };

  const renderItem = ({ item }: { item: Tontine }) => {
    const memberCount = item.members?.filter((m) => m.status === 'accepted').length ?? 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/tontines/${item.id}` as Href)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22', borderColor: STATUS_COLOR[item.status] }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardStat}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.cardStatText}>{memberCount} / {item.max_members} membres</Text>
          </View>
          <View style={styles.cardStat}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.cardStatText}>{FREQ_LABEL[item.frequency]}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardAmount}>
            {item.contribution_amount.toLocaleString('fr-FR')} {item.currency}
            <Text style={styles.cardAmountHint}> / cycle</Text>
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes tontines</Text>
        <TouchableOpacity onPress={() => setJoinModalOpen(true)} style={styles.backBtn}>
          <Ionicons name="enter-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="wallet-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune tontine pour l'instant</Text>
            <Text style={styles.emptyText}>
              Créez votre première tontine ou rejoignez-en une via le code d'invitation d'un ami.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/tontines/create' as Href)}
      >
        <Ionicons name="add" size={28} color="#FFF" />
        <Text style={styles.fabText}>Créer une tontine</Text>
      </TouchableOpacity>

      <Modal visible={joinModalOpen} transparent animationType="fade" onRequestClose={() => setJoinModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rejoindre une tontine</Text>
            <Text style={styles.modalHint}>Saisissez le code à 8 caractères partagé par le créateur.</Text>
            <TextInput
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="A1B2C3D4"
              placeholderTextColor={Colors.textMuted}
              style={styles.modalInput}
              autoCapitalize="characters"
              maxLength={32}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity onPress={() => setJoinModalOpen(false)} style={styles.modalBtnGhost} disabled={joining}>
                <Text style={styles.modalBtnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleJoin} style={[styles.modalBtnPrimary, joining && styles.btnDisabled]} disabled={joining}>
                {joining ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnPrimaryText}>Rejoindre</Text>}
              </TouchableOpacity>
            </View>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },

  listContent: { padding: Spacing.xl, paddingBottom: 140, gap: Spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardName: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '700' },
  cardRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  cardAmount: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '800' },
  cardAmountHint: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: '400' },

  fab: {
    position: 'absolute',
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '100%', maxWidth: 420, gap: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  modalHint: { color: Colors.textSecondary, fontSize: FontSizes.md },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: '700',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnGhost: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  modalBtnGhostText: { color: Colors.text, fontWeight: '600' },
  modalBtnPrimary: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  modalBtnPrimaryText: { color: '#FFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
