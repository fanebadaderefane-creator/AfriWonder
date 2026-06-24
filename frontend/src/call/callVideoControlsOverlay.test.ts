import { describe, expect, it } from 'vitest';

import {
  CALL_VIDEO_CONTROLS_AUTO_HIDE_MS,
  resolveCallVideoControlsChromeOpacity,
  resolveCallVideoControlsChromePointerEvents,
  shouldAutoHideCallVideoControls,
  shouldRevealControlsOnAppResume,
  shouldShowPinnedHangup,
  shouldShowTapToRevealOverlay,
} from './callVideoControlsOverlay';

const videoActive = {
  isVideoStage: true,
  callEnded: false,
  minimized: false,
  moreMenuOpen: false,
  messageModalOpen: false,
};

describe('callVideoControlsOverlay — TEST 1 visible au lancement', () => {
  it('chrome visible par défaut (opacité 1)', () => {
    expect(resolveCallVideoControlsChromeOpacity('visible')).toBe(1);
    expect(resolveCallVideoControlsChromePointerEvents('visible')).toBe('auto');
  });

  it('auto-masque autorisé en appel vidéo actif', () => {
    expect(shouldAutoHideCallVideoControls(videoActive)).toBe(true);
  });
});

describe('callVideoControlsOverlay — TEST 2 masque après 5s', () => {
  it('délai auto-masque = 5 secondes', () => {
    expect(CALL_VIDEO_CONTROLS_AUTO_HIDE_MS).toBe(5_000);
  });

  it('chrome masqué = opacité 0, pas de touches sur le dock', () => {
    expect(resolveCallVideoControlsChromeOpacity('autoHidden')).toBe(0);
    expect(resolveCallVideoControlsChromePointerEvents('autoHidden')).toBe('none');
  });
});

describe('callVideoControlsOverlay — TEST 3 tap révèle', () => {
  it('overlay tap actif quand chrome autoHidden', () => {
    expect(
      shouldShowTapToRevealOverlay({
        mode: 'autoHidden',
        isVideoStage: true,
        callEnded: false,
      }),
    ).toBe(true);
  });

  it('overlay tap inactif quand chrome visible', () => {
    expect(
      shouldShowTapToRevealOverlay({
        mode: 'visible',
        isVideoStage: true,
        callEnded: false,
      }),
    ).toBe(false);
  });
});

describe('callVideoControlsOverlay — TEST 4 après acceptation', () => {
  it('auto-masque reste actif une fois connecté (vidéo)', () => {
    expect(
      shouldAutoHideCallVideoControls({
        ...videoActive,
      }),
    ).toBe(true);
  });

  it('menu ouvert empêche le masque', () => {
    expect(
      shouldAutoHideCallVideoControls({
        ...videoActive,
        moreMenuOpen: true,
      }),
    ).toBe(false);
  });
});

describe('callVideoControlsOverlay — TEST 5 retour app / arrière-plan', () => {
  it('reprise active réaffiche les contrôles', () => {
    expect(shouldRevealControlsOnAppResume('active', true, false)).toBe(true);
  });

  it('background seul ne révèle pas', () => {
    expect(shouldRevealControlsOnAppResume('background', true, false)).toBe(false);
  });
});

describe('callVideoControlsOverlay — TEST 6 fin appel + raccrocher toujours dispo', () => {
  it('pas de masque ni PiP raccrocher après fin', () => {
    expect(
      shouldAutoHideCallVideoControls({
        ...videoActive,
        callEnded: true,
      }),
    ).toBe(false);
    expect(
      shouldShowPinnedHangup({
        mode: 'autoHidden',
        isVideoStage: true,
        callEnded: true,
      }),
    ).toBe(false);
  });

  it('raccrocher épinglé quand dock masqué', () => {
    expect(
      shouldShowPinnedHangup({
        mode: 'autoHidden',
        isVideoStage: true,
        callEnded: false,
      }),
    ).toBe(true);
  });
});
