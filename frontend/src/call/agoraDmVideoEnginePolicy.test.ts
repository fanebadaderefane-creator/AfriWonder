import { describe, expect, it } from 'vitest';

import {
  agoraVideoEngineUnavailableMessage,
  shouldBlockSecondAgoraVideoEngine,
} from './agoraDmVideoEnginePolicy';

describe('agoraDmVideoEnginePolicy', () => {
  it('bloque un 2e moteur vidéo sans adoption preview', () => {
    expect(shouldBlockSecondAgoraVideoEngine(false, null)).toBe(true);
    expect(shouldBlockSecondAgoraVideoEngine(false, {})).toBe(false);
  });

  it('autorise création standalone pour appel vocal', () => {
    expect(shouldBlockSecondAgoraVideoEngine(true, null)).toBe(false);
  });

  it('message utilisateur lisible', () => {
    expect(agoraVideoEngineUnavailableMessage()).toMatch(/Caméra indisponible/);
  });
});
