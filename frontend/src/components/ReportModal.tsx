import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import mobileApiClient from '../api/mobileClient';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
}

const REASONS = [
  { id: 'spam', label: 'Spam', icon: 'mail-unread' },
  { id: 'harassment', label: 'Harcèlement', icon: 'hand-left' },
  { id: 'nudity', label: 'Nudité / Contenu sexuel', icon: 'eye-off' },
  { id: 'violence', label: 'Violence / Danger', icon: 'warning' },
  { id: 'scam', label: 'Arnaque / Fraude', icon: 'shield' },
  { id: 'other', label: 'Autre raison', icon: 'ellipsis-horizontal' },
];

export default function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!reason) { Alert.alert('Erreur', 'Sélectionnez une raison'); return; }
    setLoading(true);
    try {
      await mobileApiClient.post('/mobile/report', { target_type: targetType, target_id: targetId, reason, description: description.trim() || undefined });
      Alert.alert('Signalement envoyé', 'Merci pour votre signalement. Notre équipe va examiner ce contenu.', [{ text: 'OK', onPress: onClose }]);
      setReason(''); setDescription('');
    } catch { Alert.alert('Erreur', 'Impossible d\'envoyer le signalement'); }
    finally { setLoading(false); }
  };

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
          {reason === 'other' && (
            <TextInput style={styles.descInput} placeholder="Décrivez le problème..." placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
          )}
          <TouchableOpacity style={[styles.reportBtn, (!reason || loading) && { opacity: 0.5 }]} onPress={handleReport} disabled={!reason || loading}>
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
