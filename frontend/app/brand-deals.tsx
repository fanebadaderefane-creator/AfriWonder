/**
 * Écran Brand Deals — collaborations marques pour les créateurs.
 * Branché sur GET/POST /api/proxy/brand-deals .
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';

type Deal = {
  id: string;
  brand_name: string;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'active' | 'completed' | 'rejected';
  notes?: string;
  deliverables?: string;
  created_at?: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFA500',
  active: '#00BFA5',
  completed: '#4CAF50',
  rejected: '#FF5252',
};

export default function BrandDealsScreen() {
  const insets = useSafeAreaInsets();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDeliverables, setNewDeliverables] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient.get('/brand-deals?limit=30');
      const data = res.data?.data?.deals || res.data?.data || [];
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!newBrand.trim()) {
      Alert.alert('Erreur', 'Nom de la marque requis');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/brand-deals', {
        brand_name: newBrand.trim(),
        amount: newAmount ? Number(newAmount) : undefined,
        currency: 'XOF',
        deliverables: newDeliverables.trim() || undefined,
      });
      setShowCreate(false);
      setNewBrand(''); setNewAmount(''); setNewDeliverables('');
      void load();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.error?.message || 'Création impossible');
    } finally {
      setSubmitting(false);
    }
  };

  const totalEarned = deals
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Brand Deals</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.backBtn}>
          <Ionicons name="add" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Revenus collaborations</Text>
        <Text style={styles.summaryValue}>{totalEarned.toLocaleString()} FCFA</Text>
        <Text style={styles.summaryHint}>{deals.length} collaboration{deals.length > 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={Colors.primary}
            />
          }
        >
          {deals.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucune collaboration</Text>
              <Text style={styles.emptyText}>
                Enregistrez vos collaborations marques pour les suivre, facturer et déclarer vos revenus.
              </Text>
              <TouchableOpacity style={styles.cta} onPress={() => setShowCreate(true)}>
                <Text style={styles.ctaText}>+ Nouvelle collaboration</Text>
              </TouchableOpacity>
            </View>
          ) : (
            deals.map((d) => (
              <View key={d.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBrand}>{d.brand_name}</Text>
                  {d.deliverables && <Text style={styles.cardMeta} numberOfLines={2}>{d.deliverables}</Text>}
                  <View style={styles.cardFooter}>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[d.status || 'pending'] }]}>
                      <Text style={styles.badgeText}>{(d.status || 'pending').toUpperCase()}</Text>
                    </View>
                    {d.created_at && (
                      <Text style={styles.cardDate}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</Text>
                    )}
                  </View>
                </View>
                {d.amount != null && (
                  <Text style={styles.cardAmount}>
                    {Number(d.amount).toLocaleString()}{'\n'}
                    <Text style={{ fontSize: FontSizes.xs, color: Colors.textSecondary }}>{d.currency || 'XOF'}</Text>
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle collaboration</Text>
            <TextInput
              value={newBrand}
              onChangeText={setNewBrand}
              placeholder="Nom de la marque"
              placeholderTextColor={Colors.textMuted}
              style={styles.modalInput}
            />
            <TextInput
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="Montant (FCFA, optionnel)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              style={styles.modalInput}
            />
            <TextInput
              value={newDeliverables}
              onChangeText={setNewDeliverables}
              placeholder="Livrables (vidéos, posts, lives…)"
              placeholderTextColor={Colors.textMuted}
              multiline
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.modalCancel}>
                <Text style={{ color: Colors.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} disabled={submitting} style={[styles.modalSubmit, submitting && { opacity: 0.5 }]}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSubmitText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  summary: { padding: Spacing.xl, alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.xl, borderRadius: BorderRadius.lg },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  summaryValue: { color: Colors.primary, fontSize: 28, fontWeight: 'bold', marginTop: Spacing.sm },
  summaryHint: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  empty: { alignItems: 'center', padding: Spacing.xxxl, gap: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  cta: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.lg },
  ctaText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  cardBrand: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  cardMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.pill },
  badgeText: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: 'bold' },
  cardDate: { color: Colors.textMuted, fontSize: FontSizes.xs },
  cardAmount: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.background, padding: Spacing.xl, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, gap: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  modalInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalCancel: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalSubmit: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: 'bold' },
});
