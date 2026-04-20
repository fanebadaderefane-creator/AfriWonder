import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileApiClient from '../api/mobileClient';

const OFFLINE_ACTIONS_KEY = 'afriwonder_offline_actions_v1';

export type OfflineActionType = 'like_video' | 'save_video' | 'follow_user' | 'comment_video';

export type OfflineAction = {
  client_id: string;
  type: OfflineActionType;
  target_id: string;
  payload?: Record<string, unknown>;
  created_at: number;
};

class OfflineActionSyncService {
  private flushInFlight: Promise<void> | null = null;
  private unsubscribe: (() => void) | null = null;

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(actions: OfflineAction[]) {
    await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
  }

  async enqueue(type: OfflineActionType, targetId: string, payload?: Record<string, unknown>) {
    const queue = await this.getQueue();
    const action: OfflineAction = {
      client_id: `${type}:${targetId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      type,
      target_id: targetId,
      payload: payload ?? {},
      created_at: Date.now(),
    };
    queue.push(action);
    await this.saveQueue(queue);
    return action;
  }

  async flush() {
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = (async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;

      const queue = await this.getQueue();
      if (!queue.length) return;

      try {
        const res = await mobileApiClient.post('/mobile/sync', { actions: queue });
        const data = res.data?.data ?? res.data;
        const results = Array.isArray(data?.results) ? data.results : [];
        const failedIds = new Set(
          results
            .filter((r: { success?: boolean; client_id?: string }) => r?.success === false && r?.client_id)
            .map((r: { client_id: string }) => r.client_id)
        );
        const remaining = queue.filter((action) => failedIds.has(action.client_id));
        await this.saveQueue(remaining);
      } catch {
        /* keep queue intact */
      } finally {
        this.flushInFlight = null;
      }
    })();
    return this.flushInFlight;
  }

  initAutoFlush() {
    if (this.unsubscribe) return this.unsubscribe;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void this.flush();
      }
    });
    this.unsubscribe = () => unsubscribe();
    void this.flush();
    return this.unsubscribe;
  }

  stopAutoFlush() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

export const offlineActionSyncService = new OfflineActionSyncService();
export default offlineActionSyncService;
