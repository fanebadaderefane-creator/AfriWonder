/**
 * Checkout Mobile Money (MTN / Moov).
 *
 * Flux :
 * 1. L'utilisateur saisit son numéro de téléphone MSISDN.
 * 2. On appelle `/api/payments/mobile-money/initiate` qui déclenche un RTP
 *    (Request To Pay) chez le provider.
 * 3. L'utilisateur reçoit un popup sur son téléphone pour confirmer.
 * 4. On polle `/api/orders/:id` pour détecter le statut `paid`.
 *
 * Backend : `payment.service.ts` → `initiateMtnMoneyPayment` / `initiateMoovMoneyPayment`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';

type Provider = 'mtn_money' | 'moov_money';

const PROVIDER_LABEL: Record<Provider, string> = {
  mtn_money: 'MTN Mobile Money',
  moov_money: 'Moov Money',
};

const PROVIDER_COLOR: Record<Provider, string> = {
  mtn_money: '#FFCC00',
  moov_money: '#0066CC',
};

export default function MobileMoneyCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, amount, provider } = useLocalSearchParams<{
    orderId: string;
    amount: string;
    provider: Provider;
  }>();

  const providerId: Provider = provider === 'moov_money' ? 'moov_money' : 'mtn_money';
  const amountNum = Number(amount || 0);

  const [phone, setPhone] = useState('');
  const [initiating, setInitiating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollOrderStatus = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await apiClient.get(`/orders/${orderId}`);
        const status = String(res?.data?.data?.payment_status || res?.data?.data?.status || '').toLowerCase();
        if (status === 'paid' || status === 'success' || status === 'completed') {
          stopPolling();
          setPaid(true);
        } else if (status === 'failed' || status === 'cancelled') {
          stopPolling();
          setFailed(true);
        }
      } catch {
        // silencieux — on réessaye
      }
      if (attempts >= 45) { // ~3 min max à 4s
        stopPolling();
        setFailed(true);
      }
    }, 4000);
  }, [orderId, stopPolling]);

  const handleInitiate = async () => {
    const phoneClean = phone.replace(/\s+/g, '').replace(/^(\+223|00223)/, '');
    if (phoneClean.length < 8) {
      Alert.alert('Numéro invalide', 'Saisissez un numéro Mobile Money valide.');
      return;
    }
    if (!orderId || amountNum <= 0) {
      Alert.alert('Commande invalide', 'Cette commande ne peut pas être payée.');
      return;
    }
    setInitiating(true);
    try {
      const endpoint = providerId === 'mtn_money' ? '/payments/mtn' : '/payments/moov';
      await apiClient.post(endpoint, {
        order_id: orderId,
        phone: phoneClean.startsWith('+') ? phoneClean : `+223${phoneClean}`,
        amount: amountNum,
        return_url: 'afriwonder://orders',
      });
      pollOrderStatus();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || `Impossible d'initier le paiement ${PROVIDER_LABEL[providerId]}.`;
      Alert.alert('Paiement refusé', String(msg).slice(0, 200));
    } finally {
      setInitiating(false);
    }
  };

  const title = useMemo(() => PROVIDER_LABEL[providerId], [providerId]);
  const accent = useMemo(() => PROVIDER_COLOR[providerId], [providerId]);

  if (paid) {
    return (
      <View style={[styles.container, styles.centerScreen, { paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={96} color="#4CAF50" />
        <Text style={styles.bigTitle}>Paiement confirmé</Text>
        <Text style={styles.bigHint}>
          {amountNum.toLocaleString('fr-FR')} FCFA débités via {title}.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/orders' as never)}>
          <Text style={styles.primaryBtnText}>Voir ma commande</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.container, styles.centerScreen, { paddingTop: insets.top }]}>
        <Ionicons name="close-circle" size={96} color="#FF3B30" />
        <Text style={styles.bigTitle}>Paiement non reçu</Text>
        <Text style={styles.bigHint}>
          Nous n'avons pas reçu de confirmation {title}. Réessayez ou changez de moyen de paiement.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { setFailed(false); }}>
          <Text style={styles.primaryBtnText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/cart' as never)}>
          <Text style={styles.linkText}>Retour au panier</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (polling) {
    return (
      <View style={[styles.container, styles.centerScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.bigTitle}>En attente de confirmation…</Text>
        <Text style={styles.bigHint}>
          Vérifiez votre téléphone. Saisissez votre code PIN {title} pour valider {amountNum.toLocaleString('fr-FR')} FCFA.
        </Text>
        <Text style={styles.smallHint}>Cette opération peut prendre jusqu'à 2 minutes.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.providerBadge, { backgroundColor: accent + '22', borderColor: accent }]}>
          <Ionicons name="phone-portrait" size={32} color={accent} />
          <View>
            <Text style={styles.providerName}>{title}</Text>
            <Text style={styles.providerHint}>Vous recevrez un popup sur votre téléphone pour confirmer.</Text>
          </View>
        </View>

        <Text style={styles.amountLabel}>Montant à payer</Text>
        <Text style={styles.amountValue}>{amountNum.toLocaleString('fr-FR')} FCFA</Text>

        <Text style={styles.inputLabel}>Numéro {title}</Text>
        <View style={styles.phoneRow}>
          <View style={styles.dialCode}>
            <Text style={styles.dialText}>+223</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="76 00 00 00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        <Text style={styles.fineprint}>
          Frais Mobile Money : 1 % en moyenne, débités par l'opérateur. AfriWonder ne prélève aucune commission supplémentaire sur ce paiement.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: accent }, (initiating || !phone) && styles.btnDisabled]}
          onPress={handleInitiate}
          disabled={initiating || !phone}
        >
          {initiating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Payer {amountNum.toLocaleString('fr-FR')} FCFA</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerScreen: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },

  body: { padding: Spacing.xl, gap: Spacing.md },

  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  providerName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  providerHint: { color: Colors.textSecondary, fontSize: FontSizes.sm, flex: 1 },

  amountLabel: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.md },
  amountValue: { color: Colors.primary, fontSize: 36, fontWeight: '800', marginBottom: Spacing.lg },

  inputLabel: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },
  dialCode: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  dialText: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600' },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.lg,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  fineprint: { color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 18, marginTop: Spacing.sm },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  btnDisabled: { opacity: 0.5 },

  bigTitle: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: '800', textAlign: 'center' },
  bigHint: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', lineHeight: 22 },
  smallHint: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
  linkText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.sm },
});
