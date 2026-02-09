/**
 * Hook pour intégration Agora RTC (live stream).
 * Utilise le token retourné par GET /api/live/:id/token?role=host|audience.
 * Si appId/channel sont absents (backend sans Agora), pas d'init RTC.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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
 */
export function useAgoraHost(tokenData, videoContainerRef) {
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [error, setError] = useState(null);
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
    } catch (e) {
      console.warn('Agora leave error', e);
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
        await client.setClientRole('host');

        const [audioTrack, videoTrack] = await RTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          [audioTrack, videoTrack].forEach((t) => t.close());
          return;
        }
        tracksRef.current = [audioTrack, videoTrack];
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        await client.publish([audioTrack, videoTrack]);
        if (cancelled) return;
        const container = videoContainerRef?.current;
        if (container && videoTrack) {
          videoTrack.play(container, { mirror: true });
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Agora init failed');
        console.warn('Agora host error', e);
      }
    })();
    return () => {
      cancelled = true;
      leave();
    };
  }, [tokenData?.appId, tokenData?.channel, tokenData?.token, tokenData?.uid]);

  return { localVideoTrack, localAudioTrack, error, leave };
}

/**
 * Audience: souscrit au stream distant. Retourne { remoteVideoTrack, error, leave }.
 * @param {Object} tokenData - { token, appId, channel, uid } depuis api.live.getStreamToken(id, 'audience')
 * @param {React.RefObject} videoContainerRef - élément DOM où jouer la vidéo du créateur
 */
export function useAgoraAudience(tokenData, videoContainerRef) {
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
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
            setRemoteVideoTrack(user.videoTrack);
            setTimeout(() => {
              if (videoContainerRef?.current && !cancelled) user.videoTrack.play(videoContainerRef.current);
            }, 50);
          }
          if (mediaType === 'audio' && user.audioTrack) {
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
  }, [tokenData?.appId, tokenData?.channel, tokenData?.token, tokenData?.uid]);

  return { remoteVideoTrack, error, leave };
}
