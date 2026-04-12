import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
  /** Si true : `POST /moderation/report` (Express + Prisma). Sinon : `POST /mobile/report` (legacy). */
  useModerationEndpoint?: boolean;
}

const REASONS = [
  { id: 'spam', label: 'Spam', icon: 'mail-unread' },
  { id: 'harassment', label: 'Harcèlement', icon: 'hand-left' },
  { id: 'nudity', label: 'Nudité / Contenu sexuel', icon: 'eye-off' },
  { id: 'violence', label: 'Violence / Danger', icon: 'warning' },
  { id: 'scam', label: 'Arnaque / Fraude', icon: 'shield' },
  { id: 'other', label: 'Autre raison', icon: 'ellipsis-horizontal' },
];

function severityForReason(reason: string): string {
  if (['harassment', 'nudity', 'violence'].includes(reason)) return 'high';
  if (reason === 'scam') return 'high';
  return 'medium';
}

function alertCompat(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  if (onOk && message != null) {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    return;
  }
  Alert.alert(title, message ?? '');
}

export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  useModerationEndpoint = false,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason('');
      setDescription('');
      setLoading(false);
    }
  }, [visible]);

  const handleReport = async () => {
    if (!reason) {
      alertCompat('Erreur', 'Sélectionnez une raison');
      return;
    }
    if (reason === 'other' && !description.trim()) {
      alertCompat('Erreur', 'Décrivez le problème pour « Autre raison ».');
      return;
    }
    if (!targetId?.trim()) {
      alertCompat('Erreur', 'Cible de signalement invalide.');
      return;
    }
    setLoading(true);
    try {
      const desc = description.trim() || undefined;
      await apiClient.post('/moderation/report', {
        contentType: targetType,
        contentId: targetId.trim(),
        reason,
        description: desc,
        severity: severityForReason(reason),
      });
      alertCompat(
        'Signalement envoyé',
        'Merci pour votre signalement. Notre équipe va examiner ce contenu.',
        () => {
          setReason('');
          setDescription('');
          onClose();
        }
      );
    } catch {
      alertCompat('Erreur', 'Impossible d\'envoyer le signalement.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    Boolean(reason)
    && Boolean(targetId?.trim())
    && (reason !== 'other' || Boolean(description.trim()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Signaler</Text>
          <Text style={styles.subtitle}>Pourquoi signalez-vous ce contenu ?</Text>
          {REASONS.map(r => (
            <TouchableOpacity key={r.id} style={[styles.reasonRow, reason === r.id && styles.reasonActive]} onPress={() => setReason(r.id)}>
              <Ionicons name={r.icon as any} size={20} color={reason === r.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.reasonText, reason === r.id && { color: Colors.primary }]}>{r.label}</Text>
              {reason === r.id && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
          {!!reason && (
            <TextInput
              style={styles.descInput}
              placeholder={reason === 'other' ? 'Décrivez le problème (obligatoire)…' : 'Précisions (optionnel)…'}
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          )}
          <TouchableOpacity style={[styles.reportBtn, (!canSubmit || loading) && { opacity: 0.5 }]} onPress={handleReport} disabled={!canSubmit || loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.reportBtnText}>Envoyer le signalement</Text>}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: Spacing.lg },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: 4 },
  reasonActive: { backgroundColor: 'rgba(139,92,246,0.1)' },
  reasonText: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  descInput: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, height: 80, textAlignVertical: 'top', marginVertical: Spacing.sm },
  reportBtn: { backgroundColor: '#E91E63', borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
  reportBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.md },
});
