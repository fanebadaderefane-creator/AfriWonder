import { describe, expect, it } from 'vitest';

import {
  shouldEnableAgoraChannelJoin,
  shouldMarkAgoraRemoteEverJoined,
  shouldPromoteAgoraRemoteToConnected,
  shouldStartAgoraCallTimer,
} from './agoraDmChannelReady';

describe('agoraDmChannelReady', () => {
  it('appelant vidéo — pas de join canal avant acceptation (aperçu preview seul)', () => {
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'caller',
        peerAccepted: false,
        callEnded: false,
        mediaEnabled: true,
        audioOnly: false,
      }),
    ).toBe(false);
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'caller',
        peerAccepted: true,
        callEnded: false,
        mediaEnabled: true,
        audioOnly: false,
      }),
    ).toBe(true);
  });

  it('appelant vocal — join canal immédiat (sonnerie)', () => {
    expect(
      shouldEnableAgoraChannelJoin({
        role: 'caller',
        peerAccepted: false,
        callEnded: false,
        mediaEnabled: true,
        audioOnly: true,
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

  it('vidéo — remoteEverJoined seulement sur première frame distante', () => {
    expect(
      shouldMarkAgoraRemoteEverJoined({
        audioOnly: false,
        eventSource: 'onFirstRemoteVideoDecoded',
      }),
    ).toBe(true);
    expect(
      shouldMarkAgoraRemoteEverJoined({
        audioOnly: false,
        eventSource: 'onRemoteAudioStateChanged',
      }),
    ).toBe(false);
    expect(
      shouldMarkAgoraRemoteEverJoined({
        audioOnly: true,
        eventSource: 'onUserJoined',
      }),
    ).toBe(true);
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
