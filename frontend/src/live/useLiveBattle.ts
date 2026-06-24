import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import socketService from '../services/socketService';
import type { LiveBattleState } from './liveBattleTypes';

export function useLiveBattle(liveId: string | null) {
  const [battle, setBattle] = useState<LiveBattleState | null>(null);
  const [proposedBattle, setProposedBattle] = useState<LiveBattleState | null>(null);

  const load = useCallback(async () => {
    if (!liveId) return;
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/battle/current`);
      const data = (res.data?.data ?? res.data) as LiveBattleState | null;
      if (data?.id) {
        setBattle(data);
        if (data.status === 'pending') setProposedBattle(data);
      } else {
        setBattle(null);
      }
    } catch {
      setBattle(null);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!liveId) return;

    const onStarted = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      setBattle(raw as LiveBattleState);
      setProposedBattle(null);
    };
    const onScore = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      setBattle(raw as LiveBattleState);
    };
    const onEnded = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const b = raw as LiveBattleState;
      setBattle(b.status === 'active' ? b : null);
      setProposedBattle(null);
    };
    const onProposed = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const b = raw as LiveBattleState;
      if (b.opponent_live_id === liveId && b.status === 'pending') {
        setProposedBattle(b);
      }
    };

    socketService.on('battle:started', onStarted);
    socketService.on('battle:score-update', onScore);
    socketService.on('battle:ended', onEnded);
    socketService.on('battle:proposed', onProposed);

    return () => {
      socketService.off('battle:started', onStarted);
      socketService.off('battle:score-update', onScore);
      socketService.off('battle:ended', onEnded);
      socketService.off('battle:proposed', onProposed);
    };
  }, [liveId]);

  const acceptBattle = useCallback(async () => {
    if (!liveId) return;
    await apiClient.post(`/live/${encodeURIComponent(liveId)}/battle/accept`, {});
    await load();
  }, [liveId, load]);

  const declineBattle = useCallback(async () => {
    if (!liveId) return;
    await apiClient.post(`/live/${encodeURIComponent(liveId)}/battle/decline`, {});
    setProposedBattle(null);
    await load();
  }, [liveId, load]);

  const endBattle = useCallback(async () => {
    if (!liveId) return;
    await apiClient.post(`/live/${encodeURIComponent(liveId)}/battle/end`, {});
    setBattle(null);
  }, [liveId]);

  return {
    battle,
    proposedBattle,
    reloadBattle: load,
    acceptBattle,
    declineBattle,
    endBattle,
    isBattleActive: battle?.status === 'active',
  };
}
