import { describe, expect, it } from 'vitest';
import { VOICE_OPUS_BITRATE_2G, VOICE_OPUS_BITRATE_3G } from './callNetworkConfig';
import {
  pruneRedundantCallTransceivers,
  selectRedundantTransceivers,
  shouldOptimizeCallAudioBeforeFirstNegotiation,
  shouldTuneSdpBeforeSetLocalDescription,
  tuneVoiceCallSdp,
  VOICE_OPUS_MAX_AVERAGE_BITRATE,
  withTunedVoiceSdp,
} from './callAudioQuality';

const tx = (kind: string, sending: boolean) => ({
  sender: { track: sending ? { kind } : null },
  receiver: { track: { kind } },
  stop() {
    (this as { stopped?: boolean }).stopped = true;
  },
});

const SAMPLE_SDP = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 63',
  'a=rtpmap:111 opus/48000/2',
  'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=rtpmap:63 red/48000',
].join('\r\n');

describe('callAudioQuality', () => {
  it('tuneVoiceCallSdp force Opus mono avec FEC et bitrate vocal', () => {
    const tuned = tuneVoiceCallSdp(SAMPLE_SDP)!;
    expect(tuned).toContain('a=rtpmap:111 opus/48000/1');
    expect(tuned).toContain(`maxaveragebitrate=${VOICE_OPUS_MAX_AVERAGE_BITRATE}`);
    expect(tuned).toContain('stereo=0');
    expect(tuned).toContain('usedtx=0');
    expect(tuned).toContain('useinbandfec=1');
  });

  it('withTunedVoiceSdp préserve le type SDP', () => {
    const tuned = withTunedVoiceSdp({ type: 'offer', sdp: SAMPLE_SDP });
    expect(tuned.type).toBe('offer');
    expect(tuned.sdp).toContain('opus/48000/1');
  });

  it('shouldTuneSdpBeforeSetLocalDescription — natif : SDP brut (anti mid=0 recv)', () => {
    expect(shouldTuneSdpBeforeSetLocalDescription(false)).toBe(false);
    expect(shouldTuneSdpBeforeSetLocalDescription(true)).toBe(true);
  });

  it('shouldOptimizeCallAudioBeforeFirstNegotiation — natif : bitrate après 1er SDP', () => {
    expect(shouldOptimizeCallAudioBeforeFirstNegotiation(false)).toBe(false);
    expect(shouldOptimizeCallAudioBeforeFirstNegotiation(true)).toBe(true);
  });

  it('tuneVoiceCallSdp laisse intact un SDP sans Opus', () => {
    const plain = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 0\r\n';
    expect(tuneVoiceCallSdp(plain)).toBe(plain);
  });

  it('tuneVoiceCallSdp accepte un bitrate adapté 2G/3G', () => {
    const tuned2g = tuneVoiceCallSdp(SAMPLE_SDP, VOICE_OPUS_BITRATE_2G)!;
    expect(tuned2g).toContain(`maxaveragebitrate=${VOICE_OPUS_BITRATE_2G}`);
    const tuned3g = withTunedVoiceSdp({ type: 'answer', sdp: SAMPLE_SDP }, VOICE_OPUS_BITRATE_3G);
    expect(tuned3g.sdp).toContain(`maxaveragebitrate=${VOICE_OPUS_BITRATE_3G}`);
  });

  it("selectRedundantTransceivers neutralise le 2e audio sans envoi (anti mid='1')", () => {
    const sending = tx('audio', true);
    const recvOnlyDup = tx('audio', false);
    const redundant = selectRedundantTransceivers([sending, recvOnlyDup]);
    expect(redundant).toEqual([recvOnlyDup]);
  });

  it("selectRedundantTransceivers neutralise le 2e audio émetteur (addTrack en double)", () => {
    const sending1 = tx('audio', true);
    const sending2 = tx('audio', true);
    const redundant = selectRedundantTransceivers([sending1, sending2]);
    expect(redundant).toEqual([sending2]);
  });

  it('selectRedundantTransceivers ne touche pas un audio unique (même sans envoi listen-only)', () => {
    const listenOnly = tx('audio', false);
    expect(selectRedundantTransceivers([listenOnly])).toEqual([]);
  });

  it('selectRedundantTransceivers garde audio + vidéo émis (appel vidéo)', () => {
    const audio = tx('audio', true);
    const video = tx('video', true);
    expect(selectRedundantTransceivers([audio, video])).toEqual([]);
  });

  it('pruneRedundantCallTransceivers arrête les transceivers en doublon', () => {
    const sending = tx('audio', true);
    const dup = tx('audio', false);
    const pc = { getTransceivers: () => [sending, dup] } as unknown as RTCPeerConnection;
    expect(pruneRedundantCallTransceivers(pc)).toBe(1);
    expect((dup as { stopped?: boolean }).stopped).toBe(true);
    expect((sending as { stopped?: boolean }).stopped).toBeUndefined();
  });

  it('pruneRedundantCallTransceivers tolère un PeerConnection sans getTransceivers', () => {
    expect(pruneRedundantCallTransceivers({} as RTCPeerConnection)).toBe(0);
    expect(pruneRedundantCallTransceivers(null)).toBe(0);
  });
});
