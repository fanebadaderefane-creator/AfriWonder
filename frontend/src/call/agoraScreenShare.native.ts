import { Platform } from 'react-native';
import type { IRtcEngine } from 'react-native-agora';

export type AgoraScreenShareResult = { ok: boolean; on?: boolean; message?: string };

/** Partage d’écran Agora RTC (DM / live) — Android 5+ / iOS ReplayKit si dispo. */
export async function toggleAgoraScreenShare(
  engine: IRtcEngine | null,
  currentlyOn: boolean,
  opts: { hadCameraPreview: boolean },
): Promise<AgoraScreenShareResult> {
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Partage d’écran disponible sur l’application mobile.' };
  }
  if (!engine) {
    return { ok: false, message: 'Connectez-vous à l’appel avant de partager l’écran.' };
  }
  const next = !currentlyOn;
  try {
    const mod = (await import('react-native-agora')) as Record<string, unknown>;
    const ChannelMediaOptions = mod.ChannelMediaOptions as (new () => {
      publishCameraTrack?: boolean;
      publishMicrophoneTrack?: boolean;
      publishScreenCaptureVideo?: boolean;
      publishScreenCaptureAudio?: boolean;
    }) | undefined;
    const mkOpts = () => (ChannelMediaOptions ? new ChannelMediaOptions() : ({} as Record<string, boolean>));
    const eng = engine as unknown as {
      setScreenCaptureScenario?: (s: number) => number;
      startScreenCapture: (p: object) => number;
      stopScreenCapture: () => number;
      updateChannelMediaOptions: (o: object) => number;
      stopPreview?: () => number;
      startPreview?: () => number;
    };

    if (next) {
      if (Platform.OS === 'ios') {
        const picker = (mod as { showRPSystemBroadcastPickerView?: (p?: { preferFrameRate?: number }) => void })
          .showRPSystemBroadcastPickerView;
        if (typeof picker === 'function') {
          try {
            picker.call(mod, { preferFrameRate: 15 });
          } catch {
            /* ReplayKit optionnel */
          }
        }
      }
      const Scenario =
        (mod.ScreenScenarioType as Record<string, number> | undefined)?.ScreenScenarioBroadcast ??
        (mod.ScreenScenarioType as Record<string, number> | undefined)?.ScreenScenarioGaming ??
        2;
      try {
        eng.setScreenCaptureScenario?.(Scenario as number);
      } catch {
        /* ignore */
      }
      const rStart = eng.startScreenCapture({
        dimensions: { width: 720, height: 1280 },
        frameRate: 12,
        bitrate: 1200,
        captureAudio: false,
        captureVideo: true,
      });
      if (typeof rStart === 'number' && rStart !== 0) {
        return { ok: false, message: `Capture écran refusée (code ${rStart}). Autorisez l’accès à l’écran.` };
      }
      const pub = mkOpts();
      pub.publishCameraTrack = false;
      pub.publishMicrophoneTrack = true;
      pub.publishScreenCaptureVideo = true;
      pub.publishScreenCaptureAudio = false;
      const rUp = eng.updateChannelMediaOptions(pub);
      if (typeof rUp === 'number' && rUp !== 0) {
        try {
          eng.stopScreenCapture();
        } catch {
          /* ignore */
        }
        return { ok: false, message: `Publication écran refusée (code ${rUp}).` };
      }
      try {
        eng.stopPreview?.();
      } catch {
        /* ignore */
      }
    } else {
      try {
        eng.stopScreenCapture();
      } catch {
        /* ignore */
      }
      const pub = mkOpts();
      pub.publishCameraTrack = opts.hadCameraPreview;
      pub.publishMicrophoneTrack = true;
      pub.publishScreenCaptureVideo = false;
      pub.publishScreenCaptureAudio = false;
      eng.updateChannelMediaOptions(pub);
      if (opts.hadCameraPreview) {
        try {
          eng.startPreview?.();
        } catch {
          /* ignore */
        }
      }
    }
    return { ok: true, on: next };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Erreur partage écran' };
  }
}
