import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import { extractOAuthAccessToken } from '../../utils/extractOAuthAccessToken';
import {
  getGoogleOAuthEnv,
  getFacebookAppId,
  getOAuthMissingConfigHint,
  isGoogleOAuthConfiguredForPlatform,
  isFacebookOAuthConfigured,
  isAppleSignInDisabledByEnv,
  resolveGoogleClientIdsForNativeGoogleAuth,
} from '../../config/oauthEnv';
import {
  getOAuthRedirectUriVariantsForConsole,
  logOAuthRedirectDebugInfo,
} from '../../config/oauthRedirectUris';

WebBrowser.maybeCompleteAuthSession();

/** Sur le web, `Alert.alert` est souvent sans effet (react-native-web) — l’utilisateur ne voit rien. */
function alertInfo(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const OAUTH_UNAVAILABLE_MESSAGE =
  'Ce mode de connexion n’est pas disponible pour le moment. Utilisez votre e-mail ou votre numéro de téléphone.';

const GOOGLE_ANDROID_SETUP_HINT =
  'Sur Android, Google exige un identifiant client dédié (EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) et l’empreinte SHA-1 du certificat de l’app (debug, build EAS, signature Play) enregistrée dans Google Cloud pour le package com.afriwonder.app. En attendant, utilisez l’e-mail ou le téléphone.';

/**
 * Web : CSS globale peut forcer couleur du texte.
 * Android (APK) : mode sombre forcé OEM / ripple peut rendre le libellé quasi invisible sur fond blanc — couleurs explicites.
 */
const oauthLabelContrastFix = (kind: 'googleDark' | 'facebookLight') =>
  Platform.OS === 'web' || Platform.OS === 'android'
    ? kind === 'googleDark'
      ? ({ color: '#121212' } as const)
      : ({ color: '#FFFFFF' } as const)
    : null;

function OAuthUnavailableButton({ kind }: { kind: 'google' | 'facebook' }) {
  const isGoogle = kind === 'google';
  return (
    <TouchableOpacity
      style={[styles.providerBtn, isGoogle ? styles.googleBtn : styles.facebookBtn]}
      onPress={() => {
        if (isGoogle && Platform.OS === 'android') {
          alertInfo('Google (Android)', GOOGLE_ANDROID_SETUP_HINT);
          return;
        }
        const devHint = typeof __DEV__ !== 'undefined' && __DEV__ ? getOAuthMissingConfigHint(Platform.OS) : '';
        alertInfo('Connexion', OAUTH_UNAVAILABLE_MESSAGE + devHint);
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isGoogle ? 'Continuer avec Google' : 'Continuer avec Facebook'}
    >
      <Ionicons name={isGoogle ? 'logo-google' : 'logo-facebook'} size={22} color={isGoogle ? '#1a1a1a' : '#fff'} />
      <Text
        style={[
          isGoogle ? styles.providerBtnTextDark : styles.providerBtnTextLight,
          oauthLabelContrastFix(isGoogle ? 'googleDark' : 'facebookLight'),
        ]}
      >
        {isGoogle ? 'Continuer avec Google' : 'Continuer avec Facebook'}
      </Text>
    </TouchableOpacity>
  );
}

function GoogleOAuthBlock({
  onBusy,
  onDone,
}: {
  onBusy: (v: boolean) => void;
  onDone: () => void;
}) {
  const { setAuth } = useAuthStore();
  const googleIds = useMemo(
    () => resolveGoogleClientIdsForNativeGoogleAuth(Platform.OS, getGoogleOAuthEnv()),
    [],
  );
  /** Pas de `redirectUri` custom : provider Expo. Expo Go Android utilise le client Web (voir `oauthEnv`). */
  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId: googleIds.webClientId,
    iosClientId: googleIds.iosClientId,
    androidClientId: googleIds.androidClientId,
  });
  const handledUrl = useRef<string | null>(null);
  const lastGoogleOAuthErrorKey = useRef<string | null>(null);

  useEffect(() => {
    if (googleResponse?.type !== 'success' || !('url' in googleResponse)) return;
    const url = googleResponse.url;
    if (handledUrl.current === url) return;
    const token = extractOAuthAccessToken(googleResponse);
    if (!token) return;
    handledUrl.current = url;
    onBusy(true);
    void (async () => {
      try {
        const r = await authApi.oauthGoogle(token);
        await setAuth(r.user, r.accessToken, r.refreshToken);
        onDone();
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
          (e as Error)?.message ||
          'Connexion Google impossible';
        alertInfo('Google', msg);
        handledUrl.current = null;
      } finally {
        onBusy(false);
      }
    })();
  }, [googleResponse, onBusy, onDone, setAuth]);

  useEffect(() => {
    if (!googleResponse || googleResponse.type !== 'error') return;
    const errObj = googleResponse as {
      error?: string | { message?: string; code?: string };
      params?: { error_description?: string };
    };
    const rawMsg =
      (typeof errObj.error === 'object' && errObj.error?.message && String(errObj.error.message)) ||
      (typeof errObj.error === 'string' && errObj.error) ||
      (errObj.params?.error_description && String(errObj.params.error_description)) ||
      'Connexion Google impossible.';
    const key = `${rawMsg}:${String((errObj.error as { code?: string } | undefined)?.code ?? '')}`;
    if (lastGoogleOAuthErrorKey.current === key) return;
    lastGoogleOAuthErrorKey.current = key;
    const redirects = getOAuthRedirectUriVariantsForConsole();
    const redirectHint = redirects.length
      ? `\n\nURI de redirection à autoriser dans Google Cloud:\n- ${redirects.join('\n- ')}`
      : '';
    const hint =
      Platform.OS === 'android'
        ? '\n\nVérifiez aussi la SHA-1 dans Google Cloud (debug / EAS / Play) pour com.afriwonder.app.'
        : '';
    alertInfo('Google', `${rawMsg}${hint}${redirectHint}`);
  }, [googleResponse]);

  return (
    <TouchableOpacity
      style={[styles.providerBtn, styles.googleBtn]}
      onPress={() => {
        lastGoogleOAuthErrorKey.current = null;
        void googlePrompt();
      }}
      activeOpacity={0.85}
    >
      <Ionicons name="logo-google" size={22} color="#1a1a1a" />
      <Text style={[styles.providerBtnTextDark, oauthLabelContrastFix('googleDark')]}>Continuer avec Google</Text>
    </TouchableOpacity>
  );
}

