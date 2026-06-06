import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import { API_ROUTES } from '../../config/api';
import {
  evaluateAppUpdate,
  nativePlatformForUpdate,
  readNativeBuildNumber,
  resolvePlatformPolicy,
  resolveUpdateMessage,
  shouldUsePlayInAppUpdate,
  type AppUpdateEvaluation,
  type AppUpdateKind,
  type AppVersionPolicyResponse,
} from '../../services/appUpdateCheck';
import { startNativeInAppUpdate } from '../../services/nativeInAppUpdate';
import { openAppStore } from '../../utils/openAppStore';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import { devLog } from '../../utils/devLog';

const DISMISS_KEY_PREFIX = 'aw_app_update_dismissed_v';

type UpdatePromptState = {
  kind: Exclude<AppUpdateKind, 'none'>;
  evaluation: AppUpdateEvaluation;
  message: string;
  usePlayInAppUpdate: boolean;
};

async function wasSoftUpdateDismissed(latestCode: number): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(`${DISMISS_KEY_PREFIX}${latestCode}`);
    return v === '1';
  } catch {
    return false;
  }
}

async function markSoftUpdateDismissed(latestCode: number): Promise<void> {
  try {
    await AsyncStorage.setItem(`${DISMISS_KEY_PREFIX}${latestCode}`, '1');
  } catch {
    /* ignore */
  }
}

function fetchAppVersionPolicy(): Promise<AppVersionPolicyResponse | null> {
  return apiClient
    .get(API_ROUTES.MOBILE_APP_VERSION)
    .then((res: { data?: { data?: AppVersionPolicyResponse } }) =>
      (res.data?.data ?? res.data) as AppVersionPolicyResponse,
    )
    .catch((err: unknown) => {
      devLog('[AppUpdate] policy fetch failed', err);
      return null;
    });
}

async function triggerUpdate(
  prompt: UpdatePromptState,
  platform: 'android' | 'ios',
): Promise<void> {
  if (prompt.usePlayInAppUpdate) {
    const result = await startNativeInAppUpdate(prompt.kind);
    if (result === 'started') return;
  }
  openAppStore(prompt.evaluation.storeUrl);
}

/**
 * Au démarrage (et retour au premier plan) : propose ou impose la MAJ Play Store / App Store.
 * Android : Google Play In-App Updates (Flexible / Immediate) quand activé côté admin.
 */
export function AppUpdatePrompt() {
  const platform = nativePlatformForUpdate();
  const [prompt, setPrompt] = useState<UpdatePromptState | null>(null);
  const checkingRef = useRef(false);
  const softShownThisSessionRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (!platform) return;
    if (typeof __DEV__ !== 'undefined' && __DEV__) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const payload = await fetchAppVersionPolicy();
      const policy = resolvePlatformPolicy(payload, platform);
      const current = readNativeBuildNumber(platform);
      const evaluation = evaluateAppUpdate(platform, current, policy);
      if (evaluation.kind === 'none') {
        setPrompt(null);
        return;
      }
      if (evaluation.kind === 'soft') {
        if (softShownThisSessionRef.current) return;
        if (await wasSoftUpdateDismissed(evaluation.latestVersionCode)) return;
        softShownThisSessionRef.current = true;
      }
      setPrompt({
        kind: evaluation.kind,
        evaluation,
        message: resolveUpdateMessage(evaluation.kind, policy),
        usePlayInAppUpdate: shouldUsePlayInAppUpdate(platform, policy),
      });
    } finally {
      checkingRef.current = false;
    }
  }, [platform]);

  useEffect(() => {
    void runCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  const handleUpdate = useCallback(() => {
    if (!prompt || !platform) return;
    void triggerUpdate(prompt, platform);
  }, [prompt, platform]);

  const handleDismiss = useCallback(() => {
    if (!prompt || prompt.kind !== 'soft') return;
    void markSoftUpdateDismissed(prompt.evaluation.latestVersionCode);
    setPrompt(null);
  }, [prompt]);

  if (!prompt || Platform.OS === 'web') return null;

  const isForce = prompt.kind === 'force';
  const storeLabel = Platform.OS === 'android' ? 'Play Store' : 'App Store';

  return (
    <Modal
      visible
      animationType="fade"
      transparent={!isForce}
      onRequestClose={isForce ? () => {} : handleDismiss}
    >
      <View style={[styles.backdrop, isForce && styles.backdropOpaque]}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isForce ? 'Mise à jour requise' : 'Mise à jour disponible'}
          </Text>
          <Text style={styles.body}>{prompt.message}</Text>
          {!isForce ? (
            <Text style={styles.hint}>
              Mettez à jour depuis le {storeLabel} ou directement dans l&apos;application.
            </Text>
          ) : null}
          <Pressable
            style={styles.primaryBtn}
            onPress={handleUpdate}
            accessibilityRole="button"
            accessibilityLabel="Mettre à jour AfriWonder"
          >
            <Text style={styles.primaryBtnText}>Mettre à jour</Text>
          </Pressable>
          {!isForce ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Reporter la mise à jour"
            >
              <Text style={styles.secondaryBtnText}>Plus tard</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdropOpaque: {
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
