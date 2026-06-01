import type { AxiosInstance } from 'axios';
import type { DmThreadApi } from './dmThreadApi';

/** Marque les messages entrants comme distribués (DM 1-1). */
export async function markThreadDelivered(api: DmThreadApi, client: AxiosInstance): Promise<void> {
  if (!api.conversationId || api.kind !== 'dm') return;
  await client.put(`/messages/${encodeURIComponent(api.conversationId)}/delivered`, {});
}

/** Marque le fil comme lu (DM PUT ou groupe POST). */
export async function markThreadRead(api: DmThreadApi, client: AxiosInstance): Promise<void> {
  if (!api.conversationId) return;
  if (api.readMethod === 'POST') {
    await client.post(api.readPath, {});
  } else {
    await client.put(api.readPath, {});
  }
}

/** Ouverture fil DM : distribué puis lu (parité PWA / backend). */
export async function markThreadOpened(api: DmThreadApi, client: AxiosInstance): Promise<void> {
  if (!api.conversationId) return;
  if (api.kind === 'group') {
    await markThreadRead(api, client);
    return;
  }
  await markThreadDelivered(api, client).catch(() => {
    /* best effort */
  });
  await markThreadRead(api, client);
}

/** Rejoint / quitte la room socket du fil. */
export function joinThreadSocket(api: DmThreadApi, socket: { emit: (e: string, p?: unknown) => void }): void {
  api.socketJoin(socket);
}

export function leaveThreadSocket(api: DmThreadApi, socket: { emit: (e: string, p?: unknown) => void }): void {
  api.socketLeave(socket);
}
