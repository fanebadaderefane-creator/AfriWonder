import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import apiClient from '../api/client';

const PENDING_PUBLISH_KEY = 'afw_pending_publish_v1';

type PendingPublishJob = {
  path: '/videos' | '/posts';
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: number;
};

class UploadRecoveryService {
  private started = false;
  private flushInFlight: Promise<void> | null = null;
  private unsubNetInfo: (() => void) | null = null;
  private unsubAppState: (() => void) | null = null;
  private appState: AppStateStatus = AppState.currentState;

  private async readPendingPublishJob(): Promise<PendingPublishJob | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_PUBLISH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingPublishJob;
      if (!parsed?.path || !parsed?.idempotencyKey || !parsed?.payload) return null;
      if (parsed.path !== '/videos' && parsed.path !== '/posts') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async clearPendingPublishJob(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_PUBLISH_KEY);
    } catch {
      // no-op
    }
  }

  async flushNow(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = (async () => {
      try {
        const net = await NetInfo.fetch();
        if (!net.isConnected) return;
        const pending = await this.readPendingPublishJob();
        if (!pending) return;
        await apiClient.post(pending.path, pending.payload, {
          timeout: 120000,
          headers: { 'Idempotency-Key': pending.idempotencyKey },
        });
        await this.clearPendingPublishJob();
      } catch {
        // Keep job persisted for next retry.
      } finally {
        this.flushInFlight = null;
      }
    })();
    return this.flushInFlight;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.unsubNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) void this.flushNow();
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      const prev = this.appState;
      this.appState = next;
      if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        void this.flushNow();
      }
    });
    this.unsubAppState = () => appStateSub.remove();

    void this.flushNow();
  }

  stop(): void {
    this.started = false;
    this.unsubNetInfo?.();
    this.unsubNetInfo = null;
    this.unsubAppState?.();
    this.unsubAppState = null;
  }
}

export const uploadRecoveryService = new UploadRecoveryService();
export default uploadRecoveryService;
