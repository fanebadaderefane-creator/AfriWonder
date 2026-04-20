import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';
import {
  SEED_PROJECTS,
  CROWDFUNDING_CATEGORIES,
  formatFullCFA,
  getProgressPercent,
} from '../../src/data/crowdfunding';
import { featureFlags } from '../../src/config/featureFlags';
import ComingSoonScreen from '../../src/components/common/ComingSoonScreen';

type Step = 'amount' | 'payment' | 'phone' | 'otp' | 'processing' | 'success';

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
  logo: string;
  dialCode: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'orange', name: 'Orange Money', color: '#FF6600', logo: 'OM', dialCode: '+223' },
  { id: 'wave', name: 'Wave', color: '#1DC2F3', logo: 'W', dialCode: '+223' },
  { id: 'mtn', name: 'MTN Money', color: '#FFCB05', logo: 'MTN', dialCode: '+223' },
];

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000, 50000, 100000];

export default function ContributeScreen() {
  if (!featureFlags.crowdfundingContribute) {
    return (
      <ComingSoonScreen
        title="Contribuer"
        description="Les contributions directes aux projets crowdfunding seront bientôt disponibles. Vous pouvez déjà parcourir les projets en cours."
        icon="heart-outline"
      />
    );
  }
  const insets = useSafeAreaInsets();
  const { projectId, rewardId, rewardAmount } = useLocalSearchParams<{
    projectId: string;
    rewardId?: string;
    rewardAmount?: string;
  }>();

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(rewardAmount || '');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const successScale = useRef(new Animated.Value(0)).current;

  const project = SEED_PROJECTS.find(p => p.id === projectId);
  const reward = project?.rewards.find(r => r.id === rewardId);
  const paymentMethod = PAYMENT_METHODS.find(p => p.id === selectedPayment);

  const parsedAmount = parseInt(amount) || 0;
  const commission = Math.round(parsedAmount * 0.00); // 0% pour le contributeur
  const totalAmount = parsedAmount + commission;

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d)) {
      setStep('processing');
      setTimeout(() => {
        setStep('success');
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }).start();
      }, 2500);
    }
  };

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={48} color="#444" />
          <Text style={styles.errorText}>Projet introuvable</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const categoryData = CROWDFUNDING_CATEGORIES.find(c => c.id === project.category);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'amount') router.back();
              else if (step === 'payment') setStep('amount');
              else if (step === 'phone') setStep('payment');
              else if (step === 'otp') setStep('phone');
            }}
            style={styles.headerBtn}
            disabled={step === 'processing' || step === 'success'}
          >
            {step !== 'processing' && step !== 'success' && (
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'success' ? 'Merci !' : 'Contribuer'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Project mini card */}
        {step !== 'processing' && step !== 'success' && (
          <View style={styles.projectMini}>
            <Image source={{ uri: project.images[0] }} style={styles.projectMiniImage} />
            <View style={styles.projectMiniInfo}>
              <Text style={styles.projectMiniTitle} numberOfLines={1}>{project.title}</Text>
              <View style={styles.projectMiniMeta}>
                <Text style={styles.projectMiniRaised}>
                  {getProgressPercent(project.raised, project.goal)}% finance
                </Text>
                <Text style={styles.projectMiniDays}>{project.daysLeft}j restants</Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP: Amount */}
          {step === 'amount' && (
            <View>
              {reward ? (
                <View style={styles.rewardSelected}>
                  <View style={styles.rewardSelectedHeader}>
                    <View style={[styles.rewardIcon, { backgroundColor: (categoryData?.color || Colors.primary) + '20' }]}>
                      <Ionicons name={reward.icon as any} size={22} color={categoryData?.color || Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardSelectedTitle}>{reward.title}</Text>
                      <Text style={styles.rewardSelectedDesc}>{reward.description}</Text>
                    </View>
                  </View>
                  <View style={styles.rewardSelectedAmount}>
                    <Text style={styles.rewardSelectedAmountText}>{formatFullCFA(reward.amount)}</Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.stepTitle}>Montant de votre contribution</Text>
                  <Text style={styles.stepSubtitle}>Choisissez ou saisissez le montant</Text>

                  {/* Custom amount */}
                  <View style={styles.amountInputContainer}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0"
                      placeholderTextColor="#444"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />
                    <Text style={styles.amountCurrency}>FCFA</Text>
                  </View>

                  {/* Preset amounts */}
                  <View style={styles.presetsGrid}>
                    {PRESET_AMOUNTS.map(preset => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetBtn,
                          parsedAmount === preset && styles.presetBtnActive,
                        ]}
                        onPress={() => setAmount(String(preset))}
                      >
                        <Text style={[
                          styles.presetText,
                          parsedAmount === preset && styles.presetTextActive,
                        ]}>{preset >= 1000 ? `${preset / 1000}K` : preset}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Anonymous option */}
              <TouchableOpacity
                style={styles.anonymousRow}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                  {isAnonymous && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={styles.anonymousText}>Contribuer de maniere anonyme</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, parsedAmount < 500 && styles.primaryBtnDisabled]}
                onPress={() => parsedAmount >= 500 && setStep('payment')}
                disabled={parsedAmount < 500}
              >
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.primaryBtnGradient}>
                  <Text style={styles.primaryBtnText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              {parsedAmount > 0 && parsedAmount < 500 && (
                <Text style={styles.minAmountText}>Minimum 500 FCFA</Text>
              )}
            </View>
          )}

          {/* STEP: Payment Method */}
          {step === 'payment' && (
            <View>
              <Text style={styles.stepTitle}>Moyen de paiement</Text>
              <Text style={styles.stepSubtitle}>Choisissez comment payer</Text>

              {PAYMENT_METHODS.map(method => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentCard,
                    selectedPayment === method.id && { borderColor: method.color },
                  ]}
                  onPress={() => setSelectedPayment(method.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.paymentLogo, { backgroundColor: method.color }]}>
                    <Text style={styles.paymentLogoText}>{method.logo}</Text>
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{method.name}</Text>
                    <Text style={styles.paymentDesc}>Paiement mobile securise</Text>
                  </View>
                  <View style={[
                    styles.paymentRadio,
                    selectedPayment === method.id && { borderColor: method.color },
                  ]}>
                    {selectedPayment === method.id && (
                      <View style={[styles.paymentRadioInner, { backgroundColor: method.color }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Order summary */}
              <View style={styles.orderSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Contribution</Text>
                  <Text style={styles.summaryValue}>{formatFullCFA(parsedAmount)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Frais</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>Gratuit</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>Total</Text>
                  <Text style={styles.summaryValueBold}>{formatFullCFA(totalAmount)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, !selectedPayment && styles.primaryBtnDisabled]}
                onPress={() => selectedPayment && setStep('phone')}
                disabled={!selectedPayment}
              >
                <LinearGradient
                  colors={paymentMethod ? [paymentMethod.color, paymentMethod.color + 'CC'] : ['#FF6B00', '#FF3D00']}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Payer avec {paymentMethod?.name || '...'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: Phone */}
          {step === 'phone' && paymentMethod && (
            <View>
              <View style={styles.paymentHeaderDisplay}>
                <View style={[styles.paymentLogoLg, { backgroundColor: paymentMethod.color }]}>
                  <Text style={styles.paymentLogoLgText}>{paymentMethod.logo}</Text>
                </View>
                <Text style={styles.paymentHeaderName}>{paymentMethod.name}</Text>
              </View>

              <Text style={styles.stepTitle}>Numero {paymentMethod.name}</Text>
              <Text style={styles.stepSubtitle}>Entrez le numero associe a votre compte</Text>

              <View style={styles.phoneRow}>
                <View style={[styles.dialCode, { borderColor: paymentMethod.color + '40' }]}>
                  <Text style={[styles.dialCodeText, { color: paymentMethod.color }]}>{paymentMethod.dialCode}</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { borderColor: paymentMethod.color + '40' }]}
                  placeholder="XX XX XX XX"
                  placeholderTextColor="#555"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={10}
                />
              </View>

              <View style={styles.amountPreview}>
                <Text style={styles.amountPreviewLabel}>Montant a payer</Text>
                <Text style={[styles.amountPreviewValue, { color: paymentMethod.color }]}>
                  {formatFullCFA(totalAmount)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, phone.length < 8 && styles.primaryBtnDisabled]}
                onPress={() => phone.length >= 8 && setStep('otp')}
                disabled={phone.length < 8}
              >
                <LinearGradient
                  colors={[paymentMethod.color, paymentMethod.color + 'CC']}
                  style={styles.primaryBtnGradient}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Confirmer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: OTP */}
          {step === 'otp' && paymentMethod && (
            <View style={styles.otpContainer}>
              <View style={styles.otpIconContainer}>
                <Ionicons name="chatbox" size={50} color={paymentMethod.color} />
              </View>
              <Text style={styles.stepTitle}>Code de verification</Text>
              <Text style={styles.stepSubtitle}>
                Un code SMS a ete envoye au {paymentMethod.dialCode} {phone}
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref; }}
                    style={[
                      styles.otpInput,
                      digit && { borderColor: paymentMethod.color, backgroundColor: paymentMethod.color + '08' },
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, i)}
                  />
                ))}
              </View>

              <TouchableOpacity>
                <Text style={[styles.resendText, { color: paymentMethod.color }]}>Renvoyer le code (30s)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: Processing */}
          {step === 'processing' && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={paymentMethod?.color || Colors.primary} />
              <Text style={styles.processingText}>Traitement en cours...</Text>
              <Text style={styles.processingSubtext}>Veuillez ne pas fermer l'application</Text>
            </View>
          )}

          {/* STEP: Success */}
          {step === 'success' && (
            <View style={styles.centerContent}>
              <Animated.View style={{ transform: [{ scale: successScale }] }}>
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.successCircle}>
                  <Ionicons name="checkmark" size={50} color="#FFF" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.successTitle}>Contribution reussie !</Text>
              <Text style={styles.successAmount}>{formatFullCFA(totalAmount)}</Text>
              <Text style={styles.successProject}>pour "{project.title}"</Text>
              <Text style={styles.successTxId}>ID: CF-{Date.now().toString(36).toUpperCase()}</Text>

              {reward && (
                <View style={styles.rewardConfirm}>
                  <Ionicons name="gift" size={20} color={Colors.primary} />
                  <Text style={styles.rewardConfirmText}>
                    Recompense "{reward.title}" reservee !
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/crowdfunding' as any)}
              >
                <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.primaryBtnGradient}>
                  <Text style={styles.primaryBtnText}>Retour aux projets</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryBtnText}>Voir le projet</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  // Project Mini
  projectMini: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  projectMiniImage: { width: 48, height: 48, borderRadius: 10 },
  projectMiniInfo: { flex: 1, marginLeft: 10 },
  projectMiniTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  projectMiniMeta: { flexDirection: 'row', gap: 10, marginTop: 3 },
  projectMiniRaised: { color: Colors.primary, fontSize: 11, fontWeight: '600' },
  projectMiniDays: { color: '#888', fontSize: 11 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Steps
  stepTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  stepSubtitle: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 24 },

  // Amount
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  amountInput: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 120,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
  },
  amountCurrency: { color: '#888', fontSize: 18, fontWeight: '700', marginLeft: 8, marginTop: 10 },

  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetBtn: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  presetBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  presetText: { color: '#888', fontSize: 15, fontWeight: '700' },
  presetTextActive: { color: Colors.primary },

  // Anonymous
  anonymousRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  anonymousText: { color: '#AAA', fontSize: 13 },

  // Reward selected
  rewardSelected: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  rewardSelectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  rewardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardSelectedTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  rewardSelectedDesc: { color: '#AAA', fontSize: 12, marginTop: 2 },
  rewardSelectedAmount: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rewardSelectedAmountText: { color: Colors.primary, fontSize: 20, fontWeight: '800' },

  // Payment Methods
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#222',
  },
  paymentLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLogoText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  paymentInfo: { flex: 1, marginLeft: 12 },
  paymentName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  paymentDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  paymentRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: { width: 12, height: 12, borderRadius: 6 },

  // Order Summary
  orderSummary: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { color: '#888', fontSize: 13 },
  summaryValue: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  summaryLabelBold: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  summaryValueBold: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#1A1A1A' },

  // Payment Header
  paymentHeaderDisplay: { alignItems: 'center', marginBottom: 20 },
  paymentLogoLg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentLogoLgText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  paymentHeaderName: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Phone
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  dialCode: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
  },
  dialCodeText: { fontSize: 16, fontWeight: '700' },
  phoneInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    letterSpacing: 2,
  },

  amountPreview: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  amountPreviewLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  amountPreviewValue: { fontSize: 28, fontWeight: '800' },

  // OTP
  otpContainer: { alignItems: 'center' },
  otpIconContainer: { marginBottom: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 24 },
  otpInput: {
    width: 56,
    height: 64,
    backgroundColor: '#111',
    borderRadius: 14,
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  resendText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Processing
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  processingText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 20 },
  processingSubtext: { color: '#888', fontSize: 14, marginTop: 8 },

  // Success
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successAmount: { color: '#4CAF50', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  successProject: { color: '#AAA', fontSize: 14, marginBottom: 8 },
  successTxId: { color: '#666', fontSize: 12, marginBottom: 24 },
  rewardConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  rewardConfirmText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Buttons
  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Error
  errorText: { color: '#888', fontSize: 16, marginTop: 12 },
  backLink: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backLinkText: { color: '#FFF', fontWeight: '700' },
  minAmountText: { color: '#FF4757', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
