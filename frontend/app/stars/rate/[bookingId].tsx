/**
 * Noter un appel terminé — module Paid Video Calls.
 * Route : `/stars/rate/[bookingId]`.
 *
 * Permet aussi d'ouvrir un litige si l'appel s'est mal passé.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../../src/theme/designSystem';
import starsApi from '../../../src/api/starsApi';

const DISPUTE_REASONS = [
  'technical_issue',
  'inappropriate_behavior',
  'no_show_star',
  'poor_quality',
  'other',
] as const;

const REASON_LABEL: Record<string, string> = {
  technical_issue: 'Problème technique',
  inappropriate_behavior: 'Comportement inapproprié',
  no_show_star: 'La star ne s\'est pas connectée',
  poor_quality: 'Qualité insuffisante',
  other: 'Autre',
};

export default function StarRateScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'rate' | 'dispute'>('rate');
  const [reason, setReason] = useState<typeof DISPUTE_REASONS[number]>('technical_issue');
  const [desc, setDesc] = useState('');

  const submitRating = useCallback(async () => {
    if (!bookingId) return;
    setSending(true);
    try {
      await starsApi.rateBooking(bookingId, rating, review.trim() || undefined);
      Alert.alert('Merci', 'Votre avis a bien été enregistré.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Avis', (e as Error)?.message || 'Impossible d\'envoyer votre avis.');
    } finally {
      setSending(false);
    }
  }, [bookingId, rating, review]);

  const submitDispute = useCallback(async () => {
    if (!bookingId) return;
    if (!desc.trim() || desc.trim().length < 10) {
      Alert.alert('Litige', 'Merci de décrire le problème (au moins 10 caractères).');
      return;
    }
    setSending(true);
    try {
      await starsApi.openDispute(bookingId, reason, desc.trim());
      Alert.alert(
        'Litige ouvert',
        'Notre équipe va l\'examiner. Vous recevrez une notification dès qu\'une décision est prise.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Litige', (e as Error)?.message || 'Impossible d\'ouvrir le litige.');
    } finally {
      setSending(false);
    }
  }, [bookingId, reason, desc]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'rate' ? 'Comment était l\'appel ?' : 'Signaler un problème'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        {mode === 'rate' ? (
          <>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  style={styles.starBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}
                >
                  <Ionicons name="star" size={40} color={n <= rating ? colors.primary : colors.border} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Votre commentaire (facultatif)</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={review}
              onChangeText={setReview}
              placeholder="Partagez votre expérience…"
              placeholderTextColor={colors.textSecondary}
              maxLength={500}
            />
            <TouchableOpacity style={styles.submitBtn} disabled={sending} onPress={submitRating}>
              {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Envoyer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setMode('dispute')}>
              <Text style={styles.linkText}>Un problème ? Signaler un litige</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Motif</Text>
            <View style={styles.reasonsWrap}>
              {DISPUTE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, reason === r && styles.reasonChipOn]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonText, reason === r && { color: '#FFF' }]}>{REASON_LABEL[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Description (obligatoire)</Text>
            <TextInput
              style={[styles.textArea, { minHeight: 120 }]}
              multiline
              value={desc}
              onChangeText={setDesc}
              placeholder="Expliquez ce qui s'est passé…"
              placeholderTextColor={colors.textSecondary}
              maxLength={2000}
            />
            <TouchableOpacity style={styles.submitBtn} disabled={sending} onPress={submitDispute}>
              {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Ouvrir le litige</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => setMode('rate')}>
              <Text style={styles.linkText}>Revenir à la note</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    iconBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: FontSizes.lg, fontWeight: '700', flex: 1, textAlign: 'center' },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs },
    starBtn: { padding: Spacing.xs },
    label: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    textArea: {
      color: c.text, fontSize: FontSizes.md, backgroundColor: c.card,
      borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border,
      padding: Spacing.md, minHeight: 96, textAlignVertical: 'top',
    },
    submitBtn: { backgroundColor: c.primary, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill },
    submitText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
    linkBtn: { alignItems: 'center', paddingVertical: Spacing.md },
    linkText: { color: c.primary, fontWeight: '600' },
    reasonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    reasonChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    reasonChipOn: { backgroundColor: c.primary, borderColor: c.primary },
    reasonText: { color: c.text, fontWeight: '600', fontSize: FontSizes.sm },
  });
}
