import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../src/theme/colors';
import apiClient from '../../src/api/client';

type Step = 'phone' | 'processing' | 'success' | 'failed';

const DEFAULT_RETURN_URL = 'https://afriwonder.com/payment/orange-money/complete';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s/g, '');
  if (digits.startsWith('+223')) return digits;
  return `+223${digits.replace(/^0+/, '')}`;
}

export default function OrangeMoneyCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount?: string; orderId?: string; returnUrl?: string }>();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollKey, setPollKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amountStr = typeof params.amount === 'string' ? params.amount : Array.isArray(params.amount) ? params.amount[0] : '0';
  const amountNum = Math.max(0, parseFloat(String(amountStr).replace(',', '.')) || 0);
  const paramOrderId =
    typeof params.orderId === 'string' ? params.orderId : Array.isArray(params.orderId) ? params.orderId[0] : '';
  const successScale = useRef(new Animated.Value(0)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveOrderId = (paramOrderId || orderIdInput).trim();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (key: string) => {
      let attempts = 0;
      stopPolling();
      pollRef.current = setInterval(async () => {
        attempts += 1;
        if (attempts > 60) {
          stopPolling();
          setStep('failed');
          setError("Délai dépassé : le paiement n'a pas été confirmé dans l'application. Vérifiez Orange Money ou l'historique des transactions.");
          return;
        }
        try {
          const res = await apiClient.get('/payments/transactions', { params: { page: 1, limit: 50 } });
          const data = res.data?.data ?? res.data;
          const list = (data?.transactions ?? data?.items ?? []) as Array<{
            reference_id?: string | null;
            status?: string;
            payment_method?: string | null;
          }>;
          const tx = list.find(
            (t) =>
              t.reference_id === key &&
              (!t.payment_method || String(t.payment_method).toLowerCase().includes('orange')),
          );
          if (!tx) return;
          const st = String(tx.status || '').toLowerCase();
          if (st === 'completed' || st === 'success' || st === 'paid') {
            stopPolling();
            setStep('success');
            Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
          } else if (st === 'failed' || st === 'cancelled' || st === 'canceled') {
            stopPolling();
            setStep('failed');
            setError('Le paiement a été annulé ou a échoué.');
          }
        } catch {
          /* ignore transient errors while polling */
        }
      }, 3000);
    },
    [stopPolling],
  );

  const initiatePayment = async () => {
    if (phone.replace(/\s/g, '').length < 8) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide.');
      return;
    }
    if (!effectiveOrderId || effectiveOrderId.length < 2) {
      Alert.alert(
        'Référence commande',
        "Indiquez l'identifiant de commande (reçu après une commande marketplace ou depuis le panier). Sans commande valide côté serveur, le paiement ne peut pas être enregistré.",
      );
      return;
    }
    if (amountNum < 1) {
      Alert.alert('Erreur', 'Montant invalide.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const returnUrl =
        (typeof params.returnUrl === 'string' && params.returnUrl) ||
        (Array.isArray(params.returnUrl) && params.returnUrl[0]) ||
        DEFAULT_RETURN_URL;
      const res = await apiClient.post('/payments/orange-money/initiate', {
        orderId: effectiveOrderId,
        amount: amountNum,
        phone: normalizePhone(phone),
        currency: 'XOF',
        returnUrl,
      });
      const data = (res.data?.data ?? res.data) as {
        paymentUrl?: string;
        payment_url?: string;
        orderId?: string;
        reference?: string;
      };
      const payUrl = data?.paymentUrl || data?.payment_url;
      const key = data?.reference || data?.orderId || effectiveOrderId;
      setPollKey(key);

      if (payUrl && typeof payUrl === 'string') {
        const can = await Linking.canOpenURL(payUrl);
        if (can) await Linking.openURL(payUrl);
        else Alert.alert('Paiement', 'Impossible d’ouvrir le lien Orange Money sur cet appareil.');
      }

      setStep('processing');
      startPolling(key);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string; detail?: string; error?: { message?: string } } };
        message?: string;
      };
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.response?.data?.error?.message ||
        err.message ||
        "Erreur lors de l'initiation du paiement.";
      setError(String(msg));
      Alert.alert('Erreur', String(msg));
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    stopPolling();
    router.back();
  };

  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <View style={styles.content}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Montant à payer</Text>
              <Text style={styles.amountValue}>{amountNum.toLocaleString('fr-FR')} FCFA</Text>
            </View>

            {!paramOrderId ? (
              <>
                <Text style={styles.label}>Identifiant de commande</Text>
                <TextInput
                  style={styles.orderInput}
                  placeholder="Ex. id reçu après checkout"
                  placeholderTextColor={Colors.textMuted}
                  value={orderIdInput}
                  onChangeText={setOrderIdInput}
                  autoCapitalize="none"
                />
                <Text style={styles.hintSmall}>Obligatoire : le backend lie le paiement à une commande existante.</Text>
              </>
            ) : null}

            <Text style={styles.label}>Numéro Orange Money</Text>
            <View style={styles.phoneRow}>
              <View style={styles.dialCode}>
                <Text style={styles.dialCodeText}>+223</Text>
              </View>
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
            <Text style={styles.hint}>
              Vous serez redirigé vers Orange Money si un lien est fourni, ou validez depuis votre téléphone selon votre
              opérateur.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, (phone.replace(/\s/g, '').length < 8 || loading) && styles.primaryBtnDisabled]}
              onPress={() => void initiatePayment()}
              disabled={phone.replace(/\s/g, '').length < 8 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Payer {amountNum.toLocaleString('fr-FR')} FCFA</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF6600" />
            <Text style={styles.processingTitle}>Paiement en cours…</Text>
            <Text style={styles.processingDesc}>
              Confirmez le paiement sur votre téléphone. Nous vérifions automatiquement le statut (peut prendre quelques
              minutes).
            </Text>
            {pollKey ? (
              <Text style={styles.refHint} numberOfLines={2}>
                Réf. : {pollKey}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                stopPolling();
                setStep('phone');
              }}
            >
              <Text style={styles.cancelBtnText}>Fermer cette étape</Text>
            </TouchableOpacity>
          </View>
        );
      case 'success':
        return (
          <View style={styles.centerContent}>
            <Animated.View style={{ transform: [{ scale: successScale }] }}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={50} color="#FFF" />
              </View>
            </Animated.View>
            <Text style={styles.successTitle}>Paiement réussi !</Text>
            <Text style={styles.successAmount}>{amountNum.toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.successDesc}>Transaction enregistrée (Orange Money).</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
              <Text style={styles.primaryBtnText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        );
      case 'failed':
        return (
          <View style={styles.centerContent}>
            <View style={styles.failCircle}>
              <Ionicons name="close" size={50} color="#FFF" />
            </View>
            <Text style={styles.failTitle}>Paiement non confirmé</Text>
            <Text style={styles.failDesc}>{error || 'Une erreur est survenue.'}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setError(null);
                setStep('phone');
              }}
            >
              <Text style={styles.primaryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn} accessibilityLabel="Retour">
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
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  omLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  omLogoText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  amountCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,102,0,0.1)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.2)',
    marginBottom: 24,
  },
  amountLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  amountValue: { color: '#FF6600', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: 8 },
  orderInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: FontSizes.md,
    marginBottom: 6,
  },
  hintSmall: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 16, lineHeight: 16 },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dialCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  dialCodeText: { color: Colors.text, fontWeight: '600' },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: FontSizes.lg,
  },
  hint: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 24, lineHeight: 20 },
  primaryBtn: { backgroundColor: '#FF6600', borderRadius: BorderRadius.md, padding: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: FontSizes.lg },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  processingTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', marginTop: 20 },
  processingDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  refHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 12, textAlign: 'center' },
  cancelBtn: { marginTop: 20, paddingVertical: 10 },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', marginTop: 20 },
  successAmount: { color: '#10B981', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  successDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: 8, marginBottom: 24 },
  failCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failTitle: { color: '#EF4444', fontSize: FontSizes.xxl, fontWeight: 'bold', marginTop: 20 },
  failDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
});
