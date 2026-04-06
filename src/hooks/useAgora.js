/**
 * Hook pour intégration Agora RTC (live stream).
 * Utilise le token retourné par GET /api/live/:id/token?role=host|audience.
 * Si appId/channel sont absents (backend sans Agora), pas d'init RTC.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';

let AgoraRTC = null;
const loadAgora = () => {
  if (AgoraRTC) return Promise.resolve(AgoraRTC);
  return import('agora-rtc-sdk-ng').then((m) => {
    AgoraRTC = m.default;
    return AgoraRTC;
  });
};

/**
 * Host: publie caméra + micro. Retourne { localVideoTrack, localAudioTrack, error, leave }.
 * @param {Object} tokenData - { token, appId, channel, uid } depuis api.live.getStreamToken(id, 'host')
 * @param {React.RefObject} videoContainerRef - élément DOM où jouer la vidéo locale (host)
 * @param {Object} options
 */
export function useAgoraHost(tokenData, videoContainerRef, options = {}) {
  const dataSaverMode = !!options.dataSaverMode;
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [error, setError] = useState(null);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const clientRef = useRef(null);
  const tracksRef = useRef([]);

  const leave = useCallback(async () => {
    try {
      const client = clientRef.current;
      if (client) {
        await client.unpublish(tracksRef.current).catch(() => {});
        await client.leave();
        client.removeAllListeners();
        clientRef.current = null;
      }
      tracksRef.current.forEach((t) => {
        try { t.close(); } catch (_) {}
      });
      tracksRef.current = [];
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setAudioOnlyMode(false);
    } catch (e) {
      console.warn('Agora leave error', e);
    }
  }, []);

  const retry = useCallback(async () => {
    setError(null);
    await leave();
    await new Promise((r) => setTimeout(r, 500));
    setRetryKey((k) => k + 1);
  }, [leave]);

  useEffect(() => {
    if (!tokenData?.appId || !tokenData?.channel || !tokenData?.token) return;
    const appId = tokenData.appId;
    const channel = tokenData.channel;
    const token = tokenData.token;
    const uid = tokenData.uid ?? 0;

    let cancelled = false;
    (async () => {
      setError(null);
      setAudioOnlyMode(false);
      try {
        const RTC = await loadAgora();
        const client = RTC.createClient({ mode: 'live', codec: 'vp8' });
        clientRef.current = client;
        await client.join(appId, channel, token, uid);
        await client.setClientRole('host');

        let audioTrack = null;
        let videoTrack = null;

        let renewTimer = null;
        let reconnectAttempts = 0;

        try {
          [audioTrack, videoTrack] = await RTC.createMicrophoneAndCameraTracks(
            {
              encoderConfig: {
                sampleRate: 16000,
                stereo: false,
                bitrate: 48,
              },
              AEC: true,
              ANS: true,
              AGC: true,
            },
            {
              encoderConfig: dataSaverMode ? '180p_4' : '480p_8',
              optimizationMode: 'motion',
            }
          );
        } catch (deviceErr) {
          const isDeviceNotFound = deviceErr?.message?.includes('DEVICE_NOT_FOUND') || deviceErr?.code === 'DEVICE_NOT_FOUND';
          if (isDeviceNotFound) {
            try {
              audioTrack = await RTC.createMicrophoneTrack();
              if (cancelled) { audioTrack?.close(); return; }
              tracksRef.current = [audioTrack];
              setLocalAudioTrack(audioTrack);
              setLocalVideoTrack(null);
              await client.publish([audioTrack]);
              if (!cancelled) setAudioOnlyMode(true);
              return;
            } catch (audioErr) {
              throw deviceErr;
            }
          }
          throw deviceErr;
        }

        if (cancelled) {
          [audioTrack, videoTrack].forEach((t) => t?.close());
          return;
        }
        tracksRef.current = [audioTrack, videoTrack];
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        await client.publish([audioTrack, videoTrack]);
        if (cancelled) return;

        if (tokenData?.expireTime && tokenData?.streamId) {
          const renewIn = (tokenData.expireTime * 1000) - Date.now() - 2 * 60 * 1000;
          if (renewIn > 0) {
            renewTimer = window.setTimeout(async () => {
              if (cancelled) return;
              try {
                const newData = await api.live.getStreamToken(tokenData.streamId, 'host');
                if (clientRef.current?.connectionState === 'CONNECTED' && newData?.token) {
                  await clientRef.current.renewToken(newData.token);
                  console.info('[Agora] Token renouvelé avec succès');
                }
              } catch (e) {
                console.warn('[Agora] Échec renouvellement token', e);
              }
            }, Math.max(renewIn, 0));
          }
        }

        const container = videoContainerRef?.current;
        if (container && videoTrack) {
          videoTrack.play(container, { mirror: true });
        }

        client.on('connection-state-change', async (cur) => {
          if (cancelled) return;
          if (cur === 'CONNECTED') {
            reconnectAttempts = 0;
            return;
          }
          if (cur === 'DISCONNECTED' || cur === 'ABORTED') {
            reconnectAttempts += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 16000);
            console.warn(`[Agora] Déconnecté. Tentative ${reconnectAttempts} dans ${delay}ms`);
            window.setTimeout(() => {
              if (!cancelled) setRetryKey((k) => k + 1);
            }, delay);
          }
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Agora init failed');
        console.warn('Agora host error', e);
      }
    })();
    return () => {
      cancelled = true;
      leave();
    };
  }, [tokenData?.appId, tokenData?.channel, tokenData?.token, tokenData?.uid, tokenData?.expireTime, tokenData?.streamId, retryKey, dataSaverMode]);

  return { localVideoTrack, localAudioTrack, error, audioOnlyMode, leave, retry };
}

/** Agora stream type: 0 = high, 1 = low (160p/audio) — CDC mode données réduites */
const VIDEO_STREAM_LOW = 1;

/**
 * Audience: souscrit au stream distant. Retourne { remoteVideoTrack, error, leave }.
 * @param {Object} tokenData - { token, appId, channel, uid } depuis api.live.getStreamToken(id, 'audience')
 * @param {React.RefObject} videoContainerRef - élément DOM où jouer la vidéo du créateur
 * @param {Object} options - { dataSaverMode: boolean } CDC mode données réduites → qualité 160p
 */
export function useAgoraAudience(tokenData, videoContainerRef, options = {}) {
  const dataSaverMode = !!options.dataSaverMode;
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  const leave = useCallback(async () => {
    try {
      const client = clientRef.current;
      if (client) {
        await client.leave();
        client.removeAllListeners();
        clientRef.current = null;
      }
      setRemoteVideoTrack(null);
      setRemoteAudioTrack(null);
    } catch (e) {
      console.warn('Agora audience leave error', e);
    }
  }, []);

  useEffect(() => {
    if (!tokenData?.appId || !tokenData?.channel || !tokenData?.token) return;
    const appId = tokenData.appId;
    const channel = tokenData.channel;
    const token = tokenData.token;
    const uid = tokenData.uid ?? 0;

    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const RTC = await loadAgora();
        const client = RTC.createClient({ mode: 'live', codec: 'vp8' });
        clientRef.current = client;
        await client.join(appId, channel, token, uid);
        await client.setClientRole('audience');

        client.on('user-published', async (user, mediaType) => {
          if (cancelled) return;
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && user.videoTrack) {
            if (dataSaverMode && client.setRemoteVideoStreamType) {
              try {
                client.setRemoteVideoStreamType(user.uid, VIDEO_STREAM_LOW);
              } catch (_) {}
            }
            setRemoteVideoTrack(user.videoTrack);
            setTimeout(() => {
              if (videoContainerRef?.current && !cancelled) user.videoTrack.play(videoContainerRef.current);
            }, 50);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            setRemoteAudioTrack(user.audioTrack);
            user.audioTrack.play();
          }
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Agora init failed');
        console.warn('Agora audience error', e);
      }
    })();
    return () => {
      cancelled = true;
      leave();
    };
  }, [tokenData?.appId, tokenData?.channel, tokenData?.token, tokenData?.uid, dataSaverMode]);

  return { remoteVideoTrack, remoteAudioTrack, error, leave };
}