function FacebookOAuthBlock({
  onBusy,
  onDone,
}: {
  onBusy: (v: boolean) => void;
  onDone: () => void;
}) {
  const { setAuth } = useAuthStore();
  const appId = getFacebookAppId();
  const [, fbResponse, fbPrompt] = Facebook.useAuthRequest({
    clientId: appId,
  });
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (fbResponse?.type !== 'success' || !('url' in fbResponse)) return;
    const url = fbResponse.url;
    if (handledUrl.current === url) return;
    const token = extractOAuthAccessToken(fbResponse);
    if (!token) return;
    handledUrl.current = url;
    onBusy(true);
    void (async () => {
      try {
        const r = await authApi.oauthFacebook(token);
        await setAuth(r.user, r.accessToken, r.refreshToken);
        onDone();
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
          (e as Error)?.message ||
          'Connexion Facebook impossible';
        const redirects = getOAuthRedirectUriVariantsForConsole();
        const redirectHint = redirects.length
          ? `\n\nURI OAuth valides à ajouter dans Meta Developers:\n- ${redirects.join('\n- ')}`
          : '';
        alertInfo('Facebook', `${msg}${redirectHint}`);
        handledUrl.current = null;
      } finally {
        onBusy(false);
      }
    })();
  }, [fbResponse, onBusy, onDone, setAuth]);

  return (
    <TouchableOpacity
      style={[styles.providerBtn, styles.facebookBtn]}
      onPress={() => void fbPrompt()}
      activeOpacity={0.85}
    >
      <Ionicons name="logo-facebook" size={22} color="#fff" />
      <Text style={[styles.providerBtnTextLight, oauthLabelContrastFix('facebookLight')]}>Continuer avec Facebook</Text>
    </TouchableOpacity>
  );
}

