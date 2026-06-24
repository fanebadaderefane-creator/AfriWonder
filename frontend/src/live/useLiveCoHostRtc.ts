import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import socketService from '../services/socketService';
import { getAlertMessageForCaughtError } from '../utils/userFacingError';
import type { AgoraLiveRole } from '../hooks/useAgoraLiveRtc';

type CoHostInvitePayload = {
  live_id?: string;
  cohost_id?: string;
  status?: string;
};

export function useLiveCoHostRtc(opts: {
  liveId: string | null;
  creatorId: string | null;
  liveAccessGranted: boolean;
}) {
  const { liveId, creatorId, liveAccessGranted } = opts;
  const userId = useAuthStore((s) => s.user?.id);
  const [rtcRole, setRtcRole] = useState<AgoraLiveRole>('audience');
  const [cohostInviteVisible, setCohostInviteVisible] = useState(false);
  const [cohostBusy, setCohostBusy] = useState(false);

  const refreshRtcRole = useCallback(async () => {
    if (!liveId || !userId || creatorId === userId) return;
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/rtc-role`);
      const role = String((res.data?.data ?? res.data)?.role ?? 'audience');
      if (role === 'host') setRtcRole('host');
    } catch {
      /* ignore */
    }
  }, [liveId, userId, creatorId]);

  useEffect(() => {
    if (!liveId || !liveAccessGranted) return;
    void refreshRtcRole();
  }, [liveId, liveAccessGranted, refreshRtcRole]);

  useEffect(() => {
    if (!liveId || !userId) return;

    const onInvited = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as CoHostInvitePayload;
      const streamId = String(p.live_id ?? liveId);
      if (streamId !== liveId) return;
      if (String(p.cohost_id ?? '') === userId && String(p.status ?? 'pending') === 'pending') {
        setCohostInviteVisible(true);
      }
    };

    const onAccepted = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { cohost_id?: string; userId?: string };
      const uid = String(p.cohost_id ?? p.userId ?? '');
      if (uid === userId) {
        setRtcRole('host');
        setCohostInviteVisible(false);
      }
    };

    const onGuestAccepted = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { userId?: string; liveId?: string };
      if (p.liveId && p.liveId !== liveId) return;
      if (String(p.userId ?? '') === userId) {
        setRtcRole('host');
      }
    };

    socketService.on('live:cohost:invited', onInvited);
    socketService.on('live:cohost:accepted', onAccepted);
    socketService.on('live:guest:accepted', onGuestAccepted);
    return () => {
      socketService.off('live:cohost:invited', onInvited);
      socketService.off('live:cohost:accepted', onAccepted);
      socketService.off('live:guest:accepted', onGuestAccepted);
    };
  }, [liveId, userId]);

  const acceptCoHostInvite = useCallback(async () => {
    if (!liveId) return;
    setCohostBusy(true);
    try {
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/cohost/accept`);
      setRtcRole('host');
      setCohostInviteVisible(false);
      Alert.alert('Co-host', 'Vous êtes à l’antenne — votre caméra est active.');
    } catch (e: unknown) {
      Alert.alert('Co-host', getAlertMessageForCaughtError(e));
    } finally {
      setCohostBusy(false);
    }
  }, [liveId]);

  const declineCoHostInvite = useCallback(() => {
    setCohostInviteVisible(false);
  }, []);

  return {
    rtcRole,
    cohostInviteVisible,
    cohostBusy,
    acceptCoHostInvite,
    declineCoHostInvite,
  };
}
