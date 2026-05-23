import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import {
  runReleasePreflight,
  type PreflightCheck,
} from '../../src/config/releasePreflight';
import { featureFlags } from '../../src/config/featureFlags';

export default function ReleasePreflightScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [checks, setChecks] = useState<PreflightCheck[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setChecks(await runReleasePreflight());
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostics release</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Vérifications rapides avant build store (backend, socket, santé API, push). Plateforme :{' '}
          {Platform.OS} · v{String(Constants.expoConfig?.version ?? '1.0.0')}
        </Text>

        <Text style={styles.flagsTitle}>Modules (feature flags)</Text>
        <View style={styles.flagCard}>
          {(
            Object.entries(featureFlags) as [keyof typeof featureFlags, boolean][]
          ).map(([k, v]) => (
            <View key={k} style={styles.flagRow}>
              <Text style={styles.flagKey}>{k}</Text>
              <Text style={[styles.flagVal, { color: v ? '#2ecc71' : colors.textSecondary }]}>
                {v ? 'ON' : 'OFF'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void run()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Lancer les vérifications"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="pulse" size={22} color="#000" />
              <Text style={styles.primaryBtnText}>Lancer les vérifications</Text>
            </>
          )}
        </TouchableOpacity>

        {checks?.map((c) => (
          <View key={c.id} style={styles.checkCard}>
            <View style={styles.checkHead}>
              <Ionicons
                name={c.ok ? 'checkmark-circle' : 'close-circle'}
                size={22}
                color={c.ok ? '#2ecc71' : '#e74c3c'}
              />
              <Text style={styles.checkLabel}>{c.label}</Text>
            </View>
            <Text style={styles.checkDetail}>{c.detail}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
}) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    backBtn: {
      width: 40,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text,
      fontSize: FontSizes.lg,
      fontWeight: '800',
    },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl * 2,
    },
    intro: {
      color: colors.textSecondary,
      fontSize: FontSizes.sm,
      lineHeight: 20,
      marginBottom: Spacing.lg,
    },
    flagsTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: Spacing.sm,
      fontSize: FontSizes.md,
    },
    flagCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
    },
    flagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    flagKey: { color: colors.text, fontSize: FontSizes.sm },
    flagVal: { fontSize: FontSizes.sm, fontWeight: '800' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: BorderRadius.pill,
      marginBottom: Spacing.lg,
      minHeight: MIN_TOUCH_TARGET,
    },
    primaryBtnText: { color: '#000', fontWeight: '800', fontSize: FontSizes.md },
    checkCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    checkHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkLabel: { color: colors.text, fontWeight: '700', flex: 1, fontSize: FontSizes.sm },
    checkDetail: {
      color: colors.textSecondary,
      fontSize: FontSizes.sm,
      marginTop: Spacing.sm,
      lineHeight: 18,
    },
  });
}
