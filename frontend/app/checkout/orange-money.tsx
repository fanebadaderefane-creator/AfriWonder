import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/theme/colors';

type Step = 'phone' | 'confirm' | 'otp' | 'processing' | 'success';

export default function OrangeMoneyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount?: string }>();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const amount = params.amount || '32000';
  const successScale = useRef(new Animated.Value(0)).current;
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const handleConfirm = () => setStep('otp');

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d)) {
      setStep('processing');
      setTimeout(() => {
        setStep('success');
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      }, 2500);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'phone' ? router.back() : setStep('phone')} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.omLogo}>
            <Text style={styles.omLogoText}>OM</Text>
          </View>
          <Text style={styles.headerTitle}>Orange Money</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {step === 'phone' && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>Numero Orange Money</Text>
          <Text style={styles.stepSubtitle}>Entrez le numero associe a votre compte</Text>

          <View style={styles.phoneRow}>
            <View style={styles.dialCode}><Text style={styles.dialCodeText}>+223</Text></View>
            <TextInput
              style={styles.phoneInput}
              placeholder="XX XX XX XX"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>

          <View style={styles.amountPreview}>
            <Text style={styles.amountLabel}>Montant a payer</Text>
            <Text style={styles.amountValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !phone && styles.primaryBtnDisabled]}
            onPress={() => phone.length >= 8 ? setStep('confirm') : null}
            disabled={phone.length < 8}
          >
            <LinearGradient colors={['#FF8C00', '#FF6600']} style={styles.primaryBtnGradient}>
              <Text style={styles.primaryBtnText}>Continuer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 'confirm' && (
        <View style={styles.content}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="shield-checkmark" size={40} color="#FF6600" />
            </View>
            <Text style={styles.confirmTitle}>Confirmer le paiement</Text>
            
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmLabel}>Numero</Text>
              <Text style={styles.confirmValue}>+223 {phone}</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmLabel}>Montant</Text>
              <Text style={styles.confirmAmountValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmLabel}>Frais</Text>
              <Text style={styles.confirmValue}>0 FCFA</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmLabel}>Total</Text>
              <Text style={styles.confirmAmountValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm}>
            <LinearGradient colors={['#FF8C00', '#FF6600']} style={styles.primaryBtnGradient}>
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Confirmer et payer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 'otp' && (
        <View style={styles.content}>
          <View style={styles.otpIcon}>
            <Ionicons name="chatbox" size={50} color="#FF6600" />
          </View>
          <Text style={styles.stepTitle}>Code de verification</Text>
          <Text style={styles.stepSubtitle}>Un code SMS a ete envoye au +223 {phone}</Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { otpRefs.current[i] = ref; }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, i)}
              />
            ))}
          </View>

          <TouchableOpacity><Text style={styles.resendText}>Renvoyer le code (30s)</Text></TouchableOpacity>
        </View>
      )}

      {step === 'processing' && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6600" />
          <Text style={styles.processingText}>Traitement en cours...</Text>
          <Text style={styles.processingSubtext}>Veuillez ne pas fermer l'application</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centerContent}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.successGradient}>
              <Ionicons name="checkmark" size={50} color="#FFF" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.successTitle}>Paiement reussi !</Text>
          <Text style={styles.successAmount}>{parseInt(amount).toLocaleString()} FCFA</Text>
          <Text style={styles.successSubtext}>Transaction ID: OM-{Date.now().toString(36).toUpperCase()}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <LinearGradient colors={['#FF8C00', '#FF6600']} style={styles.primaryBtnGradient}>
              <Text style={styles.primaryBtnText}>Retour a l'accueil</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  omLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FF6600', alignItems: 'center', justifyContent: 'center' },
  omLogoText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 30 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  stepTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30 },

  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  dialCode: { backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  dialCodeText: { color: '#FF6600', fontSize: 16, fontWeight: '700' },
  phoneInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, color: '#FFF', fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#333', letterSpacing: 2 },

  amountPreview: { backgroundColor: '#111', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#222' },
  amountLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  amountValue: { color: '#FF6600', fontSize: 28, fontWeight: '800' },

  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  confirmCard: { backgroundColor: '#111', borderRadius: 20, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  confirmIcon: { alignSelf: 'center', marginBottom: 16 },
  confirmTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  confirmDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  confirmLabel: { color: '#888', fontSize: 14 },
  confirmValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  confirmAmountValue: { color: '#FF6600', fontSize: 16, fontWeight: '800' },
  confirmDivider: { height: 1, backgroundColor: '#222' },

  otpIcon: { alignSelf: 'center', marginBottom: 20 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 30 },
  otpInput: { width: 56, height: 64, backgroundColor: '#1A1A1A', borderRadius: 14, color: '#FFF', fontSize: 24, fontWeight: '800', borderWidth: 2, borderColor: '#333' },
  otpInputFilled: { borderColor: '#FF6600', backgroundColor: '#1A1000' },
  resendText: { color: '#FF6600', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  processingText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 20 },
  processingSubtext: { color: '#888', fontSize: 14, marginTop: 8 },

  successCircle: { marginBottom: 24 },
  successGradient: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successAmount: { color: '#4CAF50', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  successSubtext: { color: '#888', fontSize: 13, marginBottom: 40 },
});
