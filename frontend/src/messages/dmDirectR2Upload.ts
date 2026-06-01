import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import { tryRefreshAccessToken } from '../api/tokenRefresh';
import { copyNativeUriToCacheForDmUpload, normalizeDmUploadMime, type DmUploadKind } from './dmMediaUpload';

const PRESIGN_MAX_ATTEMPTS = 3;
const PUT_MAX_ATTEMPTS = 3;

function isRetriablePresignError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    if (!error.response) return true;
    const status = error.response.status;
    return status === 401 || status === 408 || status === 429 || status >= 500;
  }
  const msg = String((error as Error)?.message || '').toLowerCase();
  return msg.includes('network') || msg.includes('timeout');
}

function isRetriablePutError(error: unknown): boolean {
  const msg = String((error as Error)?.message || '').toLowerCase();
  if (msg.includes('dm_r2_put')) {
    const code = Number(msg.replace(/.*dm_r2_put_(\d+).*/, '$1'));
    return !Number.isFinite(code) || code >= 500 || code === 408 || code === 429;
  }
  return msg.includes('network') || msg.includes('timeout');
}

function putRetryDelayMs(attempt: number): number {
  return Math.min(800 * attempt, 2_400);
}

async function requestDmPresign(input: {
  kind: DmUploadKind;
  fileName: string;
  mimeType: string;
}): Promise<{ uploadUrl: string; fileUrl: string } | null> {
  const contentType = normalizeDmUploadMime(input.mimeType, input.kind, input.fileName);
  let lastError: unknown;
  for (let attempt = 1; attempt <= PRESIGN_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await apiClient.post(
        '/upload/presign',
        {
          kind: input.kind,
          filename: input.fileName,
          contentType,
        },
        { timeout: 60_000 },
      );
      const d = res.data?.data ?? res.data;
      const uploadUrl = String(d?.uploadUrl || '').trim();
      const fileUrl = String(d?.file_url || '').trim();
      if (uploadUrl && fileUrl) {
        return { uploadUrl, fileUrl };
      }
      return null;
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await tryRefreshAccessToken();
      }
      if (!isRetriablePresignError(error) || attempt >= PRESIGN_MAX_ATTEMPTS) {
        break;
      }
      await new Promise((r) => setTimeout(r, putRetryDelayMs(attempt)));
    }
  }
  if (lastError && !isRetriablePresignError(lastError)) {
    throw lastError;
  }
  return null;
}

/**
 * Upload média DM **direct vers Cloudflare R2** via URL pré-signée — même mécanisme que `create.tsx`.
 *
 * **Web** : retourne `null` — le navigateur ne peut pas PUT vers `*.r2.cloudflarestorage.com`
 * sans CORS bucket R2 ; le caller retombe sur l’upload multipart via le backend Express.
 *
 * **Android/iOS** : voie principale (FileSystem.uploadAsync) — pas de multipart axios RN.
 */
export async function uploadDmMediaViaPresignedR2(input: {
  uri: string;
  fileName: string;
  mimeType: string;
  kind: DmUploadKind;
}): Promise<{ mediaUrl: string } | null> {
  if (Platform.OS === 'web') return null;

  const contentType = normalizeDmUploadMime(input.mimeType, input.kind, input.fileName);
  const ext =
    String(input.fileName.split('.').pop() || '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 8) || (input.kind === 'video' ? 'mp4' : input.kind === 'audio' ? 'm4a' : 'jpg');

  let lastPutError: unknown;
  for (let putAttempt = 1; putAttempt <= PUT_MAX_ATTEMPTS; putAttempt += 1) {
    const presignData = await requestDmPresign({ ...input, mimeType: contentType });
    if (!presignData) return null;

    const uploadUri = await copyNativeUriToCacheForDmUpload(input.uri, ext);
    try {
      const putRes = await FileSystem.uploadAsync(presignData.uploadUrl, uploadUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });
      if (putRes.status >= 200 && putRes.status < 300) {
        return { mediaUrl: presignData.fileUrl };
      }
      throw new Error(`DM_R2_PUT_${putRes.status}`);
    } catch (error) {
      lastPutError = error;
      if (!isRetriablePutError(error) || putAttempt >= PUT_MAX_ATTEMPTS) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, putRetryDelayMs(putAttempt)));
    }
  }
  throw lastPutError ?? new Error('DM_R2_PUT_FAILED');
}
