import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import apiClient from '../../../src/api/client';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import type { AppPalette } from '../../../src/theme/themePalettes';

type Status = { is_enabled: boolean; method?: string | null; enabled_at?: string | null };

type EnablePayload = {
  secret?: string;
  backup_codes?: string[];
  qr_code_url?: string;
};

const TITLE = 'Validation en deux étapes';

function HelpIntro({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>À quoi ça sert ?</Text>
      <Text style={styles.infoBullet}>
        • Aujourd&apos;hui, vous vous connectez surtout avec votre mot de passe (ou Google / Apple).
      </Text>
      <Text style={styles.infoBullet}>
        • Avec la validation en deux étapes, quelqu&apos;un qui volerait votre mot de passe ne peut toujours pas ouvrir
        votre compte : il lui manquerait le code affiché sur votre téléphone dans une petite app (Authenticator).
      </Text>
      <Text style={styles.infoBullet}>
        • C&apos;est une option recommandée pour un compte admin, finance ou avec des données sensibles.
      </Text>
    </View>
  );
}

export default function TwoFactorScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<EnablePayload | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/privacy/2fa/status');
      const d = res.data?.data ?? res.data;
      setStatus(d && typeof d === 'object' ? (d as Status) : { is_enabled: false });
    } catch {
      setStatus({ is_enabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onStartSetup = () => {
    setBusy(true);
    void (async () => {
      try {
        const res = await apiClient.post('/privacy/2fa/enable', { method: 'authenticator' });
        const d = res.data?.data ?? res.data;
        setSetup(d as EnablePayload);
        setCode('');
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        Alert.alert(TITLE, ax.response?.data?.error?.message || 'Impossible de démarrer la configuration.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const onVerify = () => {
    const t = code.trim();
    if (t.length < 4) {
      Alert.alert(TITLE, 'Saisissez le code à 6 chiffres affiché dans votre application.');
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await apiClient.post('/privacy/2fa/verify', { code: t });
        setSetup(null);
        setCode('');
        await loadStatus();
        Alert.alert(TITLE, 'La validation en deux étapes est maintenant activée.');
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        Alert.alert(TITLE, ax.response?.data?.error?.message || 'Code invalide.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const onConfirmDisable = () => {
    if (!disablePassword.trim()) {
      Alert.alert(
        'Mot de passe',
        'Saisissez votre mot de passe actuel pour désactiver la validation en deux étapes.',
      );
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        await apiClient.post('/privacy/2fa/disable', { password: disablePassword });
        setShowDisable(false);
        setDisablePassword('');
        setSetup(null);
        await loadStatus();
        Alert.alert(TITLE, 'La validation en deux étapes a été désactivée.');
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        Alert.alert('Erreur', ax.response?.data?.error?.message || 'Impossible de désactiver la 2FA.');
      } finally {
        setBusy(false);
      }
    })();
  };

  if (loading) {
    return (
      <SettingsScreen title={TITLE}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SettingsScreen>
    );
  }

  const enabled = Boolean(status?.is_enabled);

  return (
    <SettingsScreen title={TITLE}>
      <View style={styles.body}>
        <HelpIntro styles={styles} />

        <Text style={styles.p}>
          Une fois activée, à chaque connexion AfriWonder vous entrerez d&apos;abord votre mot de passe habituel, puis
          un code à 6 chiffres qui change toutes les 30 secondes dans l&apos;application sur votre téléphone.
        </Text>

        {enabled && !setup ? (
          <View style={styles.card}>
            <Text style={styles.on}>La validation en deux étapes est activée</Text>
            <Text style={styles.cardHint}>
              Lors de la prochaine connexion, ouvrez votre application d&apos;authentification et saisissez le code
              affiché pour AfriWonder.
            </Text>
            <TouchableOpacity style={styles.danger} onPress={() => setShowDisable(true)} disabled={busy}>
              <Text style={styles.dangerText}>Désactiver</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!enabled && !setup ? (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Vous aurez besoin d&apos;une application gratuite sur le téléphone (ex. Google Authenticator, Microsoft
              Authenticator ou Authy). Nous générons une clé ; vous la scannez ou la collez dans l&apos;app, puis vous
              confirmez avec un premier code.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onStartSetup}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Configurer</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {setup && !enabled ? (
          <View style={styles.card}>
            <Text style={styles.label}>Étape 1 — Lier AfriWonder à votre téléphone</Text>
            <Text style={styles.stepHelp}>
              Touchez la clé longue ci-dessous pour la copier. Dans Authenticator : « Ajouter un compte » → « Saisir une
              clé » → collez la clé, nommez le compte « AfriWonder ». Vous pouvez aussi utiliser « Copier l&apos;URI de
              configuration » si votre app le propose.
            </Text>
            {setup.secret ? (
              <TouchableOpacity
                onPress={() => {
                  void Clipboard.setStringAsync(setup.secret!);
                  Alert.alert('Copié', "La clé secrète a été copiée. Collez-la dans votre application d'authentification.");
                }}
              >
                <Text style={styles.monoHint}>Touchez pour copier la clé</Text>
                <Text style={styles.mono} selectable>
                  {setup.secret}
                </Text>
              </TouchableOpacity>
            ) : null}
            {setup.qr_code_url ? (
              <TouchableOpacity
                style={[styles.secondary, { borderColor: colors.border }]}
                onPress={() => {
                  void Clipboard.setStringAsync(setup.qr_code_url!);
                  Alert.alert(
                    'Copié',
                    "L'URI de configuration a été copiée — collez-la dans votre application si celle-ci le permet.",
                  );
                }}
              >
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Copier l&apos;URI de configuration</Text>
              </TouchableOpacity>
            ) : null}
            {Array.isArray(setup.backup_codes) && setup.backup_codes.length > 0 ? (
              <View style={styles.backups}>
                <Text style={styles.label}>Codes de secours — gardez-les précieusement</Text>
                <Text style={styles.stepHelp}>
                  Si vous perdez ou cassez votre téléphone, chaque code ci-dessous ne fonctionne qu&apos;une fois pour
                  vous reconnecter. Notez-les sur papier ou dans un endroit sûr (pas seulement sur le même téléphone).
                </Text>
                {setup.backup_codes.map((c) => (
                  <Text key={c} style={styles.monoSmall}>
                    {c}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.label}>Étape 2 — Vérifier que tout fonctionne</Text>
            <Text style={styles.stepHelp}>
              Dans Authenticator, un code à 6 chiffres pour AfriWonder doit apparaître et se renouveler environ toutes les
              30 secondes. Saisissez le code actuel ici puis appuyez sur « Activer ».
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onVerify}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Activer</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSetup(null);
                setCode('');
              }}
            >
              <Text style={styles.link}>Annuler</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Modal visible={showDisable} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Désactiver la 2FA</Text>
            <Text style={styles.muted}>Saisissez votre mot de passe pour confirmer.</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={disablePassword}
              onChangeText={setDisablePassword}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDisable(false)}>
                <Text style={{ color: colors.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.okBtn, { backgroundColor: colors.primary }]}
                onPress={onConfirmDisable}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.okText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SettingsScreen>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    body: { paddingHorizontal: 12 },
    centered: { padding: 40, alignItems: 'center' },
    p: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 12, paddingHorizontal: 4 },
    infoBox: {
      marginHorizontal: 4,
      marginBottom: 12,
      padding: 14,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      backgroundColor: colors.card,
    },
    infoTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
    infoBullet: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 6 },
    stepHelp: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
    cardHint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
    monoHint: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    on: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
    label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 6 },
    muted: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
    mono: {
      fontFamily: 'monospace',
      fontSize: 15,
      color: colors.text,
      padding: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    monoSmall: { fontFamily: 'monospace', fontSize: 13, color: colors.textSecondary },
    backups: { marginTop: 12, marginBottom: 8 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 18,
      marginBottom: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
    primaryBtn: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    secondary: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    secondaryText: { fontWeight: '600' },
    danger: { marginTop: 4, padding: 12, alignItems: 'center' },
    dangerText: { color: colors.error, fontWeight: '700', fontSize: 16 },
    link: { textAlign: 'center', color: colors.textSecondary, marginTop: 12, fontSize: 15 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
    cancelBtn: { padding: 12 },
    okBtn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
    okText: { color: '#FFF', fontWeight: '700' },
  });
}
