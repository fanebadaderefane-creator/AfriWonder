import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import apiClient from '../api/client';
import { Colors, FontSizes, Spacing } from '../theme/colors';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';

const SLOW_OPTIONS = [0, 3, 5, 10, 30] as const;

export function LiveHostModerationSection({ liveId }: { liveId: string }) {
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [followersOnly, setFollowersOnly] = useState(false);
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/moderation`);
      const m = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (m) {
        if (typeof m.comments_enabled === 'boolean') setCommentsEnabled(m.comments_enabled);
        if (typeof m.followers_only === 'boolean') setFollowersOnly(m.followers_only);
        if (typeof m.slow_mode_seconds === 'number') setSlowModeSeconds(m.slow_mode_seconds);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    try {
      await apiClient.patch(`/live/${encodeURIComponent(liveId)}/moderation`, body);
    } catch (e: unknown) {
      Alert.alert('Modération', getAlertMessageForCaughtError(e));
      void load();
    }
  };

  if (loading) {
    return <Text style={styles.muted}>Chargement modération…</Text>;
  }

  return (
    <View>
      <Text style={styles.section}>Modération chat</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Chat activé</Text>
        <Switch
          value={commentsEnabled}
          onValueChange={(v) => {
            setCommentsEnabled(v);
            void patch({ comments_enabled: v });
          }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Abonnés / Wonder uniquement</Text>
        <Switch
          value={followersOnly}
          onValueChange={(v) => {
            setFollowersOnly(v);
            void patch({ followers_only: v });
          }}
        />
      </View>
      <Text style={[styles.label, { marginTop: Spacing.sm }]}>Slow mode (secondes entre messages)</Text>
      <View style={styles.chips}>
        {SLOW_OPTIONS.map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[styles.chip, slowModeSeconds === sec && styles.chipOn]}
            onPress={() => {
              setSlowModeSeconds(sec);
              void patch({ slow_mode_seconds: sec });
            }}
          >
            <Text style={[styles.chipText, slowModeSeconds === sec && styles.chipTextOn]}>{sec === 0 ? 'Off' : `${sec}s`}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: Colors.text, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  label: { color: Colors.text, fontSize: FontSizes.sm },
  muted: { color: Colors.textMuted, fontSize: FontSizes.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipOn: { backgroundColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  chipTextOn: { color: '#FFF' },
});
