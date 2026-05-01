import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

/**
 * Suppression de compte — Exigence Google Play Store (mai 2024+).
 *
 * L'utilisateur doit pouvoir demander la suppression définitive de son compte
 * **depuis l'application elle-même**. Conforme RGPD article 17 (droit à l'oubli).
 *
 * Flow :
 * 1. Affichage clair de ce qui sera supprimé.
 * 2. Vérification du mot de passe (évite suppression accidentelle par un tiers).
 * 3. Confirmation explicite (case à cocher + bouton rouge).
 * 4. POST /api/privacy/delete-account → période de rétractation 30 jours.
 * 5. Statut visible ; possibilité d'annuler tant que la période court.
 */

type DeletionStatus = {
  status?: 'pending' | 'cancelled' | 'completed' | string;
  requested_at?: string;
  scheduled_for?: string;
  cancel_token?: string;
} | null;

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [status, setStatus] = useState<DeletionStatus>(null);
  const [reason, setReason] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await apiClient.get('/privacy/deletion-status');
      setStatus(res.data?.data ?? null);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const confirmAndDelete = () => {
    if (!confirmChecked) {
      Alert.alert(
        'Confirmation requise',
        'Cochez la case pour confirmer que vous comprenez les conséquences de la suppression.',
      );
      return;
    }
    Alert.alert(
      'Supprimer définitivement votre compte ?',
      'Cette action lancera une suppression définitive de votre compte AfriWonder sous 30 jours. Pendant cette période, vous pouvez encore annuler. Au-delà, vos données seront effacées et irrécupérables.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await apiClient.post('/privacy/delete-account', {
                reason: reason.trim() || undefined,
              });
              Alert.alert(
                'Demande enregistrée',
                res.data?.message
                  || 'Votre compte sera supprimé dans 30 jours. Vous pouvez annuler cette demande avant cette date depuis cet écran.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await loadStatus();
                    },
                  },
                ],
              );
            } catch (err) {
              const msg =
                (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
                || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || 'La suppression n’a pas pu être enregistrée. Réessayez dans quelques instants.';
              Alert.alert('Suppression impossible', String(msg).slice(0, 200));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const cancelDeletion = async () => {
    if (!status?.cancel_token) {
      Alert.alert('Action impossible', 'Aucune demande de suppression active.');
      return;
    }
    Alert.alert(
      'Annuler la suppression ?',
      'Votre compte sera conservé et redevient actif immédiatement.',
      [
        { text: 'Fermer', style: 'cancel' },
        {
          text: 'Oui, annuler',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiClient.post(`/privacy/cancel-deletion/${encodeURIComponent(status.cancel_token!)}`);
              Alert.alert('Annulée', 'Votre compte est conservé.');
              await loadStatus();
            } catch (err) {
              const msg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Annulation impossible. Réessayez dans quelques instants.';
              Alert.alert('Erreur', String(msg));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const logoutAndExit = async () => {
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login' as never);
    }
  };

  const scheduled = status?.scheduled_for
    ? new Date(status.scheduled_for).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const isPending = status?.status === 'pending';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supprimer mon compte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}>
        {loadingStatus ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : isPending ? (
          <>
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={24} color="#FFB020" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Suppression programmée</Text>
                <Text style={styles.pendingText}>
                  Votre compte sera définitivement supprimé
                  {scheduled ? ` le ${scheduled}` : ' sous 30 jours'}.
                  {'\n'}Vous pouvez encore annuler jusqu’à cette date.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              onPress={cancelDeletion}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Annuler la suppression</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={28} color="#FF3B30" />
              <Text style={styles.warningTitle}>Action définitive</Text>
              <Text style={styles.warningText}>
                La suppression de votre compte effacera vos données personnelles après une période de 30 jours. Pendant ce délai, vous pouvez annuler. Passé ce délai, l’opération est irréversible.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Ce qui sera supprimé</Text>
            <View style={styles.bulletList}>
              <BulletRow text="Votre profil (nom, photo, bio, username, email, téléphone)." />
              <BulletRow text="Vos publications, vidéos, stories, commentaires, likes." />
              <BulletRow text="Vos conversations et messages privés (E2EE inclus)." />
              <BulletRow text="Votre historique de paiements et votre portefeuille (solde non récupérable)." />
              <BulletRow text="Vos abonnements, contributions crowdfunding et réservations." />
              <BulletRow text="Vos préférences, notifications et connexions." />
            </View>

            <Text style={styles.sectionTitle}>Ce qui peut être conservé</Text>
            <View style={styles.bulletList}>
              <BulletRow text="Les factures et transactions financières obligatoires (conservation légale : jusqu’à 10 ans)." />
              <BulletRow text="Les signalements et sanctions de modération (anonymisés)." />
              <BulletRow text="Les logs de sécurité nécessaires à la protection de la plateforme." />
            </View>

            <Text style={styles.sectionTitle}>Raison (facultatif)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Aidez-nous à comprendre pourquoi vous partez (2000 caractères max)."
              placeholderTextColor={Colors.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.checkRow} onPress={() => setConfirmChecked((v) => !v)} activeOpacity={0.85}>
              <View style={[styles.checkbox, confirmChecked && styles.checkboxChecked]}>
                {confirmChecked ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
              </View>
              <Text style={styles.checkLabel}>
                Je comprends que la suppression sera définitive après 30 jours et que mes données seront effacées.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerBtn, (!confirmChecked || submitting) && styles.btnDisabled]}
              onPress={confirmAndDelete}
              disabled={!confirmChecked || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                  <Text style={styles.dangerBtnText}>Demander la suppression</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Conserver mon compte</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Alternatives moins radicales</Text>
        <TouchableOpacity style={styles.linkRow} onPress={logoutAndExit}>
          <Ionicons name="log-out-outline" size={20} color={Colors.text} />
          <Text style={styles.linkRowText}>Se déconnecter de cet appareil uniquement</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/settings/privacy' as never)}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.text} />
          <Text style={styles.linkRowText}>Ajuster mes paramètres de confidentialité</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
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
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.lg },
  loadingBox: { paddingVertical: Spacing.xxxl, alignItems: 'center' },

  pendingBanner: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,176,32,0.12)',
    borderColor: '#FFB020',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-start',
  },
  pendingTitle: { color: '#FFB020', fontWeight: '700', fontSize: FontSizes.md, marginBottom: Spacing.xs },
  pendingText: { color: Colors.text, fontSize: FontSizes.sm, lineHeight: 20 },

  warningBox: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  warningTitle: { color: '#FF3B30', fontSize: FontSizes.lg, fontWeight: '700' },
  warningText: { color: Colors.text, fontSize: FontSizes.md, textAlign: 'center', lineHeight: 22 },

  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },

  bulletList: { gap: Spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecondary, marginTop: 8 },
  bulletText: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },

  textarea: {
    minHeight: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSizes.md,
    backgroundColor: Colors.surface,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },

  checkRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  checkLabel: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, lineHeight: 20 },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FF3B30',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
  },
  dangerBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },

  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.md },

  btnDisabled: { opacity: 0.5 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  linkRowText: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
});
