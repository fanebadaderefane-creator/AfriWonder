import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
  type AppUpdateEvaluation,
  type AppVersionPolicyResponse,
} from '../../services/appUpdateCheck';
import { openAppStore } from '../../utils/openAppStore';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import { devLog } from '../../utils/devLog';

const DISMISS_KEY_PREFIX = 'aw_app_update_dismissed_v';

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

/**
 * Au démarrage (et retour au premier plan) : propose ou impose la MAJ Play Store / App Store.
 */
export function AppUpdatePrompt() {
  const platform = nativePlatformForUpdate();
  const [forceUpdate, setForceUpdate] = useState<AppUpdateEvaluation | null>(null);
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
        setForceUpdate(null);
        return;
      }
      if (evaluation.kind === 'force') {
        setForceUpdate(evaluation);
        return;
      }
      if (softShownThisSessionRef.current) return;
      if (await wasSoftUpdateDismissed(evaluation.latestVersionCode)) return;

      softShownThisSessionRef.current = true;
      Alert.alert(
        'Mise à jour disponible',
        'Une nouvelle version d’AfriWonder est disponible sur le store. Mettez à jour pour profiter des dernières améliorations.',
        [
          {
            text: 'Plus tard',
            style: 'cancel',
            onPress: () => {
              void markSoftUpdateDismissed(evaluation.latestVersionCode);
            },
          },
          {
            text: 'Mettre à jour',
            onPress: () => openAppStore(evaluation.storeUrl),
          },
        ],
        { cancelable: true },
      );
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

  if (!forceUpdate || Platform.OS === 'web') return null;

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={() => {}}>
      <View style={styles.forceRoot}>
        <Text style={styles.forceTitle}>Mise à jour requise</Text>
        <Text style={styles.forceBody}>
          Cette version d’AfriWonder n’est plus supportée. Installez la dernière version depuis le{' '}
          {Platform.OS === 'android' ? 'Play Store' : 'App Store'} pour continuer.
        </Text>
        <Pressable
          style={styles.forceBtn}
          onPress={() => openAppStore(forceUpdate.storeUrl)}
          accessibilityRole="button"
          accessibilityLabel="Mettre à jour AfriWonder"
        >
          <Text style={styles.forceBtnText}>Mettre à jour</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  forceRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  forceTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  forceBody: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  forceBtn: {
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  forceBtnText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
});
