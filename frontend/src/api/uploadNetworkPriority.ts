import type { AxiosRequestConfig } from 'axios';

const UNLOCK_WAIT_MAX_MS = 20_000;

let uploadPriorityLocks = 0;
const waiters = new Set<() => void>();

function signalUnlocked(): void {
  for (const release of Array.from(waiters)) {
    try {
      release();
    } catch {
      // no-op
    }
  }
  waiters.clear();
}

function normalizeUrl(input: unknown): string {
  return String(input || '').toLowerCase().trim();
}

function hasCriticalHeader(config: AxiosRequestConfig): boolean {
  const headers = (config.headers || {}) as Record<string, unknown>;
  const raw =
    headers['X-AFW-Upload-Critical']
    ?? headers['x-afw-upload-critical']
    ?? headers['x-AFW-upload-critical'];
  return String(raw || '').trim() === '1';
}

function isCriticalDuringUpload(config: AxiosRequestConfig): boolean {
  if (hasCriticalHeader(config)) return true;
  if (config.data instanceof FormData) return true;

  const url = normalizeUrl(config.url);
  const method = String(config.method || 'get').toLowerCase();

  if (url.includes('/upload/')) return true;
  if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register')) return true;
  if (url.includes('/health')) return true;
  if (method === 'post' && (url === '/videos' || url.endsWith('/videos') || url === '/posts' || url.endsWith('/posts'))) {
    return true;
  }
  return false;
}

export function beginUploadNetworkPriority(): void {
  uploadPriorityLocks += 1;
}

export function endUploadNetworkPriority(): void {
  uploadPriorityLocks = Math.max(0, uploadPriorityLocks - 1);
  if (uploadPriorityLocks === 0) {
    signalUnlocked();
  }
}

export function isUploadNetworkPriorityActive(): boolean {
  return uploadPriorityLocks > 0;
}

export async function deferNonCriticalRequestDuringUpload(config: AxiosRequestConfig): Promise<void> {
  if (!isUploadNetworkPriorityActive()) return;
  if (isCriticalDuringUpload(config)) return;

  await new Promise<void>((resolve) => {
    const release = () => {
      if (timer) clearTimeout(timer);
      waiters.delete(release);
      resolve();
    };
    const timer = setTimeout(release, UNLOCK_WAIT_MAX_MS);
    waiters.add(release);
  });
}

