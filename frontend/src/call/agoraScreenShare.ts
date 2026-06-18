/**
 * Fallback TypeScript / Metro : les bundles utilisent
 * `agoraScreenShare.web.ts` (web) ou `.native.ts` (iOS/Android).
 */
export { toggleAgoraScreenShare } from './agoraScreenShare.native';
export type { AgoraScreenShareResult } from './agoraScreenShare.native';
