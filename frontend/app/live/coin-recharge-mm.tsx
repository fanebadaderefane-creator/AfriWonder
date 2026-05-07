import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import apiClient from '../../src/api/client';
import {
  computeLiveCoinMmTotals,
  LIVE_COIN_MM_OPERATORS,
  type LiveCoinMmProvider,
} from '../../src/live/liveCoinMmFees';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';

type Step = 1 | 2 | 3 | 4 | 'pay' | 'success' | 'fail';

type CoinPackageRow = {
  id: string;
  name: string;
  coins_amount: number;
  price_fcfa: number;
  bonus_coins?: number;
};

function normalizePhone(raw: string): string {
  const t = raw.replace(/\s+/g, '');
  if (t.startsWith('+')) return t;
  if (/^00/.test(t)) return `+${t.slice(2)}`;
  return `+223${t.replace(/^0+/, '')}`;
}

export default function LiveCoinRechargeMmScreen() {
  const insets = useSafeAreaInsets();
  const { packageId: packageIdParam, liveId: liveIdParam } = useLocalSearchParams<{
    packageId?: string;
    liveId?: string;
  }>();
  const packageId = String(packageIdParam || '').trim();
  const liveId = String(liveIdParam || '').trim();

  const [loadingPkg, setLoadingPkg] = useState(true);
  const [pkg, setPkg] = useState<CoinPackageRow | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [provider, setProvider] = useState<LiveCoinMmProvider>('orange_money');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [coinsAfter, setCoinsAfter] = useState<number | null>(null);

  const totals = useMemo(
    () => (pkg ? computeLiveCoinMmTotals(pkg.price_fcfa, provider) : null),
    [pkg, provider],
  );

  const loadPkg = useCallback(async () => {
    if (!packageId) {
      setPkg(null);
      setLoadingPkg(false);
      return;
    }
    setLoadingPkg(true);
    try {
      const res = await apiClient.get('/coins/packages');
      const d = res.data?.data ?? res.data;
      const list = (Array.isArray(d?.packages) ? d.packages : Array.isArray(d) ? d : []) as CoinPackageRow[];
      const found = list.find((p) => String(p.id) === packageId) ?? null;
      setPkg(found);
    } catch {
      setPkg(null);
    } finally {
      setLoadingPkg(false);
    }
  }, [packageId]);

  useEffect(() => {
    void loadPkg();
  }, [loadPkg]);

  const goFail = (msg: string) => {
    setBusy(false);
    Alert.alert('Paiement', msg);
    setStep('fail');
  };

  const runPurchase = async () => {
    if (!pkg) return;
    if (provider === 'mtn_money') {
      goFail('Utilisez Orange Money ou Wave pour recharger des coins.');
      return;
    }
    const demoFail =
      typeof process.env.EXPO_PUBLIC_COIN_RECHARGE_DEMO_FAIL === 'string' &&
      process.env.EXPO_PUBLIC_COIN_RECHARGE_DEMO_FAIL === '1';
    if (demoFail && Math.random() < 0.1) {
      goFail('Simulation : échec réseau — réessayez.');
      return;
    }

    setBusy(true);
    try {
      setStep('pay');
      const res = await apiClient.post('/coins/purchase', {
        packageId: pkg.id,
        payment_method: provider === 'wave' ? 'wave' : 'orange_money',
        phone: normalizePhone(phone),
        returnUrl: 'afriwonder://live',
      });
      const d = res.data?.data ?? res.data;
      const ref = String(d?.reference_id || '');
      const mock = Boolean(d?.mock);
      const paymentUrl = typeof d?.payment_url === 'string' ? d.payment_url : '';
      setReferenceId(ref);

      if (mock && ref) {
        const c = await apiClient.post('/coins/purchase/confirm', { referenceId: ref });
        const cd = c.data?.data ?? c.data;
        setCoinsAfter(typeof cd?.coins_balance === 'number' ? cd.coins_balance : null);
        setStep('success');
        return;
      }

      if (paymentUrl) {
        const ok = await Linking.canOpenURL(paymentUrl);
        if (ok) await Linking.openURL(paymentUrl);
        Alert.alert(
          'Paiement',
          'Finalisez sur votre téléphone ou navigateur. Revenez au live puis rouvrez les cadeaux pour voir le solde mis à jour.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }

      Alert.alert('Paiement', 'Paiement initié. Suivez les instructions de votre opérateur.');
      router.back();
    } catch (e: unknown) {
      goFail(getAlertMessageForCaughtError(e).slice(0, 220));
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = () => {
    if (step === 'fail') {
      setPin('');
      setStep(1);
      return;
    }
    if (step === 1) {
      const row = LIVE_COIN_MM_OPERATORS.find((o) => o.id === provider);
      if (row && !row.enabled) {
        Alert.alert('Paiement', 'Choisissez Orange Money ou Wave pour continuer.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const p = phone.replace(/\s+/g, '');
      if (p.length < 8) {
        Alert.alert('Numéro', 'Saisissez un numéro valide (indicatif inclus ou 8+ chiffres).');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      if (pin.replace(/\D/g, '').length < 4) {
        Alert.alert('PIN', 'Saisissez 4 chiffres (démo sécurité — non transmis au serveur).');
        return;
      }
      void runPurchase();
    }
  };

  if (!packageId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.err}>Pack manquant.</Text>
      </View>
    );
  }

  if (loadingPkg) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator color="#D4AF37" size="large" />
      </View>
    );
  }

  if (!pkg) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.err}>Pack introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mobile Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.stepHint}>
        Étape{' '}
        {step === 'pay' ? 4 : step === 'success' || step === 'fail' ? '—' : step} / 4 —{' '}
        {liveId ? 'Recharge depuis un live' : 'Recharge AfriCoins'}
      </Text>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.packCard}>
          <Text style={styles.packName}>{pkg.name}</Text>
          <Text style={styles.packCoins}>
            {(pkg.coins_amount + (pkg.bonus_coins || 0)).toLocaleString('fr-FR')} AfriCoins
          </Text>
          <Text style={styles.packPrice}>{pkg.price_fcfa.toLocaleString('fr-FR')} FCFA (pack)</Text>
        </View>

        {step === 1 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Opérateur</Text>
            {LIVE_COIN_MM_OPERATORS.map((op) => {
              const on = provider === op.id;
              return (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.opCard,
                    on && styles.opCardOn,
                    !op.enabled && { opacity: 0.55 },
                  ]}
                  onPress={() => {
                    if (!op.enabled) {
                      Alert.alert('Paiement', 'Choisissez Orange Money ou Wave pour continuer.');
                      return;
                    }
                    setProvider(op.id);
                  }}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={styles.opTitle}>{op.label}</Text>
                  <Text style={styles.opSub}>{op.feeHint} · {op.regionsHint}</Text>
                  {!op.enabled ? <Text style={styles.opSoon}>Indisponible</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Numéro Mobile Money</Text>
            <Text style={styles.muted}>Indicatif automatique +223 si absent (Mali).</Text>
            <TextInput
              style={styles.input}
              placeholder="+223 70 00 00 00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoComplete="tel"
            />
          </View>
        ) : null}

        {step === 3 && totals ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Récapitulatif</Text>
            <View style={styles.tableRow}>
              <Text style={styles.muted}>Montant pack</Text>
              <Text style={styles.tableVal}>{totals.packFcfa.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.muted}>Frais opérateur (estim.)</Text>
              <Text style={styles.tableVal}>{totals.operatorFeesFcfa.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={[styles.tableRow, styles.tableTotal]}>
              <Text style={styles.blockTitle}>Total à payer</Text>
              <Text style={styles.totalVal}>{totals.customerPaysFcfa.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Code PIN (4 chiffres)</Text>
            <Text style={styles.muted}>Sécurité locale — non envoyé au serveur AfriWonder.</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            />
          </View>
        ) : null}

        {step === 'pay' ? (
          <View style={styles.block}>
            <ActivityIndicator color="#D4AF37" size="large" />
            <Text style={styles.muted}>Traitement en cours…</Text>
          </View>
        ) : null}

        {step === 'success' ? (
          <View style={styles.block}>
            <Text style={styles.successEmoji}>🪙✨</Text>
            <Text style={styles.blockTitle}>Merci !</Text>
            <Text style={styles.muted}>
              Réf. {referenceId ? referenceId.slice(0, 24) : '—'}
              {coinsAfter != null ? ` · Solde : ${coinsAfter.toLocaleString('fr-FR')} coins` : ''}
            </Text>
          </View>
        ) : null}

        {step === 'fail' ? (
          <View style={styles.block}>
            <Text style={styles.err}>Une erreur est survenue.</Text>
            <Text style={styles.muted}>Vérifiez le réseau ou réessayez.</Text>
          </View>
        ) : null}
      </ScrollView>

      {step !== 'pay' && step !== 'success' ? (
        <TouchableOpacity
          style={[styles.cta, busy && { opacity: 0.6 }]}
          onPress={() => onPrimary()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {step === 4 ? 'Payer via Mobile Money' : step === 'fail' ? 'Réessayer' : 'Continuer'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {step === 'success' ? (
        <TouchableOpacity style={styles.cta} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.ctaText}>{liveId ? 'Retour au live' : 'Fermer'}</Text>
        </TouchableOpacity>
      ) : null}

      {Platform.OS !== 'web' ? (
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => {
            void (async () => {
              try {
                const res = await apiClient.post('/coins/purchase', {
                  packageId: pkg.id,
                  payment_method: 'orange_money',
                });
                const d = res.data?.data ?? res.data;
                if (d?.payment_url && typeof d.payment_url === 'string') {
                  const ok = await Linking.canOpenURL(d.payment_url);
                  if (ok) await Linking.openURL(d.payment_url);
                } else {
                  Alert.alert('Achat', 'Paiement initié sans URL — consultez votre opérateur.');
                }
              } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } } };
                Alert.alert('Erreur', getAlertMessageForCaughtError(err));
              }
            })();
          }}
        >
          <Text style={styles.secondaryText}>Raccourci : ouvrir Orange Money sans étapes</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2A1F18', paddingHorizontal: Spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  stepHint: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  scroll: { paddingBottom: 24 },
  packCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  packName: { color: Colors.text, fontWeight: '800', fontSize: FontSizes.md },
  packCoins: { color: '#D4AF37', fontWeight: '900', fontSize: 22, marginTop: 4 },
  packPrice: { color: Colors.textMuted, marginTop: 4, fontSize: FontSizes.sm },
  block: { marginBottom: Spacing.lg },
  blockTitle: { color: Colors.text, fontWeight: '800', marginBottom: 8, fontSize: FontSizes.md },
  muted: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 8 },
  opCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  opCardOn: { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.12)' },
  opTitle: { color: Colors.text, fontWeight: '800' },
  opSub: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  opSoon: { color: '#F97316', fontWeight: '700', marginTop: 6, fontSize: 12 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: BorderRadius.md,
    padding: 14,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tableVal: { color: Colors.text, fontWeight: '700' },
  tableTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#555' },
  totalVal: { color: '#D4AF37', fontWeight: '900', fontSize: FontSizes.lg },
  cta: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: FontSizes.md },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#93C5FD', fontSize: FontSizes.sm, textDecorationLine: 'underline' },
  err: { color: '#FCA5A5', textAlign: 'center', marginTop: 24, fontSize: FontSizes.md },
  successEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
});