/**
 * Appel groupe — mode Agora « rtc » (communication), chaque participant publie (token rôle host / publisher).
 * @param {Object|null|undefined} tokenData - { token, appId, channel, uid }
 * @param {React.RefObject} localVideoRef - conteneur vidéo locale (ignoré si audioOnly)
 * @param {{ audioOnly?: boolean }} options
 */
export function useAgoraGroupCall(tokenData, localVideoRef, options = {}) {
  const audioOnly = !!options.audioOnly;
  const [error, setError] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasCameraTrack, setHasCameraTrack] = useState(false);
  const clientRef = useRef(null);
  const tracksRef = useRef([]);
  const micTrackRef = useRef(null);
  const camTrackRef = useRef(null);

  const leave = useCallback(async () => {
    try {
      const client = clientRef.current;
      if (client) {
        await client.unpublish(tracksRef.current).catch(() => {});
        await client.leave();
        client.removeAllListeners();
        clientRef.current = null;
      }
      tracksRef.current.forEach((t) => {
        try {
          t.close();
        } catch (_) {
          /* ignore */
        }
      });
      tracksRef.current = [];
      micTrackRef.current = null;
      camTrackRef.current = null;
      setRemoteUsers([]);
      setMicOn(true);
      setCamOn(true);
      setHasCameraTrack(false);
    } catch (e) {
      console.warn('Agora group leave error', e);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const t = micTrackRef.current;
    if (!t || typeof t.setEnabled !== 'function') return;
    try {
      const next = !t.enabled;
      t.setEnabled(next);
      setMicOn(next);
    } catch (_) {
      /* ignore */
    }
  }, []);

  const toggleCam = useCallback(() => {
    const t = camTrackRef.current;
    if (!t || typeof t.setEnabled !== 'function') return;
    try {
      const next = !t.enabled;
      t.setEnabled(next);
      setCamOn(next);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!tokenData?.appId || !tokenData?.channel || !tokenData?.token) {
      setRemoteUsers([]);
      setHasCameraTrack(false);
      return undefined;
    }

    let cancelled = false;

    const upsertRemote = (uid, patch) => {
      setRemoteUsers((prev) => {
        const i = prev.findIndex((r) => r.uid === uid);
        if (i === -1) return [...prev, { uid, ...patch }];
        const next = [...prev];
        next[i] = { ...next[i], ...patch };
        return next;
      });
    };

    (async () => {
      setError(null);
      setMicOn(true);
      setCamOn(true);
      setHasCameraTrack(false);
      micTrackRef.current = null;
      camTrackRef.current = null;
      try {
        const RTC = await loadAgora();
        const client = RTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid ?? 0);

        const publishList = [];
        if (audioOnly) {
          const mic = await RTC.createMicrophoneTrack();
          if (cancelled) {
            mic.close();
            return;
          }
          micTrackRef.current = mic;
          tracksRef.current = [mic];
          publishList.push(mic);
        } else {
          try {
            const [mic, cam] = await RTC.createMicrophoneAndCameraTracks();
            if (cancelled) {
              mic?.close();
              cam?.close();
              return;
            }
            micTrackRef.current = mic;
            camTrackRef.current = cam;
            tracksRef.current = [mic, cam];
            publishList.push(mic, cam);
            setHasCameraTrack(true);
            const container = localVideoRef?.current;
            if (container && cam) {
              cam.play(container, { mirror: true });
            }
          } catch (deviceErr) {
            const isDeviceNotFound =
              deviceErr?.message?.includes('DEVICE_NOT_FOUND') || deviceErr?.code === 'DEVICE_NOT_FOUND';
            if (isDeviceNotFound) {
              const mic = await RTC.createMicrophoneTrack();
              if (cancelled) {
                mic.close();
                return;
              }
              micTrackRef.current = mic;
              camTrackRef.current = null;
              tracksRef.current = [mic];
              publishList.push(mic);
              setHasCameraTrack(false);
            } else {
              throw deviceErr;
            }
          }
        }

        await client.publish(publishList);

        client.on('user-published', async (user, mediaType) => {
          if (cancelled) return;
          try {
            await client.subscribe(user, mediaType);
          } catch (subErr) {
            console.warn('Agora group subscribe failed', subErr);
            return;
          }
          const uid = user.uid;
          if (mediaType === 'video' && user.videoTrack) {
            upsertRemote(uid, { videoTrack: user.videoTrack });
          }
          if (mediaType === 'audio' && user.audioTrack) {
            try {
              user.audioTrack.play();
            } catch (_) {
              /* ignore */
            }
            upsertRemote(uid, { audioTrack: user.audioTrack });
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (cancelled) return;
          const uid = user.uid;
          setRemoteUsers((prev) => {
            const i = prev.findIndex((r) => r.uid === uid);
            if (i === -1) return prev;
            const row = { ...prev[i] };
            if (mediaType === 'video') row.videoTrack = null;
            if (mediaType === 'audio') row.audioTrack = null;
            if (!row.videoTrack && !row.audioTrack) return prev.filter((_, j) => j !== i);
            const next = [...prev];
            next[i] = row;
            return next;
          });
        });

        client.on('user-left', (user) => {
          setRemoteUsers((prev) => prev.filter((r) => r.uid !== user.uid));
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Agora group call failed');
        console.warn('Agora group call error', e);
      }
    })();

    return () => {
      cancelled = true;
      leave();
    };
  }, [tokenData?.appId, tokenData?.channel, tokenData?.token, tokenData?.uid, audioOnly, leave]);

  return { error, leave, remoteUsers, micOn, camOn, toggleMic, toggleCam, hasCameraTrack };
}
