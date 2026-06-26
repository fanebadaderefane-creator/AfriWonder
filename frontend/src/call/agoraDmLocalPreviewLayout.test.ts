import { describe, expect, it } from 'vitest';
import { resolveAgoraDmLocalPreviewLayout, agoraDmLocalPreviewLayoutFingerprint } from './agoraDmLocalPreviewLayout';

const base = {
  isVideoCall: true,
  videoPublished: true,
  joined: true,
  camOn: true,
  localScreenSharing: false,
  remoteJoined: true,
  remoteEverJoined: true,
  mediaEnabled: true,
};

describe('resolveAgoraDmLocalPreviewLayout', () => {
  it('sonnerie — plein écran, surface montée', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      remoteJoined: false,
      remoteEverJoined: false,
    });
    expect(layout.mountSurface).toBe(true);
    expect(layout.containerStyle).toBe('full');
    expect(layout.showVideo).toBe(true);
  });

  it('connecté — PiP sans démonter (même mountSurface true)', () => {
    const ringing = resolveAgoraDmLocalPreviewLayout({
      ...base,
      remoteJoined: false,
      remoteEverJoined: false,
    });
    const connected = resolveAgoraDmLocalPreviewLayout({ ...base });
    expect(ringing.mountSurface).toBe(true);
    expect(connected.mountSurface).toBe(true);
    expect(connected.containerStyle).toBe('pip');
  });

  it('remoteJoined fluctue — PiP reste (remoteEverJoined)', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      remoteJoined: false,
      remoteEverJoined: true,
    });
    expect(layout.mountSurface).toBe(true);
    expect(layout.containerStyle).toBe('pip');
    expect(layout.showVideo).toBe(true);
  });

  it('caméra off pendant appel connecté — surface cachée mais montée', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      camOn: false,
    });
    expect(layout.mountSurface).toBe(true);
    expect(layout.containerStyle).toBe('hidden');
    expect(layout.showVideo).toBe(false);
  });

  it('partage écran local — PiP reste monté', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      localScreenSharing: true,
    });
    expect(layout.mountSurface).toBe(true);
    expect(layout.containerStyle).toBe('pip');
  });

  it('avant join Agora — surface montée dès mediaEnabled', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      joined: false,
      mediaEnabled: true,
      remoteJoined: false,
      remoteEverJoined: false,
    });
    expect(layout.mountSurface).toBe(true);
    expect(layout.containerStyle).toBe('full');
  });

  it('fingerprint stable pour même layout', () => {
    const layout = resolveAgoraDmLocalPreviewLayout({
      ...base,
      remoteJoined: false,
      remoteEverJoined: false,
    });
    expect(agoraDmLocalPreviewLayoutFingerprint(layout)).toBe(
      'true|full|true|false|false',
    );
  });
});

