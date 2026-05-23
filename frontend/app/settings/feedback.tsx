import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import type { AppPalette } from '../../src/theme/themePalettes';
import { useToast } from '../../src/components/common/ToastProvider';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import {
  submitPlatformFeedback,
  type PlatformFeedbackType,
} from '../../src/services/platformFeedbackApi';

const FEEDBACK_TYPES: { id: PlatformFeedbackType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'bug', label: 'Bug / problème technique', icon: 'bug-outline' },
  { id: 'suggestion', label: 'Suggestion', icon: 'bulb-outline' },
  { id: 'comment', label: 'Commentaire', icon: 'chatbubble-outline' },
];

export default function SettingsFeedbackScreen() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [type, setType] = useState<PlatformFeedbackType>('comment');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [joinWhatsapp, setJoinWhatsapp] = useState(false);
  const [joinMailing, setJoinMailing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (trimmed.length < 3) {
      showToast({ message: 'Veuillez décrire votre retour (au moins 3 caractères).', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitPlatformFeedback({
        type,
        content: trimmed,
        email: email.trim() || undefined,
        join_whatsapp: joinWhatsapp,
        join_mailing: joinMailing,
      });
      if (res.success) {
        showToast({
          message: res.data?.message || 'Merci pour votre retour !',
          type: 'success',
        });
        router.back();
      } else {
        showToast({
          message: res.message || 'Envoi impossible. Réessayez plus tard.',
          type: 'error',
        });
      }
    } catch {
      showToast({ message: 'Réseau indisponible ou serveur occupé. Réessayez plus tard.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [content, email, joinMailing, joinWhatsapp, showToast, type]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signaler un problème</Text>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Votre message est lu par l’équipe AfriWonder. Ne partagez pas de mot de passe ni de code OTP.
        </Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {FEEDBACK_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeChip, type === t.id && styles.typeChipActive]}
              onPress={() => setType(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: type === t.id }}
            >
              <Ionicons
                name={t.icon}
                size={18}
                color={type === t.id ? colors.text : colors.textSecondary}
              />
              <Text style={[styles.typeChipText, type === t.id && styles.typeChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Décrivez le problème ou l’idée</Text>
        <TextInput
          style={styles.inputMultiline}
          placeholder="Ex. L’écran X ne charge pas après…"
          placeholderTextColor={colors.textSecondary}
          multiline
          value={content}
          onChangeText={setContent}
          maxLength={5000}
          textAlignVertical="top"
        />

        <Text style={styles.label}>E-mail (optionnel — pour vous recontacter)</Text>
        <TextInput
          style={styles.input}
          placeholder="vous@exemple.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Être informé des nouveautés par WhatsApp</Text>
          <Switch
            value={joinWhatsapp}
            onValueChange={setJoinWhatsapp}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Newsletter (e-mail)</Text>
          <Switch
            value={joinMailing}
            onValueChange={setJoinMailing}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={() => void onSubmit()}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le signalement"
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitText}>Envoyer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: Spacing.xs, minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: colors.text },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    intro: { fontSize: FontSizes.sm, color: colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
    label: { fontSize: FontSizes.sm, fontWeight: '600', color: colors.text, marginBottom: Spacing.sm },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
    typeChipText: { fontSize: FontSizes.xs, color: colors.textSecondary },
    typeChipTextActive: { color: colors.text, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      color: colors.text,
      marginBottom: Spacing.lg,
    },
    inputMultiline: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      color: colors.text,
      minHeight: 120,
      marginBottom: Spacing.lg,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
      gap: Spacing.md,
    },
    switchLabel: { flex: 1, fontSize: FontSizes.sm, color: colors.text },
    submit: {
      marginTop: Spacing.lg,
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      minHeight: MIN_TOUCH_TARGET + 4,
      justifyContent: 'center',
    },
    submitDisabled: { opacity: 0.6 },
    submitText: { color: colors.background, fontSize: FontSizes.md, fontWeight: '700' },
  });
}
