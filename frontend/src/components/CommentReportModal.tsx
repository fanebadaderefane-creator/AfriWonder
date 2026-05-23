import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import apiClient from '../api/client';

export interface CommentReportModalProps {
  visible: boolean;
  onClose: () => void;
  commentId: string;
}

/** Raisons d’envoi (libellés FR pour l’UI ; `id` inchangé pour l’API). */
const REPORT_REASONS: { id: string; label: string }[] = [
  { id: 'sexual_content', label: 'Contenu sexuel' },
  { id: 'violent_repulsive', label: 'Contenu violent ou répugnant' },
  { id: 'hateful_abusive', label: 'Contenu haineux ou abusif' },
  { id: 'harassment_bullying', label: 'Harcèlement ou intimidation' },
  { id: 'harmful_dangerous', label: 'Actes nuisibles ou dangereux' },
  { id: 'suicide_self_harm', label: 'Suicide, automutilation ou troubles alimentaires' },
  { id: 'misinformation', label: 'Désinformation' },
  { id: 'child_abuse', label: 'Maltraitance ou exploitation d’enfants' },
  { id: 'promotes_terrorism', label: 'Apologie ou promotion du terrorisme' },
  { id: 'spam_misleading', label: 'Spam ou contenu trompeur' },
];

function severityForReason(id: string): string {
  if (['child_abuse', 'promotes_terrorism', 'sexual_content', 'suicide_self_harm'].includes(id)) return 'high';
  if (['violent_repulsive', 'hateful_abusive', 'harassment_bullying', 'harmful_dangerous'].includes(id)) return 'high';
  return 'medium';
}

function alertCompat(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  if (onOk && message != null) {
    Alert.alert(title, message, [{ text: 'D’accord', onPress: onOk }]);
    return;
  }
  Alert.alert(title, message ?? '');
}

export default function CommentReportModal({ visible, onClose, commentId }: CommentReportModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setLoading(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!selectedId || !commentId?.trim()) {
      alertCompat('Signalement', 'Veuillez choisir une raison.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/moderation/report', {
        contentType: 'video_comment',
        contentId: commentId.trim(),
        reason: selectedId,
        description: REPORT_REASONS.find((r) => r.id === selectedId)?.label,
        severity: severityForReason(selectedId),
      });
      alertCompat(
        'Signalement envoyé',
        'Merci — notre équipe examinera ce commentaire.',
        () => {
          setSelectedId(null);
          onClose();
        }
      );
    } catch {
      alertCompat('Erreur', 'Impossible d’envoyer le signalement.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(selectedId) && Boolean(commentId?.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Signaler</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Fermer le signalement">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>Que se passe-t-il ?</Text>
          <Text style={styles.hint}>
            Nous vérifions le respect de nos règles de communauté — indiquez la raison qui correspond le
            mieux à la situation.
          </Text>

          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {REPORT_REASONS.map((r) => {
              const on = selectedId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.reasonRow}
                  onPress={() => setSelectedId(r.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.radioOuter, on && styles.radioOuterOn]}>
                    {on ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={styles.reasonLabel}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.reportBtn, canSubmit && !loading && styles.reportBtnActive]}
            onPress={() => void submit()}
            disabled={!canSubmit || loading}
            accessibilityLabel="Envoyer le signalement"
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={[styles.reportBtnText, canSubmit && styles.reportBtnTextActive]}>Signaler</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + 8,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  heading: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  list: {
    maxHeight: 360,
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  reasonLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  reportBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  reportBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reportBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  reportBtnTextActive: {
    color: Colors.background,
  },
});
