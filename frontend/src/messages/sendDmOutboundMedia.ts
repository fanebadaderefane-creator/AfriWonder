import axios from 'axios';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import { appendBlobOrFileField } from '../screens/messages/messageAttachmentUtils';
import {
  appendDmUploadFile,
  extractUploadedMediaUrl,
  postDmMediaUpload,
  type DmUploadKind,
} from './dmMediaUpload';
import { pinDmMediaFile, releasePinnedDmMedia, verifyReadableNativeFile } from './dmNativeMediaQueue';
import { uploadDmMediaViaPresignedR2 } from './dmDirectR2Upload';
import { tryRefreshAccessToken } from '../api/tokenRefresh';

/** Native 3G/4G Mali : marge pour presign + PUT + POST message. */
export const DM_OUTBOUND_UPLOAD_MAX_ATTEMPTS = Platform.OS === 'web' ? 3 : 4;
const RETRY_DELAY_MS = [0, 1_200, 2_400];

export type DmOutboundKind = 'voice' | 'audio' | 'image' | 'video' | 'document';

export type SendDmOutboundInput = {
  kind: DmOutboundKind;
  localUri: string;
  messageId: string;
  /** Requis en DM 1-1 ; ignoré si `groupId` est défini. */
  recipientId: string;
  conversationId: string;
  /** Fil groupe CDC (`POST /messages/group/:id/send`). */
  groupId?: string;
  content: string;
  fileName?: string;
  mimeType?: string;
};

export type SendDmOutboundResult = {
  serverMessageId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  pinnedUri: string;
};

function uploadKind(kind: DmOutboundKind): DmUploadKind {
  if (kind === 'document') return 'document';
  if (kind === 'video') return 'video';
  if (kind === 'voice' || kind === 'audio') return 'audio';
  return 'image';
}

function messageType(kind: DmOutboundKind): string {
  if (kind === 'document') return 'file';
  if (kind === 'voice' || kind === 'audio') return 'audio';
  return kind;
}

function isRetryableUploadError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    if (!error.response) return true;
    const status = error.response.status;
    return status === 401 || status === 408 || status === 429 || status >= 500;
  }
  const msg = String((error as Error)?.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('unreadable') ||
    msg.includes('empty_url') ||
    msg.includes('not_persisted') ||
    msg.includes('dm_r2_put')
  );
}

async function uploadViaMultipartBackend(
  pinned: { uri: string; fileName: string; mimeType: string },
  kind: DmUploadKind,
): Promise<{ mediaUrl: string; thumbnailUrl?: string }> {
  const formData = new FormData();
  if (kind === 'document') {
    await appendBlobOrFileField(formData, pinned.uri, pinned.fileName, pinned.mimeType, 'document');
  } else {
    await appendDmUploadFile(formData, pinned.uri, 0, kind, {
      mimeType: pinned.mimeType,
      fileName: pinned.fileName,
    });
  }
  const uploadRes = await postDmMediaUpload(kind, formData);
  const { mediaUrl, thumbnailUrl } = extractUploadedMediaUrl(uploadRes.data);
  if (!mediaUrl) throw new Error('DM_MEDIA_UPLOAD_EMPTY_URL');
  return { mediaUrl, thumbnailUrl };
}

function extractSendPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return root;
}

async function warmupBackendIfNeeded(error: unknown): Promise<void> {
  if (!axios.isAxiosError(error) || error.response) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const warmup = require('../api/backendWarmup') as { warmupBackend: () => Promise<boolean> };
    await warmup.warmupBackend();
  } catch {
    /* ignore */
  }
}

async function uploadMediaToStorage(
  pinned: { uri: string; fileName: string; mimeType: string },
  kind: DmUploadKind,
): Promise<{ mediaUrl: string; thumbnailUrl?: string }> {
  /**
   * 1) Native : PUT direct R2 (FileSystem.uploadAsync) — même voie que `create.tsx`.
   *    Web : skip presign (CORS) → multipart backend uniquement.
   */
  try {
    const direct = await uploadDmMediaViaPresignedR2({
      uri: pinned.uri,
      fileName: pinned.fileName,
      mimeType: pinned.mimeType,
      kind,
    });
    if (direct?.mediaUrl) {
      return { mediaUrl: direct.mediaUrl };
    }
  } catch (error) {
    /**
     * Android/iOS : ne pas retomber sur multipart axios (Network Error fréquent).
     * La boucle externe `sendDmOutboundMedia` réessaie presign + PUT.
     */
    if (Platform.OS !== 'web') {
      throw error;
    }
  }

  /** 2) Web, ou native si presign indisponible (503) : multipart via Express → R2 côté serveur. */
  return uploadViaMultipartBackend(pinned, kind);
}

async function uploadAndSendOnce(
  pinned: { uri: string; fileName: string; mimeType: string },
  input: SendDmOutboundInput,
): Promise<SendDmOutboundResult> {
  const kind = uploadKind(input.kind);
  const { mediaUrl, thumbnailUrl } = await uploadMediaToStorage(pinned, kind);

  const sendBody = {
    content: input.content.slice(0, 500),
    type: messageType(input.kind),
    media_url: mediaUrl,
    ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
  };
  const sendRes = input.groupId
    ? await apiClient.post(`/messages/group/${encodeURIComponent(input.groupId)}/send`, sendBody)
    : await apiClient.post('/messages/send', {
        recipientId: input.recipientId,
        ...sendBody,
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      });

  const payload = extractSendPayload(sendRes.data);
  const serverMessageId = String(payload?.id || '').trim();
  const savedMediaUrl = String(payload?.media_url || mediaUrl).trim();
  if (!serverMessageId) {
    throw new Error('DM_SEND_NO_MESSAGE_ID');
  }
  if (!/^https?:\/\//i.test(savedMediaUrl)) {
    throw new Error('DM_SEND_MEDIA_NOT_PERSISTED');
  }
  return {
    serverMessageId,
    mediaUrl: savedMediaUrl,
    thumbnailUrl: typeof payload?.thumbnail_url === 'string' ? payload.thumbnail_url : thumbnailUrl,
    pinnedUri: pinned.uri,
  };
}

/**
 * Pipeline unique Android/iOS : épingle le fichier → vérifie → upload R2 → POST message.
 * Réessais réseau (3×) + warmup backend sur cold start Render.
 */
export async function sendDmOutboundMedia(input: SendDmOutboundInput): Promise<SendDmOutboundResult> {
  if (Platform.OS !== 'web') {
    const readable = await verifyReadableNativeFile(input.localUri);
    if (!readable) {
      throw new Error('DM_MEDIA_FILE_UNREADABLE');
    }
  }

  const pinned = await pinDmMediaFile({
    sourceUri: input.localUri,
    messageId: input.messageId,
    kind: input.kind,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < DM_OUTBOUND_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt] ?? 2_400));
    }
    try {
      const result = await uploadAndSendOnce(pinned, input);
      await releasePinnedDmMedia(input.messageId);
      return result;
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await tryRefreshAccessToken();
      }
      if (!isRetryableUploadError(error) || attempt >= DM_OUTBOUND_UPLOAD_MAX_ATTEMPTS - 1) {
        break;
      }
      await warmupBackendIfNeeded(error);
    }
  }
  throw lastError ?? new Error('DM_MEDIA_SEND_FAILED');
}
