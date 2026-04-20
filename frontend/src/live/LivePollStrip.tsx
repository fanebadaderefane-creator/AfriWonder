import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

type PollOpt = { text: string; votes: number };
type Poll = {
  id: string;
  question: string;
  options: PollOpt[];
  total_votes: number;
  userVote?: number | null;
};

export function LivePollStrip({
  liveId,
  onSocketPoll,
}: {
  liveId: string;
  onSocketPoll?: Poll | null;
}) {
  const user = useAuthStore((s) => s.user);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!liveId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/polls`);
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setPolls(list as Poll[]);
    } catch {
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (onSocketPoll?.id) {
      setPolls((prev) => {
        const i = prev.findIndex((p) => p.id === onSocketPoll.id);
        if (i < 0) return [onSocketPoll, ...prev];
        const next = [...prev];
        next[i] = onSocketPoll;
        return next;
      });
    }
  }, [onSocketPoll]);

  const vote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    setBusy(`${pollId}-${optionIndex}`);
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/polls/${encodeURIComponent(pollId)}/vote`, {
        optionIndex,
      });
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const active = polls.find((p) => p && (p as { status?: string }).status !== 'ended') || polls[0];
  if (loading && !active) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }
  if (!active) return null;

  const opts = Array.isArray(active.options) ? active.options : [];
  const total = Math.max(1, active.total_votes || opts.reduce((s, o) => s + (o.votes || 0), 0));

  return (
    <View style={styles.card}>
      <Text style={styles.q}>{active.question}</Text>
      {opts.map((o, idx) => {
        const pct = Math.round(((o.votes || 0) / total) * 100);
        const selected = active.userVote === idx;
        const key = `${active.id}-${idx}`;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.opt, selected && styles.optSel]}
            disabled={!user || busy != null}
            onPress={() => void vote(active.id, idx)}
          >
            <View style={[styles.bar, { width: `${pct}%` }]} />
            <Text style={styles.optText}>
              {o.text} · {pct}% ({o.votes || 0})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: Spacing.sm },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 8,
  },
  q: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.sm },
  opt: {
    overflow: 'hidden',
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  optSel: { borderWidth: 1, borderColor: Colors.primary },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(99,102,241,0.35)',
  },
  optText: { color: '#FFF', fontSize: FontSizes.xs, zIndex: 1 },
});
