import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../../src/theme/colors';
import crowdfundingApi, { CrowdfundingProject } from '../../src/api/crowdfundingApi';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';

type Step = 'amount' | 'phone' | 'processing' | 'success';

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000, 50000, 100000];

function formatCFA(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function getProgressPercent(raised: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

export default function ContributeScreen() {
  return <ContributeContent />;
}

function ContributeContent() {
  const insets = useSafeAreaInsets();
  const { projectId, rewardId, rewardAmount } = useLocalSearchParams<{
    projectId: string;
    rewardId?: string;
    rewardAmount?: string;
  }>();

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<string>(rewardAmount ?? '');
  const [phone, setPhone] = useState<string>('');
  const [project, setProject] = useState<CrowdfundingProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProjectError('Identifiant projet manquant.');
      setLoadingProject(false);
      return;
    }
    setLoadingProject(true);
    setProjectError(null);
    try {
      const data = await crowdfundingApi.get(projectId);
      setProject(data);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Projet introuvable.';
      setProjectError(msg);
    } finally {
      setLoadingProject(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;
  const reward = project?.rewards?.find((r) => r.id === rewardId);
  const minAmount = reward?.amount ?? 500;
  const goal = project?.goal_amount ?? project?.goalAmount ?? 0;
  const raised = project?.raised_amount ?? project?.raisedAmount ?? 0;
  const percent = getProgressPercent(raised, goal);

  const handleConfirmContribution = async () => {
    if (!projectId) return;
    if (parsedAmount < minAmount) {
      Alert.alert('Montant insuffisant', `Le minimum est de ${formatCFA(minAmount)}.`);
      return;
    }
    if (!/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ''))) {
      Alert.alert('Téléphone invalide', 'Renseignez un numéro Orange Money valide (avec indicatif).');
      return;
    }
    setSubmitting(true);
    setStep('processing');
    try {
      const result = await crowdfundingApi.contribute(projectId, {
        amount: parsedAmount,
        phone: phone.trim(),
        rewardTier: rewardId ?? null,
      });
      const contributionId =
        result.id ?? (typeof result.contribution?.id === 'string' ? result.contribution.id : undefined);
      if (result.paymentUrl) {
        // Ouvre le checkout Orange Money dans une WebView in-app puis revient.
        const browser = await WebBrowser.openAuthSessionAsync(result.paymentUrl, 'afriwonder://crowdfunding/return');
        if (browser.type !== 'success') {
          // L'utilisateur a fermé sans valider — on revient à l'étape téléphone
          setStep('phone');
          Alert.alert(
            'Paiement non finalisé',
            'Vous avez fermé l\'écran de paiement avant de confirmer. Vous pouvez réessayer.'
          );
          return;
        }
        if (contributionId && browser.type === 'success') {
          try {
            await crowdfundingApi.confirmContribution(contributionId);
          } catch {
            /* Webhook ou double confirmation — ignorer */
          }
        }
      }
      setStep('success');
    } catch (err: unknown) {
      setStep('phone');
      Alert.alert('Erreur', getAlertMessageForCaughtError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (projectError || !project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contribuer</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.errorTitle}>Projet introuvable</Text>
          <Text style={styles.errorText}>{projectError ?? "Ce projet n'est plus disponible."}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProject}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const projectImage = project.images?.[0] ?? project.cover_image;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'amount') router.back();
              else if (step === 'phone') setStep('amount');
            }}
            style={styles.headerBtn}
            disabled={step === 'processing' || step === 'success'}
          >
            {step !== 'processing' && step !== 'success' && (
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{step === 'success' ? 'Merci !' : 'Contribuer'}</Text>
          <View style={{ width: 44 }} />
        </View>

        {step !== 'processing' && step !== 'success' && (
          <View style={styles.projectMini}>
            {projectImage ? (
              <Image source={{ uri: projectImage }} style={styles.projectMiniImage} />
            ) : (
              <View style={[styles.projectMiniImage, styles.projectMiniImageFallback]}>
                <Ionicons name="image-outline" size={20} color={Colors.textSecondary} />
              </View>
            )}
            <View style={styles.projectMiniInfo}>
              <Text style={styles.projectMiniTitle} numberOfLines={1}>{project.title}</Text>
              <View style={styles.projectMiniMeta}>
                <Text style={styles.projectMiniRaised}>{percent}% financé</Text>
                <Text style={styles.projectMiniDays}>
                  {formatCFA(raised)} sur {formatCFA(goal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'amount' && (
            <>
              {reward ? (
                <View style={styles.rewardCard}>
                  <Text style={styles.rewardTitle}>{reward.title ?? 'Récompense'}</Text>
                  {reward.description ? (
                    <Text style={styles.rewardDesc}>{reward.description}</Text>
                  ) : null}
                  <Text style={styles.rewardAmount}>Minimum : {formatCFA(reward.amount)}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Choisissez un montant</Text>
              <View style={styles.presets}>
                {PRESET_AMOUNTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetBtn, parsedAmount === p && styles.presetBtnActive]}
                    onPress={() => setAmount(String(p))}
                  >
                    <Text style={[styles.presetText, parsedAmount === p && styles.presetTextActive]}>
                      {formatCFA(p)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Montant personnalisé (FCFA)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Ex. 7500"
                placeholderTextColor="#666"
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, parsedAmount < minAmount && styles.primaryBtnDisabled]}
                onPress={() => setStep('phone')}
                disabled={parsedAmount < minAmount}
              >
                <Text style={styles.primaryBtnText}>Continuer · {formatCFA(parsedAmount)}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'phone' && (
            <>
              <View style={styles.paymentNotice}>
                <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.paymentNoticeText}>
                  Le paiement sera traité par Orange Money. Une fenêtre s'ouvrira pour valider.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Numéro Orange Money</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+221 77 123 45 67"
                placeholderTextColor="#666"
                style={styles.input}
                autoFocus
              />

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Contribution</Text>
                  <Text style={styles.summaryValue}>{formatCFA(parsedAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Frais</Text>
                  <Text style={styles.summaryValue}>0 FCFA</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatCFA(parsedAmount)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                onPress={handleConfirmContribution}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Confirmer la contribution</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.processingText}>Préparation du paiement...</Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.successBox}>
              <LinearGradient
                colors={[Colors.primary, '#FF6B00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIcon}
              >
                <Ionicons name="checkmark" size={56} color="#FFF" />
              </LinearGradient>
              <Text style={styles.successTitle}>Merci pour votre contribution !</Text>
              <Text style={styles.successSubtitle}>
                Le créateur de "{project.title}" recevra votre soutien dès la confirmation du paiement.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/crowdfunding' as any)}
              >
                <Text style={styles.primaryBtnText}>Retour aux projets</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  errorText: { color: '#999', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#FFF', fontWeight: '600' },
  projectMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  projectMiniImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#222' },
  projectMiniImageFallback: { alignItems: 'center', justifyContent: 'center' },
  projectMiniInfo: { flex: 1 },
  projectMiniTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  projectMiniMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  projectMiniRaised: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  projectMiniDays: { color: '#999', fontSize: 12 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  rewardCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  rewardTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  rewardDesc: { color: '#999', fontSize: 13, marginTop: 4 },
  rewardAmount: { color: Colors.primary, fontSize: 14, fontWeight: '600', marginTop: 8 },
  sectionLabel: { color: '#999', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  presetText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  presetTextActive: { color: Colors.primary, fontWeight: '700' },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  paymentNotice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  paymentNoticeText: { color: '#CCC', fontSize: 13, flex: 1, lineHeight: 18 },
  summaryBox: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginVertical: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { color: '#999', fontSize: 14 },
  summaryValue: { color: '#FFF', fontSize: 14 },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10, marginTop: 6 },
  summaryTotalLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  summaryTotalValue: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  processingText: { color: '#999', fontSize: 14, marginTop: 8 },
  successBox: { alignItems: 'center', paddingVertical: 32 },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  successSubtitle: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 12, marginHorizontal: 16 },
});
