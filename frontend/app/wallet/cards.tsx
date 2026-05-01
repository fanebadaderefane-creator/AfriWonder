/**
 * Cartes virtuelles — gérer ses cartes virtuelles AfriWonder.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { virtualCardsApi, VirtualCard } from '../../src/api/superAppApi';

export default function VirtualCardsScreen() {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await virtualCardsApi.listMine();
      setCards(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      await virtualCardsApi.create();
      await load();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Impossible de créer la carte.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setCreating(false);
    }
  };

  const toggleBlock = async (c: VirtualCard) => {
    const label = c.status === 'active' ? 'bloquer' : 'débloquer';
    Alert.alert(`Confirmer : ${label} la carte ?`, `Carte •••• ${c.last4}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            await virtualCardsApi.toggleBlock(c.id);
            await load();
          } catch {
            Alert.alert('Action impossible', 'Réessayez.');
          }
        },
      },
    ]);
  };

  const remove = (c: VirtualCard) => {
    Alert.alert('Supprimer cette carte ?', `Carte •••• ${c.last4}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await virtualCardsApi.delete(c.id);
            await load();
          } catch {
            Alert.alert('Action impossible', 'Réessayez.');
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Cartes virtuelles</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
      >
        {cards.filter((c) => c.status !== 'expired').length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="card" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Pas encore de carte</Text>
            <Text style={styles.emptyText}>Créez une carte virtuelle pour payer en ligne avec votre portefeuille AfriWonder.</Text>
          </View>
        ) : (
          cards
            .filter((c) => c.status !== 'expired')
            .map((c) => (
              <View key={c.id} style={[styles.cardVisual, c.status === 'blocked' && styles.cardBlocked]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardBrand}>AFRIWONDER VIRTUAL</Text>
                  <Ionicons name={c.status === 'active' ? 'shield-checkmark' : 'lock-closed'} size={20} color="#FFF" />
                </View>
                <Text style={styles.cardNumber}>•••• •••• •••• {c.last4}</Text>
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.cardMeta}>EXPIRE</Text>
                    <Text style={styles.cardMetaValue}>
                      {new Date(c.expires_at).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })}
                    </Text>
                  </View>
                  {c.spending_limit != null ? (
                    <View>
                      <Text style={styles.cardMeta}>LIMITE / MOIS</Text>
                      <Text style={styles.cardMetaValue}>{c.spending_limit.toLocaleString('fr-FR')} FCFA</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity style={styles.cardAction} onPress={() => void toggleBlock(c)}>
                    <Ionicons name={c.status === 'active' ? 'lock-closed-outline' : 'lock-open-outline'} size={16} color="#FFF" />
                    <Text style={styles.cardActionText}>{c.status === 'active' ? 'Bloquer' : 'Débloquer'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardAction} onPress={() => remove(c)}>
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={styles.cardActionText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}

        <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.5 }]} onPress={create} disabled={creating}>
          {creating ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.createBtnText}>Créer une nouvelle carte</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.info}>
          Les cartes virtuelles AfriWonder vous permettent de payer chez les marchands en ligne en utilisant le solde de votre portefeuille. Une carte bloquée refuse toute transaction.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.xl, gap: Spacing.lg },

  emptyBox: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },

  cardVisual: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    gap: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12,
    elevation: 6,
  },
  cardBlocked: { backgroundColor: '#555' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: '#FFFFFF99', fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 2 },
  cardNumber: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: '700', letterSpacing: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardMeta: { color: '#FFFFFF99', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardMetaValue: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700', marginTop: 2 },

  cardActionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.18)' },
  cardActionText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },

  info: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, textAlign: 'center', paddingHorizontal: Spacing.md },
});
