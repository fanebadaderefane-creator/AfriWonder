/**
 * AfriWonder — service token Agora pour lives.
 *
 * Contrat backend : `GET /api/live/:id/token?role=host|audience` (auth),
 * monté côté Expo via `apiClient` sur `/api/proxy/live/...`.
 *
 * Prérequis natifs : `react-native-agora` + build de développement (pas Expo Go).
 */

import apiClient from '../api/client';

export interface AgoraTokenResponse {
  token: string;
  appId: string | null;
  channel: string | null;
  uid: number | null;
  expireTime?: number | null;
  streamId?: string;
}

export interface AgoraRtcJoinPayload {
  token: string;
  appId: string;
  channel: string;
  uid: number;
  expireTime?: number | null;
}

export function isAgoraRtcPayload(d: AgoraTokenResponse | null | undefined): d is AgoraRtcJoinPayload {
  return !!d && typeof d.token === 'string' && !!d.appId && typeof d.channel === 'string' && typeof d.uid === 'number';
}

export interface AgoraStreamConfigHint {
  videoEncoderConfig: {
    dimensions: { width: number; height: number };
    frameRate: number;
    bitrate: number;
  };
  channelProfile: 1;
  clientRole: 1 | 2;
}

class AgoraLiveService {
  private appId: string | null = null;

  /**
   * Récupère le token RTC (Agora si `AGORA_*` configuré, sinon token HMAC sans appId).
   * Alias documenté : même handler que `.../token` (compat anciens chemins).
   */
  async getToken(liveId: string, role: 'host' | 'audience'): Promise<AgoraTokenResponse | null> {
    try {
      const res = await apiClient.get(`/live/${encodeURIComponent(liveId)}/token`, { params: { role } });
      const data = (res.data?.data ?? res.data) as AgoraTokenResponse | undefined;
      if (data?.token) {
        if (data.appId) this.appId = data.appId;
        return {
          token: data.token,
          appId: data.appId ?? null,
          channel: data.channel ?? null,
          uid: data.uid ?? null,
          expireTime: data.expireTime ?? undefined,
          streamId: data.streamId,
        };
      }
      return null;
    } catch (e) {
      console.warn('[Agora] Token fetch failed', e);
      return null;
    }
  }

  getStreamConfig(isHost: boolean): AgoraStreamConfigHint {
    return {
      videoEncoderConfig: {
        dimensions: { width: isHost ? 720 : 360, height: isHost ? 1280 : 640 },
        frameRate: isHost ? 30 : 15,
        bitrate: isHost ? 1500 : 600,
      },
      channelProfile: 1 as const,
      clientRole: isHost ? 1 : 2,
    };
  }

  async joinAsViewer(liveId: string): Promise<(AgoraRtcJoinPayload & { config: AgoraStreamConfigHint }) | null> {
    const tokenData = await this.getToken(liveId, 'audience');
    if (!isAgoraRtcPayload(tokenData)) return null;
    return { ...tokenData, config: this.getStreamConfig(false) };
  }

  async joinAsHost(liveId: string): Promise<(AgoraRtcJoinPayload & { config: AgoraStreamConfigHint }) | null> {
    const tokenData = await this.getToken(liveId, 'host');
    if (!isAgoraRtcPayload(tokenData)) return null;
    return { ...tokenData, config: this.getStreamConfig(true) };
  }

  /** Même jeton RTC que l’hôte — réservé aux co-hosts acceptés côté API. */
  joinAsCoHost(liveId: string): Promise<(AgoraRtcJoinPayload & { config: AgoraStreamConfigHint }) | null> {
    return this.joinAsHost(liveId);
  }

  async renewToken(liveId: string, role: 'host' | 'audience'): Promise<string | null> {
    const tokenData = await this.getToken(liveId, role);
    return tokenData?.token ?? null;
  }

  get currentAppId() {
    return this.appId;
  }
}

export const agoraLiveService = new AgoraLiveService();
export default agoraLiveService;
