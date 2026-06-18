import { describe, expect, it } from 'vitest';
import { connectionQualityFromAgoraNetwork } from './agoraConnectionQuality';

describe('connectionQualityFromAgoraNetwork', () => {
  it('excellent → Bonne connexion', () => {
    expect(connectionQualityFromAgoraNetwork(1, 1).labelFr).toBe('Bonne connexion');
  });

  it('faible → Connexion faible', () => {
    expect(connectionQualityFromAgoraNetwork(5, 3).quality).toBe('poor');
  });
});
