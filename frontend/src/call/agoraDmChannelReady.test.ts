import { describe, expect, it } from 'vitest';

import {
  shouldEnableAgoraChannelJoin,
  shouldPromoteAgoraRemoteToConnected,
  shouldStartAgoraCallTimer,
} from './agoraDmChannelReady';

describe('agoraDmChannelReady', () => {
  it('appelant — pas de join canal avant acceptation (aperçu preview seul)', () => {
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'caller',
        peerAccepted: false,
        callEnded: false,
        mediaEnabled: true,
      }),
    ).toBe(false);
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'caller',
        peerAccepted: true,
        callEnded: false,
        mediaEnabled: true,
      }),
    ).toBe(true);
  });

  it('receveur — join après acceptation locale', () => {
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'receiver',
        peerAccepted: true,
        callEnded: false,
        mediaEnabled: true,
      }),
    ).toBe(true);
  });

  it('chronomètre seulement si connecté + accepté', () => {
    expect(
      shouldStartAgoraCallTimer({ callState: 'connected', peerAccepted: true }),
    ).toBe(true);
    expect(
      shouldStartAgoraCallTimer({ callState: 'ringing', peerAccepted: false }),
    ).toBe(false);
  });

  it('vidéo — connected UI sur première frame distante', () => {
    expect(
      shouldPromoteAgoraRemoteToConnected({
        audioOnly: false,
        eventSource: 'onFirstRemoteVideoDecoded',
      }),
    ).toBe(true);
    expect(
      shouldPromoteAgoraRemoteToConnected({
        audioOnly: false,
        eventSource: 'onUserJoined',
      }),
    ).toBe(false);
  });

  it('audio — connected sur join ou audio distant', () => {
    expect(
      shouldPromoteAgoraRemoteToConnected({
        audioOnly: true,
        eventSource: 'onUserJoined',
      }),
    ).toBe(true);
    expect(
      shouldPromoteAgoraRemoteToConnected({
        audioOnly: true,
        eventSource: 'onRemoteAudioStateChanged',
      }),
    ).toBe(true);
  });
});
