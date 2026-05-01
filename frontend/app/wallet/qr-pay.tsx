/**
 * QR Pay — paiements P2P et marchand via QR code.
 *
 * Deux onglets :
 *  - Recevoir : l'utilisateur saisit un montant, on génère un QR que le payeur scanne.
 *  - Payer    : l'utilisateur scanne le QR d'une demande existante, confirme, wallet est débité.
 *
 * Flux backend (déjà implémenté) :
 *   POST /api/payment-request       → créer une demande, retourne `qr_token`
 *   GET  /api/payment-request/:tok  → détail (montant + destinataire)
 *   POST /api/payment-request/pay   → déclenche le débit atomique
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { useAuthStore } from '../../src/store/authStore';
import paymentRequestApi, { PaymentRequest } from '../../src/api/paymentRequestApi';

type Tab = 'receive' | 'pay';

function buildQrImageUri(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&data=${encodeURIComponent(data)}`;
}

export default function QrPayScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('receive');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement QR</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, tab === 'receive' && styles.tabActive]} onPress={() => setTab('receive')}>
          <Ionicons name="qr-code" size={18} color={tab === 'receive' ? '#FFF' : Colors.text} />
          <Text style={[styles.tabText, tab === 'receive' && styles.tabTextActive]}>Recevoir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'pay' && styles.tabActive]} onPress={() => setTab('pay')}>
          <Ionicons name="scan" size={18} color={tab === 'pay' ? '#FFF' : Colors.text} />
          <Text style={[styles.tabText, tab === 'pay' && styles.tabTextActive]}>Payer</Text>
        </TouchableOpacity>
      </View>

      {tab === 'receive' ? <ReceivePanel username={user?.username ?? undefined} /> : <PayPanel />}
    </View>
  );
}

// =======================
// Onglet "Recevoir"
// =======================
function ReceivePanel({ username }: { username?: string }) {
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [request, setRequest] = useState<PaymentRequest | null>(null);

  const quickAmounts = useMemo(() => [500, 1000, 2000, 5000, 10000, 25000], []);

  const handleCreate = async () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant supérieur à 0 FCFA.');
      return;
    }
    if (num > 10_000_000) {
      Alert.alert('Montant trop élevé', 'Maximum 10 000 000 FCFA par demande.');
      return;
    }
    setCreating(true);
    try {
      const r = await paymentRequestApi.create(num, 'XOF', 30 * 60); // 30 min
      setRequest(r);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || 'Impossible de créer la demande. Vérifiez votre connexion.';
      Alert.alert('Demande non créée', String(msg).slice(0, 200));
    } finally {
      setCreating(false);
    }
  };

  const resetRequest = () => {
    setRequest(null);
    setAmount('');
  };

  if (request) {
    const expiresIn = Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000));
    const minutes = Math.floor(expiresIn / 60);
    const seconds = expiresIn % 60;
    const qrUrl = buildQrImageUri(request.qr_token);

    return (
      <ScrollView contentContainerStyle={styles.panel}>
        <Text style={styles.hintTop}>Montrez ce QR code au payeur pour qu'il vous envoie le montant.</Text>

        <View style={styles.qrCard}>
          <View style={styles.qrFrame}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
          </View>
          <Text style={styles.qrAmount}>{request.amount.toLocaleString('fr-FR')} {request.currency}</Text>
          {username ? <Text style={styles.qrUser}>@{username}</Text> : null}
          <Text style={styles.qrExpires}>
            Expire dans {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
        </View>

        <TouchableOpacity style={styles.secondaryBtn} onPress={resetRequest}>
          <Ionicons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Nouveau montant</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <Text style={styles.label}>Montant à recevoir</Text>
      <View style={styles.amountBox}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          maxLength={8}
        />
        <Text style={styles.currency}>FCFA</Text>
      </View>

      <View style={styles.quickAmounts}>
        {quickAmounts.map((q) => (
          <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setAmount(String(q))}>
            <Text style={styles.quickChipText}>{q.toLocaleString('fr-FR')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (creating || !amount) && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={creating || !amount}
      >
        {creating ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="qr-code" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Générer mon QR code</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>Le QR expire après 30 minutes. Vous recevrez une notification dès que le paiement est effectué.</Text>
    </ScrollView>
  );
}

// =======================
// Onglet "Payer"
// =======================
function PayPanel() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PaymentRequest | null>(null);
  const [confirming, setConfirming] = useState(false);

  const resetScan = useCallback(() => {
    setPendingRequest(null);
    setScanLocked(false);
  }, []);

  const handleScanned = useCallback(async (token: string) => {
    if (scanLocked) return;
    setScanLocked(true);
    setLoadingRequest(true);
    try {
      const req = await paymentRequestApi.getByToken(token);
      if (!req) {
        Alert.alert('QR invalide', 'Cette demande est introuvable ou ne provient pas d\'AfriWonder.', [
          { text: 'OK', onPress: resetScan },
        ]);
        return;
      }
      if (req.status !== 'pending') {
        Alert.alert('Demande indisponible', 'Ce QR a déjà été utilisé ou a expiré.', [
          { text: 'OK', onPress: resetScan },
        ]);
        return;
      }
      setPendingRequest(req);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire cette demande. Réessayez.', [
        { text: 'OK', onPress: resetScan },
      ]);
    } finally {
      setLoadingRequest(false);
    }
  }, [scanLocked, resetScan]);

  const confirmPay = async () => {
    if (!pendingRequest) return;
    setConfirming(true);
    try {
      const result = await paymentRequestApi.pay(pendingRequest.qr_token);
      if (!result.success) {
        Alert.alert('Paiement refusé', result.error ?? 'Le paiement n\'a pas pu être effectué.', [
          { text: 'OK', onPress: resetScan },
        ]);
        return;
      }
      Alert.alert(
        'Paiement effectué ✓',
        `${pendingRequest.amount.toLocaleString('fr-FR')} ${pendingRequest.currency} envoyés.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || 'Paiement impossible. Vérifiez votre solde.';
      Alert.alert('Paiement refusé', String(msg).slice(0, 200), [
        { text: 'OK', onPress: resetScan },
      ]);
    } finally {
      setConfirming(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerPanel}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerPanel}>
        <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.permTitle}>Caméra requise</Text>
        <Text style={styles.permText}>
          Pour scanner un QR de paiement, autorisez l'accès à la caméra.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingRequest) {
    return (
      <View style={styles.centerPanel}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.permText}>Lecture du QR...</Text>
      </View>
    );
  }

  if (pendingRequest) {
    return (
      <ScrollView contentContainerStyle={styles.panel}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmLabel}>Vous allez payer</Text>
          <Text style={styles.confirmAmount}>
            {pendingRequest.amount.toLocaleString('fr-FR')} {pendingRequest.currency}
          </Text>
          <Text style={styles.confirmHint}>
            Débité immédiatement de votre portefeuille AfriWonder.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, confirming && styles.btnDisabled]}
          onPress={confirmPay}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Confirmer le paiement</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={resetScan} disabled={confirming}>
          <Ionicons name="close" size={18} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.scannerWrap}>
      <CameraView
        style={styles.scanner}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (!scanLocked && data) {
            void handleScanned(data);
          }
        }}
      />
      <View style={styles.scannerOverlay}>
        <View style={styles.scannerFrame} />
        <Text style={styles.scannerHint}>Placez le QR code dans le cadre</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },

  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.text, fontWeight: '600', fontSize: FontSizes.md },
  tabTextActive: { color: '#FFF' },

  panel: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  centerPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  currency: { color: Colors.textSecondary, fontSize: FontSizes.lg, fontWeight: '600' },

  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  quickChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.md },
  btnDisabled: { opacity: 0.5 },
  hint: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  hintTop: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', marginBottom: Spacing.sm },

  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrFrame: {
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
  },
  qrImage: { width: 280, height: 280 },
  qrAmount: { color: Colors.primary, fontSize: 28, fontWeight: '800' },
  qrUser: { color: Colors.textSecondary, fontSize: FontSizes.md },
  qrExpires: { color: Colors.textMuted, fontSize: FontSizes.sm },

  permTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: '700' },
  permText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },

  scannerWrap: { flex: 1 },
  scanner: { flex: 1 },
  scannerOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    fontWeight: '600',
  },

  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmLabel: { color: Colors.textSecondary, fontSize: FontSizes.md },
  confirmAmount: { color: Colors.primary, fontSize: 40, fontWeight: '800', marginVertical: Spacing.sm },
  confirmHint: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
});
