import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, StyleProp, ViewStyle, Dimensions } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { IRtcEngine, IRtcEngineEventHandler } from 'react-native-agora';
import agoraLiveService from '../services/agoraLiveService';
import type { LiveVideoQuality } from '../live/liveVideoQuality';
import { getLiveEncoderDimensions } from '../live/liveVideoQuality';
import { networkTierFromNetInfo, resolveEffectiveLiveQuality } from '../live/netInfoLiveQuality';

export type AgoraLiveRole = 'host' | 'audience';

export type AgoraRemoteGridProps = {
  style?: StyleProp<ViewStyle>;
  /** Si omis : utilise les flux distants courants (ex. co-hosts côté hôte). */
  uids?: number[];
  /** Nombre max de tuiles (défaut 5 : CDC co-hosts). */
  maxCells?: number;
};

export function useAgoraLiveRtc(opts: {
  liveId: string | null;
  role: AgoraLiveRole;
  enabled: boolean;
  muted?: boolean;
  /** Incrémenter à chaque appui sur « inverser la caméra » (host). */
  cameraFlipNonce?: number;
  /** Qualité : `auto` suit le réseau (NetInfo) → 360p / 540p / 720p. */
  videoQuality?: LiveVideoQuality;
  /** CDC 6.2 — Beauté / lissage visage (SDK vidéo si l’appareil le supporte). */
  beautyEnabled?: boolean;
}) {
  const { liveId, role, enabled, muted = false, cameraFlipNonce = 0, videoQuality = 'auto', beautyEnabled = false } = opts;
  const [agoraError, setAgoraError] = useState<string | null>(null);
  const [agoraJoined, setAgoraJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [netState, setNetState] = useState<NetInfoState | null>(null);
  const engineRef = useRef<IRtcEngine | null>(null);
  const handlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const screenShareOnRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void NetInfo.fetch().then((s) => {
      if (mounted) setNetState(s);
    });
    const unsub = NetInfo.addEventListener((s) => setNetState(s));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const effectiveQuality = useMemo((): LiveVideoQuality => {
    if (Platform.OS === 'web') return videoQuality;
    const tier = networkTierFromNetInfo(netState);
    return resolveEffectiveLiveQuality(videoQuality, tier);
  }, [videoQuality, netState]);

  useEffect(() => {
    if (!enabled || !liveId || Platform.OS === 'web') {
      setAgoraJoined(false);
      setRemoteUids([]);
      setAgoraError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const mod = await import('react-native-agora');
        const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = mod;

        const joinPayload =
          role === 'host' ? await agoraLiveService.joinAsHost(liveId) : await agoraLiveService.joinAsViewer(liveId);

        if (cancelled) return;
        if (!joinPayload) {
          setAgoraError(
            'La diffusion vidéo n’est pas disponible. Réessayez ou vérifiez votre connexion.',
          );
          return;
        }

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({ appId: joinPayload.appId });
        engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
        engine.enableAudio();
        engine.enableVideo();
        engine.setDefaultAudioRouteToSpeakerphone(true);

        const isHost = role === 'host';
        if (isHost) {
          engine.startPreview();
        }

        const eventHandler: IRtcEngineEventHandler = {
          onJoinChannelSuccess() {
            if (cancelled) return;
            setAgoraJoined(true);
            setAgoraError(null);
            setRemoteUids([]);
          },
          onError() {
            if (cancelled) return;
            setAgoraError('Erreur de connexion vidéo. Réessayez.');
          },
          onUserJoined(_connection, uid) {
            if (cancelled || uid == null) return;
            setRemoteUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
          },
          onUserOffline(_connection, uid) {
            setRemoteUids((prev) => prev.filter((x) => x !== uid));
          },
          onFirstRemoteVideoDecoded(_connection, uid) {
            if (cancelled || uid == null) return;
            setRemoteUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
          },
        };

        engine.registerEventHandler(eventHandler);
        handlerRef.current = eventHandler;

        const options = {
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
          publishCameraTrack: isHost,
          publishMicrophoneTrack: isHost,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        };

        engine.joinChannel(joinPayload.token, joinPayload.channel, joinPayload.uid, options);
      } catch (e) {
        if (!cancelled) {
          setAgoraError(
            (e as Error)?.message?.includes('Agora') || (e as Error)?.message?.includes('agora')
              ? 'Module de diffusion vidéo indisponible sur cet appareil.'
              : ((e as Error)?.message ?? 'Impossible d’ouvrir la caméra pour le live.'),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      const handler = handlerRef.current;
      if (engine && handler) {
        try {
          engine.unregisterEventHandler(handler);
        } catch {
          /* ignore */
        }
      }
      try {
        engine?.leaveChannel();
        engine?.release();
      } catch {
        /* ignore */
      }
      engineRef.current = null;
      handlerRef.current = null;
      screenShareOnRef.current = false;
      setAgoraJoined(false);
      setRemoteUids([]);
    };
  }, [enabled, liveId, role]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined || role !== 'host' || Platform.OS === 'web') return;
    if (effectiveQuality === 'auto') return;
    void (async () => {
      try {
        const dims = getLiveEncoderDimensions(effectiveQuality);
        (engine as unknown as { setVideoEncoderConfiguration: (c: object) => void }).setVideoEncoderConfiguration({
          dimensions: { width: dims.width, height: dims.height },
          frameRate: 15,
          bitrate: dims.bitrate,
        });
      } catch {
        /* SDK indisponible ou version différente */
      }
    })();
  }, [agoraJoined, role, effectiveQuality]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined || role !== 'audience' || remoteUids.length === 0 || Platform.OS === 'web') return;
    void (async () => {
      try {
        const mod = (await import('react-native-agora')) as Record<string, unknown>;
        const VST = mod.VideoStreamType as Record<string, number> | undefined;
        const low = VST?.VideoStreamLow ?? VST?.VIDEO_STREAM_LOW ?? 1;
        const high = VST?.VideoStreamHigh ?? VST?.VIDEO_STREAM_HIGH ?? 0;
        const streamType = effectiveQuality === '360p' ? low : high;
        for (const uid of remoteUids) {
          try {
            (engine as unknown as { setRemoteVideoStreamType: (u: number, t: number) => void }).setRemoteVideoStreamType(
              uid,
              streamType,
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [agoraJoined, role, remoteUids, effectiveQuality]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined) return;
    try {
      engine.muteLocalAudioStream(!!muted);
    } catch {
      /* ignore */
    }
  }, [muted, agoraJoined]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined || role !== 'host' || cameraFlipNonce === 0) return;
    try {
      engine.switchCamera();
    } catch {
      /* ignore */
    }
  }, [cameraFlipNonce, agoraJoined, role]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !agoraJoined || role !== 'host' || Platform.OS === 'web') return;
    try {
      const fn = (
        engine as unknown as {
          setBeautyEffectOptions?: (enabled: boolean, options: Record<string, number>) => number;
        }
      ).setBeautyEffectOptions;
      if (typeof fn !== 'function') return;
      if (beautyEnabled) {
        fn.call(engine, true, {
          lighteningContrastLevel: 1,
          lighteningLevel: 0.65,
          smoothnessLevel: 0.55,
          rednessLevel: 0.12,
          sharpnessLevel: 0.35,
        });
      } else {
        fn.call(engine, false, {});
      }
    } catch {
      /* SDK / version */
    }
  }, [beautyEnabled, agoraJoined, role]);

  const AgoraLocalView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web' || role !== 'host') return null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: 0 }} />;
    },
    [role]
  );

  const primaryRemote = remoteUids[0] ?? null;

  const AgoraRemoteView = useCallback(
    ({ style }: { style?: StyleProp<ViewStyle> }) => {
      if (Platform.OS === 'web') return <View style={style as ViewStyle} />;
      if (primaryRemote == null) return <View style={style as ViewStyle} />;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      return <RtcSurfaceView style={style} canvas={{ uid: primaryRemote }} />;
    },
    [primaryRemote]
  );

  /**
   * A — Partage d’écran (Agora). Android 5+ / iOS 12+ ; iOS peut afficher le sélecteur ReplayKit si disponible.
   */
  const toggleScreenShare = useCallback(async (): Promise<{ ok: boolean; on?: boolean; message?: string }> => {
    if (Platform.OS === 'web' || role !== 'host') {
      return { ok: false, message: "Partage d'écran : application native (hôte) uniquement." };
    }
    const engine = engineRef.current;
    if (!engine || !agoraJoined) {
      return { ok: false, message: 'Connectez-vous au live avant de partager l’écran.' };
    }
    const next = !screenShareOnRef.current;
    try {
      const mod = (await import('react-native-agora')) as Record<string, unknown>;
      const ChannelMediaOptions = mod.ChannelMediaOptions as (new () => {
        publishCameraTrack?: boolean;
        publishMicrophoneTrack?: boolean;
        publishScreenCaptureVideo?: boolean;
        publishScreenCaptureAudio?: boolean;
      }) | undefined;
      const mkOpts = () => (ChannelMediaOptions ? new ChannelMediaOptions() : ({} as Record<string, boolean>));

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
          (engine as unknown as { setScreenCaptureScenario?: (s: number) => number }).setScreenCaptureScenario?.(
            Scenario as number,
          );
        } catch {
          /* ignore */
        }
        const captureParams = {
          dimensions: { width: 720, height: 1280 },
          frameRate: 12,
          bitrate: 1200,
          captureAudio: false,
          captureVideo: true,
        };
        const rStart = (engine as unknown as { startScreenCapture: (p: object) => number }).startScreenCapture(
          captureParams,
        );
        if (typeof rStart === 'number' && rStart !== 0) {
          return { ok: false, message: `Capture écran refusée (code ${rStart}). Permissions / Android 5+ requis.` };
        }
        const pub = mkOpts();
        pub.publishCameraTrack = false;
        pub.publishMicrophoneTrack = true;
        pub.publishScreenCaptureVideo = true;
        pub.publishScreenCaptureAudio = false;
        const rUp = (engine as unknown as { updateChannelMediaOptions: (o: object) => number }).updateChannelMediaOptions(
          pub,
        );
        if (typeof rUp === 'number' && rUp !== 0) {
          try {
            (engine as unknown as { stopScreenCapture: () => number }).stopScreenCapture();
          } catch {
            /* ignore */
          }
          return { ok: false, message: `Publication écran refusée (code ${rUp}).` };
        }
        try {
          (engine as unknown as { stopPreview: () => number }).stopPreview();
        } catch {
          /* ignore */
        }
      } else {
        try {
          (engine as unknown as { stopScreenCapture: () => number }).stopScreenCapture();
        } catch {
          /* ignore */
        }
        const pub = mkOpts();
        pub.publishCameraTrack = true;
        pub.publishMicrophoneTrack = true;
        pub.publishScreenCaptureVideo = false;
        pub.publishScreenCaptureAudio = false;
        (engine as unknown as { updateChannelMediaOptions: (o: object) => number }).updateChannelMediaOptions(pub);
        try {
          (engine as unknown as { startPreview: () => number }).startPreview();
        } catch {
          /* ignore */
        }
      }
      screenShareOnRef.current = next;
      return { ok: true, on: next };
    } catch (e) {
      return { ok: false, message: (e as Error)?.message || 'Erreur partage écran' };
    }
  }, [agoraJoined, role]);

  const AgoraRemoteGrid = useCallback(
    ({ style, uids, maxCells = 5 }: AgoraRemoteGridProps) => {
      const list = (uids ?? remoteUids).slice(0, Math.max(1, Math.min(6, maxCells)));
      if (Platform.OS === 'web' || list.length === 0) return null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RtcSurfaceView } = require('react-native-agora') as typeof import('react-native-agora');
      const w = Dimensions.get('window').width;
      const gap = 6;
      const pad = 8;
      const inner = w - pad * 2;
      /** 1 invité : tuile large type 1+1 ; 2+ : grille 2×2 (CDC TikTok-like). */
      const cellW = list.length === 1 ? inner : (inner - gap) / 2;
      const cellH = Math.round(list.length === 1 ? inner * 0.52 : cellW * 1.12);
      return (
        <View
          style={[
            {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap,
              justifyContent: 'center',
              paddingHorizontal: pad,
            },
            style as ViewStyle,
          ]}
        >
          {list.map((uid) => (
            <RtcSurfaceView
              key={uid}
              style={{ width: cellW, height: cellH, borderRadius: 10, overflow: 'hidden' }}
              canvas={{ uid }}
            />
          ))}
        </View>
      );
    },
    [remoteUids]
  );

  return { agoraJoined, agoraError, remoteUids, AgoraLocalView, AgoraRemoteView, AgoraRemoteGrid, toggleScreenShare };
}
