import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '../../src/theme/colors';

type Step = 'phone' | 'confirm' | 'processing' | 'success';

export default function WaveScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount?: string }>();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const amount = params.amount || '32000';
  const successScale = useRef(new Animated.Value(0)).current;

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'phone' ? router.back() : setStep('phone')} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.waveLogo}>
            <Ionicons name="water" size={20} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Wave</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {step === 'phone' && (
        <View style={styles.content}>
          <View style={styles.waveHero}>
            <LinearGradient colors={['#1DC3E2', '#0891B2']} style={styles.waveHeroGradient}>
              <Text style={styles.heroAmount}>{parseInt(amount).toLocaleString()}</Text>
              <Text style={styles.heroCurrency}>FCFA</Text>
            </LinearGradient>
          </View>

          <Text style={styles.stepTitle}>Payer avec Wave</Text>
          <Text style={styles.stepSubtitle}>Entrez votre numero Wave</Text>

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

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={18} color="#1DC3E2" />
            <Text style={styles.securityText}>Paiement securise par Wave</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !phone && styles.primaryBtnDisabled]}
            onPress={() => phone.length >= 8 ? setStep('confirm') : null}
            disabled={phone.length < 8}
          >
            <LinearGradient colors={['#1DC3E2', '#0891B2']} style={styles.primaryBtnGradient}>
              <Text style={styles.primaryBtnText}>Continuer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 'confirm' && (
        <View style={styles.content}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <Ionicons name="water" size={30} color="#1DC3E2" />
              <Text style={styles.confirmTitle}>Confirmer</Text>
            </View>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>De</Text>
              <Text style={styles.confirmValue}>+223 {phone}</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>A</Text>
              <Text style={styles.confirmValue}>AfriWonder Market</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Montant</Text>
              <Text style={styles.confirmAmountVal}>{parseInt(amount).toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.confirmDivider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Frais Wave</Text>
              <Text style={[styles.confirmValue, { color: '#4CAF50' }]}>Gratuit</Text>
            </View>
          </View>

          <View style={styles.totalBanner}>
            <Text style={styles.totalLabel}>Total a debiter</Text>
            <Text style={styles.totalAmount}>{parseInt(amount).toLocaleString()} FCFA</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handlePay}>
            <LinearGradient colors={['#1DC3E2', '#0891B2']} style={styles.primaryBtnGradient}>
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Confirmer le paiement</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 'processing' && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1DC3E2" />
          <Text style={styles.processingText}>Traitement en cours...</Text>
          <Text style={styles.processingSubtext}>Connexion a Wave...</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centerContent}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <LinearGradient colors={['#1DC3E2', '#0891B2']} style={styles.successGradient}>
              <Ionicons name="checkmark" size={50} color="#FFF" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.successTitle}>Paiement reussi !</Text>
          <Text style={styles.successAmount}>{parseInt(amount).toLocaleString()} FCFA</Text>
          <Text style={styles.successSubtext}>Ref: WV-{Date.now().toString(36).toUpperCase()}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <LinearGradient colors={['#1DC3E2', '#0891B2']} style={styles.primaryBtnGradient}>
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
  waveLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1DC3E2', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  waveHero: { alignSelf: 'center', marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  waveHeroGradient: { paddingHorizontal: 40, paddingVertical: 24, alignItems: 'center' },
  heroAmount: { color: '#FFF', fontSize: 36, fontWeight: '800' },
  heroCurrency: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },

  stepTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },

  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dialCode: { backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  dialCodeText: { color: '#1DC3E2', fontSize: 16, fontWeight: '700' },
  phoneInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, color: '#FFF', fontSize: 18, fontWeight: '600', borderWidth: 1, borderColor: '#333', letterSpacing: 2 },

  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 },
  securityText: { color: '#888', fontSize: 13 },

  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  confirmCard: { backgroundColor: '#111', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  confirmHeader: { alignItems: 'center', marginBottom: 20, gap: 8 },
  confirmTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  confirmLabel: { color: '#888', fontSize: 14 },
  confirmValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  confirmAmountVal: { color: '#1DC3E2', fontSize: 16, fontWeight: '800' },
  confirmDivider: { height: 1, backgroundColor: '#222' },

  totalBanner: { backgroundColor: '#0891B2' + '18', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1DC3E2' + '30' },
  totalLabel: { color: '#888', fontSize: 14 },
  totalAmount: { color: '#1DC3E2', fontSize: 20, fontWeight: '800' },

  processingText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 20 },
  processingSubtext: { color: '#888', fontSize: 14, marginTop: 8 },

  successCircle: { marginBottom: 24 },
  successGradient: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successAmount: { color: '#1DC3E2', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  successSubtext: { color: '#888', fontSize: 13, marginBottom: 40 },
});
