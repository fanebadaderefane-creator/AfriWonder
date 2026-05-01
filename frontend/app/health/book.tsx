/**
 * Prise de RDV téléconsultation avec un médecin.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import teleconsultationApi, { Doctor } from '../../src/api/teleconsultationApi';

type Mode = 'video' | 'audio' | 'chat';

const MODE_LABEL: Record<Mode, string> = {
  video: 'Vidéo',
  audio: 'Audio',
  chat: 'Messages',
};

const MODE_ICON: Record<Mode, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  video: 'videocam',
  audio: 'call',
  chat: 'chatbubbles',
};

function generateSlots(base: Date, count: number): Date[] {
  const slots: Date[] = [];
  // Arrondi au quart d'heure suivant
  const d = new Date(base);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  d.setMinutes(d.getMinutes() + 15); // 1er créneau dans 15 min
  for (let i = 0; i < count; i++) {
    slots.push(new Date(d.getTime() + i * 30 * 60 * 1000));
  }
  return slots;
}

export default function BookAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('video');
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDoctor = useCallback(async () => {
    if (!doctorId) return;
    const d = await teleconsultationApi.getDoctor(doctorId);
    setDoctor(d);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => { void loadDoctor(); }, [loadDoctor]);

  const slots = useMemo(() => generateSlots(new Date(), 8), []);

  const handleBook = async () => {
    if (!doctor || !selectedSlot) {
      Alert.alert('Créneau requis', 'Sélectionnez un créneau horaire pour la consultation.');
      return;
    }
    setSubmitting(true);
    try {
      const appt = await teleconsultationApi.createAppointment({
        doctor_id: doctor.id,
        scheduled_at: selectedSlot.toISOString(),
        duration_min: 30,
        mode,
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        'Rendez-vous confirmé ✓',
        `Votre consultation ${MODE_LABEL[mode].toLowerCase()} avec Dr. ${doctor.full_name} est programmée le ${selectedSlot.toLocaleDateString('fr-FR')} à ${selectedSlot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        [{ text: 'Voir mes RDV', onPress: () => router.replace(`/health/appointment/${appt.id}` as never) }],
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'La réservation n\'a pas pu aboutir. Réessayez.';
      Alert.alert('Erreur', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: Colors.text }}>Médecin introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prendre rendez-vous</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.doctorCard}>
          {doctor.profile_image ? (
            <Image source={{ uri: doctor.profile_image }} style={styles.doctorAvatar} />
          ) : (
            <View style={[styles.doctorAvatar, styles.doctorAvatarPlaceholder]}>
              <Ionicons name="medical" size={36} color={Colors.primary} />
            </View>
          )}
          <Text style={styles.doctorName}>Dr. {doctor.full_name}</Text>
          <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
          {doctor.consultation_fee_fcfa ? (
            <Text style={styles.doctorFee}>{doctor.consultation_fee_fcfa.toLocaleString('fr-FR')} FCFA / consultation</Text>
          ) : null}
          {doctor.bio ? <Text style={styles.doctorBio}>{doctor.bio}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Mode de consultation</Text>
        <View style={styles.modeRow}>
          {(['video', 'audio', 'chat'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Ionicons name={MODE_ICON[m]} size={20} color={mode === m ? '#FFF' : Colors.text} />
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{MODE_LABEL[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Créneaux disponibles</Text>
        <View style={styles.slotsWrap}>
          {slots.map((slot) => {
            const isSelected = selectedSlot?.getTime() === slot.getTime();
            return (
              <TouchableOpacity
                key={slot.toISOString()}
                style={[styles.slot, isSelected && styles.slotActive]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.slotDay, isSelected && styles.slotActiveText]}>
                  {slot.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.slotTime, isSelected && styles.slotActiveText]}>
                  {slot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Motif de consultation (optionnel)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Décrivez brièvement vos symptômes..."
          placeholderTextColor={Colors.textMuted}
          style={styles.textarea}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.bookBtn, (submitting || !selectedSlot) && styles.btnDisabled]}
          onPress={handleBook}
          disabled={submitting || !selectedSlot}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#FFF" />
              <Text style={styles.bookBtnText}>
                Confirmer le RDV{doctor.consultation_fee_fcfa ? ` (${doctor.consultation_fee_fcfa.toLocaleString('fr-FR')} FCFA)` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.xl, gap: Spacing.md },

  doctorCard: {
    alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  doctorAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.background },
  doctorAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  doctorName: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '800' },
  doctorSpecialty: { color: Colors.textSecondary, fontSize: FontSizes.md },
  doctorFee: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '700' },
  doctorBio: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20, marginTop: 4 },

  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginTop: Spacing.md },

  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { color: Colors.text, fontWeight: '600' },
  modeTextActive: { color: '#FFF' },

  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 100,
  },
  slotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotDay: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: '600' },
  slotTime: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  slotActiveText: { color: '#FFF' },

  textarea: {
    minHeight: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSizes.md,
    backgroundColor: Colors.surface,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  bookBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  btnDisabled: { opacity: 0.5 },
  ghostBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md },
  ghostBtnText: { color: Colors.text, fontWeight: '600' },
});
