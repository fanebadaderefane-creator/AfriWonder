/**
 * Devenir Star — module Paid Video Calls.
 * Route : `/stars/become`.
 *
 * Wizard 3 étapes :
 *   1. Choix de plan (ID Standard gratuit / Gold ID premium "Le plus populaire")
 *   2. Catégorie (Musicians, Comedians, Coachs, Influencer, Media, Mentors, Other)
 *   3. Titre + bio + langues
 *
 * À la validation, création du `StarProfile` (avec display_id auto-généré
 * côté backend), puis redirection vers `/stars/dashboard` pour configurer
 * prix et disponibilités avant d'activer le mode star.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import starsApi, { type StarTier, type StarCategory, STAR_CATEGORIES } from '../../src/api/starsApi';

const SUGGESTED_LANGUAGES = ['fr', 'en', 'bm', 'ar', 'wo'];

// Aperçu de l'ID Star pour la sélection de plan (cosmétique : indicatif).
function pseudoIdFor(tier: StarTier): string {
  // Standard → 5 chiffres standards, Premium → réservé "vanity" (ex: 7888x).
  if (tier === 'premium') return `#7${Math.floor(1000 + Math.random() * 9000)}`;
  return `#${Math.floor(10000 + Math.random() * 90000)}`;
}

const CATEGORY_HELPER: Record<StarCategory, string> = {
  Musicians: 'Artistes, chanteurs, producteurs',
  Comedians: 'Humoristes, créateurs de comedy',
  Coachs: 'Sport, bien-être, vie pro',
  Influencer: 'Lifestyle, mode, beauté, voyage',
  Media: 'Présentateurs, podcasteurs, voix',
  Mentors: 'Tech, business, carrière',
  Other: 'Autre talent ou expertise',
};

export default function StarBecomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Étape 1 : plan
  const [tier, setTier] = useState<StarTier>('standard');
  const previewIdStandard = useMemo(() => pseudoIdFor('standard'), []);
  const previewIdPremium = useMemo(() => pseudoIdFor('premium'), []);

  // Étape 2 : catégorie
  const [category, setCategory] = useState<StarCategory>('Musicians');

  // Étape 3 : profil
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>(['fr']);
  const [sending, setSending] = useState(false);

  const toggleLang = useCallback((lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  }, []);

  const next = useCallback(() => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  }, [step]);

  const submit = useCallback(async () => {
    if (!headline.trim() || headline.trim().length < 5) {
      Alert.alert('Titre', 'Saisis un titre court (au moins 5 caractères) pour ton profil star.');
      return;
    }
    setSending(true);
    try {
      const profile = await starsApi.becomeStar({
        headline: headline.trim(),
        bio: bio.trim() || undefined,
        languages,
        category,
        country: 'ML',
        tier,
      });
      Alert.alert(
        'Profil star créé',
        `Bienvenue ! Ton ID Star est #${profile.display_id ?? '—'}. Configure tes tarifs et tes disponibilités pour recevoir des appels.`,
        [{ text: 'Continuer', onPress: () => router.replace('/stars/dashboard' as never) }],
      );
    } catch (e) {
      Alert.alert('Mode star', (e as Error)?.message || 'Impossible d’activer le mode star.');
    } finally {
      setSending(false);
    }
  }, [headline, bio, languages, category, tier]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Devenir star</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Obtiens ton propre ID Star, monétise ton talent et développe ta base de fans.
      </Text>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, step >= 1 && styles.progressBarOn]} />
        <View style={[styles.progressBar, step >= 2 && styles.progressBarOn]} />
        <View style={[styles.progressBar, step >= 3 && styles.progressBarOn]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxxl * 2, gap: Spacing.md }}>
        {step === 1 ? (
          <>
            {/* PLAN STANDARD */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.planCard, tier === 'standard' && styles.planCardOn]}
              onPress={() => setTier('standard')}
              accessibilityRole="button"
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>ID Standard</Text>
                <Text style={styles.planId}>{previewIdStandard}</Text>
                <View style={[styles.radio, tier === 'standard' && styles.radioOn]}>
                  {tier === 'standard' ? <View style={styles.radioDot} /> : null}
                </View>
              </View>
              <Text style={styles.planDesc}>
                Commence ton aventure — gagne en visibilité et commence à monétiser ton talent.
              </Text>
            </TouchableOpacity>

            {/* PLAN PREMIUM */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.planCard, tier === 'premium' && styles.planCardOn]}
              onPress={() => setTier('premium')}
              accessibilityRole="button"
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>Gold ID</Text>
                <Text style={styles.planId}>{previewIdPremium}</Text>
                <View style={[styles.radio, tier === 'premium' && styles.radioOn]}>
                  {tier === 'premium' ? <View style={styles.radioDot} /> : null}
                </View>
              </View>
              <Text style={styles.planDesc}>
                Brille encore plus — profite d’une promotion premium, d’une mise en avant parmi les stars vedettes
                et touche davantage de fans.
              </Text>
              <View style={styles.populaireTag}>
                <Text style={styles.populaireText}>Le plus populaire</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.stepHeading}>Choisis ta catégorie</Text>
            <Text style={styles.stepHelp}>
              C’est ce que les fans verront en premier sur ton profil.
            </Text>
            {STAR_CATEGORIES.map((c) => {
              const isOn = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.85}
                  style={[styles.catRow, isOn && styles.catRowOn]}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catName, isOn && { color: colors.primary }]}>{c}</Text>
                    <Text style={styles.catHelp}>{CATEGORY_HELPER[c]}</Text>
                  </View>
                  <View style={[styles.radio, isOn && styles.radioOn]}>
                    {isOn ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.stepHeading}>Présente-toi à tes fans</Text>

            <Text style={styles.label}>Titre court (ex : « Coach sportif certifié »)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ton accroche en 1 phrase"
              placeholderTextColor={colors.textSecondary}
              value={headline}
              onChangeText={setHeadline}
              maxLength={120}
            />

            <Text style={styles.label}>À propos de toi</Text>
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              multiline
              placeholder="Parle de ton expérience, ce que tes fans peuvent attendre…"
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              maxLength={2000}
            />

            <Text style={styles.label}>Langues</Text>
            <View style={styles.chips}>
              {SUGGESTED_LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, languages.includes(l) && styles.chipOn]}
                  onPress={() => toggleLang(l)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, languages.includes(l) && { color: '#FFF' }]}>{l.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* CTA Sticky */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.submitBtn, sending && { opacity: 0.7 }]}
          disabled={sending}
          onPress={step === 3 ? submit : next}
          accessibilityRole="button"
        >
          {sending
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitText}>{step === 3 ? 'Activer le mode star' : 'Continuer'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(c: { background: string; text: string; textSecondary: string; primary: string; card: string; border: string }) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    iconBtn: { width: 40, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: FontSizes.xl, fontWeight: '800' },
    subtitle: { color: c.textSecondary, fontSize: FontSizes.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, textAlign: 'center', lineHeight: 20 },

    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    progressBar: { flex: 1, height: 4, backgroundColor: c.border, borderRadius: 2 },
    progressBarOn: { backgroundColor: c.primary },

    // PLAN
    planCard: {
      backgroundColor: c.card, padding: Spacing.lg, borderRadius: BorderRadius.lg,
      borderWidth: 1, borderColor: c.border, gap: Spacing.sm,
    },
    planCardOn: { borderColor: c.primary, borderWidth: 2 },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    planTitle: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800' },
    planId: { color: c.textSecondary, fontSize: FontSizes.sm },
    planDesc: { color: c.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
    populaireTag: { alignSelf: 'flex-start', backgroundColor: '#FFE8DD', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.pill, marginTop: 4 },
    populaireText: { color: c.primary, fontSize: FontSizes.xs, fontWeight: '700' },

    // CATEGORY
    stepHeading: { color: c.text, fontSize: FontSizes.lg, fontWeight: '800', marginBottom: 4 },
    stepHelp: { color: c.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
    catRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      backgroundColor: c.card, padding: Spacing.md, borderRadius: BorderRadius.md,
      borderWidth: 1, borderColor: c.border,
    },
    catRowOn: { borderColor: c.primary, borderWidth: 2 },
    catName: { color: c.text, fontSize: FontSizes.md, fontWeight: '700' },
    catHelp: { color: c.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },

    // RADIO
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
    radioOn: { borderColor: c.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },

    // STEP 3
    label: { color: c.text, fontSize: FontSizes.md, fontWeight: '700', marginTop: Spacing.sm },
    input: {
      color: c.text, fontSize: FontSizes.md, backgroundColor: c.card,
      borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    chipOn: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.text, fontWeight: '600', fontSize: FontSizes.sm },

    footer: {
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background,
    },
    submitBtn: { backgroundColor: c.primary, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill },
    submitText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.md },
  });
}