const APPLE_UNAVAILABLE_NON_IOS =
  'La connexion avec Apple est disponible sur l’app AfriWonder pour iPhone et iPad. Sur le web ou Android, utilisez Google, Facebook ou votre e-mail.';

const APPLE_UNAVAILABLE_DEVICE =
  'La connexion avec Apple n’est pas disponible sur cet appareil. Utilisez une autre méthode de connexion.';

function AppleOAuthBlock({
  onBusy,
  onDone,
  disabledByEnv,
}: {
  onBusy: (v: boolean) => void;
  onDone: () => void;
  disabledByEnv: boolean;
}) {
  const { setAuth } = useAuthStore();

  if (disabledByEnv) return null;

  return (
    <TouchableOpacity
      style={[styles.providerBtn, styles.appleBtn]}
      onPress={() => {
        void (async () => {
          if (Platform.OS !== 'ios') {
            alertInfo('Apple', APPLE_UNAVAILABLE_NON_IOS);
            return;
          }
          const nativeOk = await AppleAuthentication.isAvailableAsync();
          if (!nativeOk) {
            alertInfo('Apple', APPLE_UNAVAILABLE_DEVICE);
            return;
          }
          try {
            onBusy(true);
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            const identityToken = credential.identityToken;
            if (!identityToken) {
              alertInfo('Apple', 'Jeton Apple manquant. Réessayez.');
              return;
            }
            const r = await authApi.oauthApple({
              identityToken,
              user: {
                email: credential.email || undefined,
                name: credential.fullName
                  ? {
                      firstName: credential.fullName.givenName || undefined,
                      lastName: credential.fullName.familyName || undefined,
                    }
                  : undefined,
              },
            });
            await setAuth(r.user, r.accessToken, r.refreshToken);
            onDone();
          } catch (e: unknown) {
            if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
            const msg = (e as Error)?.message || 'Connexion Apple impossible';
            alertInfo('Apple', msg);
          } finally {
            onBusy(false);
          }
        })();
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continuer avec Apple"
    >
      <Ionicons name="logo-apple" size={22} color="#fff" />
      <Text style={[styles.providerBtnTextLight, oauthLabelContrastFix('facebookLight')]}>Continuer avec Apple</Text>
    </TouchableOpacity>
  );
}

export function SocialOAuthButtons({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [busy, setBusy] = useState(false);
  const googleEnv = useMemo(() => getGoogleOAuthEnv(), []);
  const showGoogle = isGoogleOAuthConfiguredForPlatform(Platform.OS, googleEnv);
  const showFacebook = isFacebookOAuthConfigured();
  const appleDisabled = isAppleSignInDisabledByEnv();

  useEffect(() => {
    logOAuthRedirectDebugInfo();
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.divider} />
      </View>

      {busy ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
      ) : null}

      <View style={styles.btnCol}>
        {showGoogle ? <GoogleOAuthBlock onBusy={setBusy} onDone={onAuthenticated} /> : <OAuthUnavailableButton kind="google" />}
        {showFacebook ? (
          <FacebookOAuthBlock onBusy={setBusy} onDone={onAuthenticated} />
        ) : (
          <OAuthUnavailableButton kind="facebook" />
        )}
        <AppleOAuthBlock disabledByEnv={appleDisabled} onBusy={setBusy} onDone={onAuthenticated} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  /** Lisible sur fond noir (évite « ou » quasi invisible). */
  dividerText: { color: '#D0D0D8', fontSize: FontSizes.sm, fontWeight: '600' },
  btnCol: { gap: Spacing.md },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderColor: Colors.border,
    ...(Platform.OS === 'android' ? { elevation: 1 } : {}),
  },
  facebookBtn: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  appleBtn: { backgroundColor: '#000', borderColor: '#000' },
  providerBtnTextDark: { color: '#1a1a1a', fontSize: FontSizes.md, fontWeight: '600' },
  providerBtnTextLight: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },
});
