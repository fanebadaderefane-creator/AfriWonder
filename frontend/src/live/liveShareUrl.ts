import { getBackendOrigin } from '../config/backendBase';

/** URL web partageable pour un live (deep link universel côté prod à ajuster). */
export function buildLiveShareUrl(liveId: string): string {
  const o = getBackendOrigin()?.replace(/\/$/, '') || '';
  if (!o) return `afriwonder://live/${encodeURIComponent(liveId)}`;
  return `${o}/live/${encodeURIComponent(liveId)}`;
}
