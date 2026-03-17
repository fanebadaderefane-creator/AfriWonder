import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function RechargeWalletScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  const transactionId = route.params?.transactionId ?? null;
  const returnUrl = route.params?.returnUrl ?? null;
  const amountParam = route.params?.amount ?? null;

  const loadWallet = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.live.getWallet();
      setWallet(data);
    } catch (e) {
      setError(e?.message || 'Impossible de charger le portefeuille');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (amountParam && !amount) {
      setAmount(String(amountParam));
    }
  }, [amountParam, amount]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const confirm = async () => {
      if (!transactionId || !user) return;
      try {
        const res = await api.live.confirmWalletRecharge(transactionId);
        await loadWallet();
        if (returnUrl) {
          // côté mobile on peut router vers un écran spécifique si besoin
        }
      } catch (e) {
        setError(
          e?.apiMessage ||
            (typeof e?.response?.data?.error === 'string'
              ? e.response.data.error
              : e?.response?.data?.error?.message) ||
            e?.message ||
            'Erreur lors de la confirmation',
        );
      }
    };
    confirm();
  }, [transactionId, user, returnUrl, loadWallet]);

  const handleRecharge = useCallback(async () => {
    if (submitting) return;
    const num = Number(amount);
    if (num < 100) {
      setError('Minimum 100 FCFA');
      return;
    }
    if (num > 1000000) {
      setError('Maximum 1 000 000 FCFA');
      return;
    }
    const phoneDigits = (phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      setError('Numéro Orange Money requis (ex: 77 XX XX XX XX)');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.live.rechargeWallet({
        amount: num,
        phone: phoneDigits,
      });
      if (res?.payment_url) {
        // Sur mobile, ouvrir dans le navigateur externe par défaut
        // (le wrapper appelera Linking.openURL côté app)
      }
    } catch (e) {
      const msg =
        e?.apiMessage ||
        (typeof e?.response?.data?.error === 'string'
          ? e.response?.data?.error
          : e?.response?.data?.error?.message) ||
        e?.message ||
        'Erreur lors de la recharge';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [amount, phone, submitting]);

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingRoot} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharger le portefeuille</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="wallet" size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Solde actuel</Text>
              </View>
              <Text style={styles.balanceValue}>
                {Number(wallet?.balance ?? 0).toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={styles.balanceHint}>
                Utilisé pour envoyer des cadeaux pendant les lives
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Montant de recharge</Text>
            <View style={styles.presetRow}>
              {PRESET_AMOUNTS.map((a) => {
                const active = Number(amount) === a;
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.presetBtn, active && styles.presetBtnActive]}
                    onPress={() => setAmount(String(a))}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        active && styles.presetTextActive,
                      ]}
                    >
                      {a.toLocaleString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Autre montant (FCFA)"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="Numéro Orange Money (ex: 77 XX XX XX XX) *"
              value={phone}
              onChangeText={setPhone}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting ||
                  !amount ||
                  Number(amount) < 100 ||
                  (phone || '').replace(/\D/g, '').length < 8) && {
                  opacity: 0.6,
                },
              ]}
              disabled={
                submitting ||
                !amount ||
                Number(amount) < 100 ||
                (phone || '').replace(/\D/g, '').length < 8
              }
              onPress={handleRecharge}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Payer avec Orange Money</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  balanceValue: { fontSize: 24, fontWeight: '700', color: '#2563EB', marginTop: 4 },
  balanceHint: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    marginTop: 8,
  },
  presetBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  presetText: { fontSize: 13, color: '#111827' },
  presetTextActive: { color: '#FFFFFF' },
  input: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  errorText: { marginTop: 8, fontSize: 13, color: '#DC2626' },
});

