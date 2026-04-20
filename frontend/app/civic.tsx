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
  Modal,
  Alert,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../src/api/client';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';
import { useAuthStore } from '../src/store/authStore';

interface Petition {
  id: string;
  title: string;
  description: string;
  goal_signatures: number;
  current_signatures: number;
  category?: string | null;
  creator?: { full_name?: string | null; profile_image?: string | null } | null;
}

export default function CivicScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Petition | null>(null);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get('/civic', { params: { page: 1, limit: 30, status: 'active' } });
      const payload = res.data?.data ?? res.data;
      const list = (payload?.petitions ?? []) as Petition[];
      setPetitions(list);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Impossible de charger les pétitions.';
      setError(msg);
      setPetitions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSign = async () => {
    if (!selected || !user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour signer une pétition.');
      return;
    }
    setSigning(true);
    try {
      await apiClient.post(`/civic/${encodeURIComponent(selected.id)}/sign`, {});
      Alert.alert('Merci', 'Votre signature a bien été enregistrée.');
      setSelected(null);
      void load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        || (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as { message?: string })?.message
        || 'Signature impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setSigning(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Engagement civique</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />
          }
        >
          <View style={styles.impactCard}>
            <Ionicons name="heart" size={32} color={Colors.primary} />
            <Text style={styles.impactTitle}>Votre impact</Text>
            <Text style={styles.impactValue}>
              Parcourez les pétitions actives et soutenez les causes qui comptent pour vous.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Pétitions en cours</Text>
          {petitions.length === 0 ? (
            <Text style={styles.empty}>Aucune pétition active pour le moment.</Text>
          ) : (
            petitions.map((petition) => {
              const goal = Math.max(1, petition.goal_signatures || 1);
              const cur = petition.current_signatures ?? 0;
              const pct = Math.min(100, Math.round((cur / goal) * 100));
              const img = toAbsoluteMediaUrl(petition.creator?.profile_image || '').trim();
              return (
                <TouchableOpacity key={petition.id} style={styles.petitionCard} onPress={() => setSelected(petition)}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.petitionImage} />
                  ) : (
                    <View style={[styles.petitionImage, styles.petitionImagePh]}>
                      <Text style={styles.petitionImagePhText}>{(petition.title || '?').slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.petitionInfo}>
                    <Text style={styles.petitionTitle} numberOfLines={2}>{petition.title}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.petitionSignatures}>
                      {cur.toLocaleString('fr-FR')} / {petition.goal_signatures.toLocaleString('fr-FR')} signatures
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Projets communautaires</Text>
          <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/crowdfunding' as any)}>
            <View style={styles.projectIcon}>
              <Ionicons name="rocket" size={24} color={Colors.primary} />
            </View>
            <View style={styles.projectInfo}>
              <Text style={styles.projectTitle}>Crowdfunding</Text>
              <Text style={styles.projectDate}>Soutenez des projets concrets sur AfriWonder</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selected?.title}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDesc}>{selected?.description}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.signBtn, signing && { opacity: 0.7 }]}
              disabled={signing}
              onPress={() => void onSign()}
            >
              {signing ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.signBtnText}>Signer la pétition</Text>
              )}
            </TouchableOpacity>
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
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryBtnText: { color: Colors.text, fontWeight: '600' },
  empty: { color: Colors.textSecondary, marginBottom: Spacing.lg },
  impactCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.xxl },
  impactTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginTop: Spacing.sm },
  impactValue: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  petitionCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  petitionImage: { width: 60, height: 60, borderRadius: BorderRadius.sm },
  petitionImagePh: { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  petitionImagePhText: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: 'bold' },
  petitionInfo: { flex: 1 },
  petitionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.sm },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  petitionSignatures: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  projectIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  projectInfo: { flex: 1 },
  projectTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  projectDate: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.md },
  modalTitle: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  modalBody: { maxHeight: 320, marginBottom: Spacing.lg },
  modalDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  signBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
  signBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
});
