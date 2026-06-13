import { describe, expect, it } from 'vitest';
import {
  collectTrackIds,
  countLocalTracks,
  dedupeRemoteReceiverTracks,
  isIceConnectionReady,
  isIceStillNegotiating,
  isTrackFromLocalCapture,
  mergeRemoteTrackIntoStream,
  type RemoteStreamUnified,
  canPromoteCallToConnected,
  remoteStreamReadyForConnectedUi,
  shouldBindNativeRemoteStreamUrl,
  shouldMarkCallConnected,
  shouldRefreshNativeRemoteRtcView,
  receiverTracksBindingKey,
  shouldReplaceNativeRemoteMediaStream,
  shouldSyncRemoteReceiverTracks,
  streamHasLiveAudio,
  streamHasLiveVideo,
  streamHasRemoteVideoTrack,
  streamHasRenderableRemoteVideo,
} from './callRemoteMedia';

describe('callRemoteMedia', () => {
  it('isIceConnectionReady détecte connected/completed', () => {
    expect(isIceConnectionReady('connected')).toBe(true);
    expect(isIceConnectionReady('completed')).toBe(true);
    expect(isIceConnectionReady('checking')).toBe(false);
    expect(isIceStillNegotiating('checking')).toBe(true);
    expect(isIceStillNegotiating('connected')).toBe(false);
  });

  it('shouldMarkCallConnected — vocal natif : ICE connected sans piste live', () => {
    expect(
      shouldMarkCallConnected({
        isVideo: false,
        role: 'receiver',
        hasRemoteDescription: true,
        iceConnectionState: 'connected',
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(true);
  });

  it('remoteStreamReadyForConnectedUi — ICE connected vocal sans piste live', () => {
    expect(
      remoteStreamReadyForConnectedUi({
        isVideo: false,
        hasRemoteDescription: true,
        iceConnectionState: 'connected',
        stream: { getAudioTracks: () => [] },
      }),
    ).toBe(true);
  });

  it('streamHasLiveAudio détecte une piste audio active', () => {
    expect(
      streamHasLiveAudio({
        getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
      }),
    ).toBe(true);
    expect(
      streamHasLiveAudio({
        getAudioTracks: () => [{ enabled: false, readyState: 'live' }],
      }),
    ).toBe(false);
  });

  it('streamHasLiveVideo détecte une piste vidéo active', () => {
    expect(
      streamHasLiveVideo({
        getVideoTracks: () => [{ enabled: true, readyState: 'live' }],
      }),
    ).toBe(true);
    expect(
      streamHasLiveVideo({
        getVideoTracks: () => [{ enabled: true, readyState: 'ended' }],
      }),
    ).toBe(false);
  });

  it('shouldMarkCallConnected exige audio/vidéo live et pas de faux positif `new`', () => {
    expect(shouldMarkCallConnected({ stream: null })).toBe(false);
    expect(shouldMarkCallConnected({ stream: undefined })).toBe(false);
    expect(
      shouldMarkCallConnected({
        role: 'caller',
        peerAccepted: false,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        role: 'caller',
        peerAccepted: true,
        hasRemoteDescription: false,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        trackKind: 'video',
        stream: { getAudioTracks: () => [] },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        peerConnectionState: 'connected',
        hasRemoteDescription: true,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'new' }],
          getVideoTracks: () => [{ enabled: true, readyState: 'new' }],
        },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        remoteSdpHasVideo: false,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
          getVideoTracks: () => [],
        },
      }),
    ).toBe(true);
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        stream: {
          getAudioTracks: () => [],
          getVideoTracks: () => [{ enabled: true, readyState: 'live' }],
        },
      }),
    ).toBe(true);
    expect(
      shouldMarkCallConnected({
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(true);
    expect(
      shouldMarkCallConnected({
        isVideo: false,
        peerConnectionState: 'connected',
        hasRemoteDescription: true,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'new' }],
        },
      }),
    ).toBe(true);
    expect(
      shouldMarkCallConnected({
        isVideo: false,
        hasRemoteDescription: true,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'new' }],
        },
      }),
    ).toBe(false);
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
          getVideoTracks: () => [{ enabled: true, readyState: 'live' }],
        },
      }),
    ).toBe(true);
  });

  it('mergeRemoteTrackIntoStream fusionne audio et vidéo sans écraser', () => {
    const tracks: Array<{ id: string; kind: string }> = [];
    const stream = {
      getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
      getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
      addTrack: (t: { id: string; kind: string }) => {
        tracks.push(t);
      },
    };
    expect(mergeRemoteTrackIntoStream(stream as RemoteStreamUnified, { id: 'a1', kind: 'audio' })).toBe(true);
    expect(mergeRemoteTrackIntoStream(stream as RemoteStreamUnified, { id: 'v1', kind: 'video' })).toBe(true);
    expect(mergeRemoteTrackIntoStream(stream as RemoteStreamUnified, { id: 'a1', kind: 'audio' })).toBe(false);
    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(1);
  });

  it('shouldReplaceNativeRemoteMediaStream — reconstruire quand la vidéo distante arrive après l’audio', () => {
    const audioOnly = {
      getAudioTracks: () => [{ id: 'a1', readyState: 'live' }],
      getVideoTracks: () => [],
    };
    const audioAndVideo = [
      { id: 'a1', kind: 'audio', readyState: 'live' },
      { id: 'v1', kind: 'video', readyState: 'live' },
    ];
    expect(shouldReplaceNativeRemoteMediaStream(audioOnly, audioAndVideo)).toBe(true);
    expect(receiverTracksBindingKey(audioAndVideo)).not.toBe(
      receiverTracksBindingKey([{ id: 'a1', kind: 'audio', readyState: 'live' }]),
    );
    expect(
      shouldReplaceNativeRemoteMediaStream(
        {
          getAudioTracks: () => [{ id: 'a1', readyState: 'live' }],
          getVideoTracks: () => [{ id: 'v1', readyState: 'live' }],
        },
        audioAndVideo,
      ),
    ).toBe(false);
  });

  it('scénario appelant — piste vidéo new puis live force resync', () => {
    const audioBound = {
      getAudioTracks: () => [{ id: 'a1', readyState: 'live' }],
      getVideoTracks: () => [],
    };
    const withVideoNew = [
      { id: 'a1', kind: 'audio', readyState: 'live' },
      { id: 'v1', kind: 'video', readyState: 'new' },
    ];
    expect(shouldReplaceNativeRemoteMediaStream(audioBound, withVideoNew)).toBe(true);
    const withVideoLive = [
      { id: 'a1', kind: 'audio', readyState: 'live' },
      { id: 'v1', kind: 'video', readyState: 'live' },
    ];
    expect(
      shouldReplaceNativeRemoteMediaStream(
        {
          getAudioTracks: () => [{ id: 'a1', readyState: 'live' }],
          getVideoTracks: () => [{ id: 'v1', readyState: 'new' }],
        },
        withVideoLive,
      ),
    ).toBe(true);
  });

  it('shouldSyncRemoteReceiverTracks attend le SDP distant (anti faux distant Android)', () => {
    expect(shouldSyncRemoteReceiverTracks(null)).toBe(false);
    expect(shouldSyncRemoteReceiverTracks({})).toBe(false);
    expect(shouldSyncRemoteReceiverTracks({ remoteDescription: { type: 'offer' } })).toBe(true);
  });

  it('isTrackFromLocalCapture ignore le micro/caméra local', () => {
    const localIds = collectTrackIds({
      getAudioTracks: () => [{ id: 'mic-1' }],
      getVideoTracks: () => [{ id: 'cam-1' }],
    });
    expect(isTrackFromLocalCapture({ id: 'mic-1' }, localIds)).toBe(true);
    expect(isTrackFromLocalCapture({ id: 'peer-a1' }, localIds)).toBe(false);
  });

  it('canPromoteCallToConnected exige live + règles shouldMark', () => {
    expect(
      canPromoteCallToConnected({
        isVideo: false,
        role: 'caller',
        peerAccepted: true,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(true);
    expect(
      canPromoteCallToConnected({
        isVideo: false,
        role: 'caller',
        peerAccepted: true,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(false);
    expect(
      canPromoteCallToConnected({
        isVideo: true,
        hasRemoteDescription: true,
        stream: {
          getAudioTracks: () => [],
          getVideoTracks: () => [{ enabled: true, readyState: 'live' }],
        },
      }),
    ).toBe(true);
  });

  it('remoteStreamReadyForConnectedUi exige piste live distante', () => {
    expect(
      remoteStreamReadyForConnectedUi({
        isVideo: false,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(false);
    expect(
      remoteStreamReadyForConnectedUi({
        isVideo: false,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(false);
    expect(
      remoteStreamReadyForConnectedUi({
        isVideo: false,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'live' }] },
      }),
    ).toBe(true);
  });

  it('countLocalTracks compte audio et vidéo', () => {
    expect(
      countLocalTracks({
        getAudioTracks: () => [{}],
        getVideoTracks: () => [{}, {}],
      }),
    ).toEqual({ audio: 1, video: 2 });
  });

  it('shouldBindNativeRemoteStreamUrl — vocal natif avec SDP distant et piste new', () => {
    expect(
      shouldBindNativeRemoteStreamUrl({
        isVideo: false,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(true);
    expect(
      shouldBindNativeRemoteStreamUrl({
        isVideo: false,
        hasRemoteDescription: false,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(false);
    expect(
      shouldBindNativeRemoteStreamUrl({
        isVideo: true,
        hasRemoteDescription: true,
        stream: { getAudioTracks: () => [{ enabled: true, readyState: 'new' }] },
      }),
    ).toBe(false);
    expect(
      shouldBindNativeRemoteStreamUrl({
        isVideo: true,
        hasRemoteDescription: true,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
          getVideoTracks: () => [{ id: 'v1', enabled: true, readyState: 'new' }],
        },
      }),
    ).toBe(true);
  });

  it('shouldMarkCallConnected — appel vidéo : pas connecté sur ICE + audio seul si SDP distant a vidéo', () => {
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        hasRemoteDescription: true,
        remoteSdpHasVideo: true,
        iceConnectionState: 'connected',
        peerConnectionState: 'connected',
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
          getVideoTracks: () => [],
        },
      }),
    ).toBe(false);
  });

  it('shouldMarkCallConnected — appel vidéo : audio seul OK si SDP distant sans vidéo', () => {
    expect(
      shouldMarkCallConnected({
        isVideo: true,
        hasRemoteDescription: true,
        remoteSdpHasVideo: false,
        stream: {
          getAudioTracks: () => [{ enabled: true, readyState: 'live' }],
          getVideoTracks: () => [],
        },
      }),
    ).toBe(true);
  });

  it('shouldRefreshNativeRemoteRtcView — vidéo ajoutée après bind audio', () => {
    expect(
      shouldRefreshNativeRemoteRtcView({
        isVideo: true,
        prevBindingKey: 'a1:live|',
        nextBindingKey: 'a1:live|v1:live|',
        prevVideoCount: 0,
        nextVideoCount: 1,
      }),
    ).toBe(true);
  });

  it('streamHasRemoteVideoTrack détecte new et live', () => {
    expect(
      streamHasRemoteVideoTrack({
        getVideoTracks: () => [{ readyState: 'new' }],
      }),
    ).toBe(true);
  });

  it('streamHasRenderableRemoteVideo exige une piste live démutée (frames décodées)', () => {
    // Piste présente mais muette → écran noir : NON affichable.
    expect(
      streamHasRenderableRemoteVideo({
        getVideoTracks: () => [{ readyState: 'live', enabled: true, muted: true }],
      }),
    ).toBe(false);
    // Piste seulement « new » → pas encore de frames.
    expect(
      streamHasRenderableRemoteVideo({
        getVideoTracks: () => [{ readyState: 'new', enabled: true, muted: false }],
      }),
    ).toBe(false);
    // Piste désactivée → NON affichable.
    expect(
      streamHasRenderableRemoteVideo({
        getVideoTracks: () => [{ readyState: 'live', enabled: false, muted: false }],
      }),
    ).toBe(false);
    // Piste live, activée, démutée → affichable.
    expect(
      streamHasRenderableRemoteVideo({
        getVideoTracks: () => [{ readyState: 'live', enabled: true, muted: false }],
      }),
    ).toBe(true);
    // `muted` absent (web track standard) → considéré affichable si live + enabled.
    expect(
      streamHasRenderableRemoteVideo({
        getVideoTracks: () => [{ readyState: 'live', enabled: true }],
      }),
    ).toBe(true);
  });

  it('dedupeRemoteReceiverTracks garde une seule piste audio live', () => {
    expect(
      dedupeRemoteReceiverTracks([
        { id: 'a1', kind: 'audio', readyState: 'live' },
        { id: 'a2', kind: 'audio', readyState: 'live' },
      ]).map((t) => t.id),
    ).toEqual(['a1']);
  });
});
