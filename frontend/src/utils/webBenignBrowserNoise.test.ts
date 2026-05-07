import { describe, it, expect } from 'vitest';
import {
  isBenignMediaResourceAbort,
  isBenignMediaNotSuitable,
  normalizeWebErrorText,
} from './webBenignBrowserNoise';

describe('isBenignMediaResourceAbort', () => {
  it('reconnaît le libellé Chromium / Firefox complet', () => {
    expect(
      isBenignMediaResourceAbort(
        new Error(
          'The fetching process for the media resource was aborted by the user agent at the user\'s request.'
        )
      )
    ).toBe(true);
  });
  it('reconnaît « media … not suitable » (Chrome vidéo)', () => {
    expect(
      isBenignMediaNotSuitable(
        new Error(
          'The media resource indicated by the src attribute or assigned media provider object was not suitable.'
        )
      )
    ).toBe(true);
  });

  it('reconnaît NotSupportedError + message pipeline (mimic navigateur)', () => {
    expect(
      isBenignMediaNotSuitable({
        name: 'NotSupportedError',
        message: 'The media pipeline could not decode the stream.',
      })
    ).toBe(true);
  });

  it('normalise l’apostrophe typographique (Safari)', () => {
    const msg = normalizeWebErrorText(
      "The fetching process for the media resource was aborted by the user agent at the user\u2019s request."
    );
    expect(msg.includes("user's request")).toBe(true);
    expect(isBenignMediaResourceAbort(new Error(msg))).toBe(true);
  });
});
