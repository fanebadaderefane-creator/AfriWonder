import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import socketService from '../services/socketService';

export type LiveGuestSlotRow = {
  user_id: string;
  slot_index: number;
  username?: string;
  avatar_url?: string | null;
};

export type LiveGuestQueueRow = {
  user_id: string;
  username?: string;
  avatar_url?: string | null;
  position?: number;
};

export function useLiveGuests(liveId: string | null, isHost: boolean) {
  const [slots, setSlots] = useState<LiveGuestSlotRow[]>([]);
  const [queue, setQueue] = useState<LiveGuestQueueRow[]>([]);
  const [maxSlots, setMaxSlots] = useState(8);
  const [guestInviteVisible, setGuestInviteVisible] = useState(false);

  const load = useCallback(async () => {
    if (!liveId) return;
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/guests`);
      const data = res.data?.data ?? res.data;
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
      setQueue(Array.isArray(data?.queue) ? data.queue : []);
      if (typeof data?.max_slots === 'number') setMaxSlots(data.max_slots);
    } catch {
      setSlots([]);
      setQueue([]);
    }
  }, [liveId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!liveId) return;
    const onUpdated = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { slots?: LiveGuestSlotRow[]; queue?: LiveGuestQueueRow[]; max_slots?: number };
      if (d.slots) setSlots(d.slots);
      if (d.queue) setQueue(d.queue);
      if (typeof d.max_slots === 'number') setMaxSlots(d.max_slots);
    };
    const onAccepted = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const p = raw as { userId?: string; accepted?: boolean };
      if (p.accepted) setGuestInviteVisible(true);
      void load();
    };
    const onRequested = () => {
      if (isHost) void load();
    };

    socketService.on('live:guest:updated', onUpdated);
    socketService.on('live:guest:accepted', onAccepted);
    socketService.on('live:guest:requested', onRequested);
    return () => {
      socketService.off('live:guest:updated', onUpdated);
      socketService.off('live:guest:accepted', onAccepted);
      socketService.off('live:guest:requested', onRequested);
    };
  }, [liveId, isHost, load]);

  const requestGuestSlot = useCallback(async () => {
    if (!liveId) return;
    await apiClient.post(`/live/${encodeURIComponent(liveId)}/guests/request`, {});
  }, [liveId]);

  const respondGuest = useCallback(
    async (userId: string, accept: boolean) => {
      if (!liveId) return;
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/guests/respond`, {
        user_id: userId,
        accept,
      });
      await load();
    },
    [liveId, load],
  );

  const removeGuest = useCallback(
    async (userId: string) => {
      if (!liveId) return;
      await apiClient.post(`/live/${encodeURIComponent(liveId)}/guests/remove`, {
        user_id: userId,
        accept: false,
      });
      await load();
    },
    [liveId, load],
  );

  const leaveGuest = useCallback(async () => {
    if (!liveId) return;
    await apiClient.post(`/live/${encodeURIComponent(liveId)}/guests/leave`, {});
    setGuestInviteVisible(false);
  }, [liveId]);

  return {
    slots,
    queue,
    maxSlots,
    guestInviteVisible,
    setGuestInviteVisible,
    requestGuestSlot,
    respondGuest,
    removeGuest,
    leaveGuest,
    reloadGuests: load,
  };
}
