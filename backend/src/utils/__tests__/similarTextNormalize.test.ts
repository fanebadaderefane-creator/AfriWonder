import { normalizeSimilarText } from '../similarTextNormalize';

describe('normalizeSimilarText', () => {
  it('supprime les accents pour matcher extractContentKeywords', () => {
    expect(normalizeSimilarText('Dédicace pour Africains')).toContain('dedicace');
    expect(normalizeSimilarText('Dédicace pour Africains')).toContain('africains');
  });

  it('réduit la ponctuation', () => {
    expect(normalizeSimilarText('Hello, World!!!')).toBe('hello world');
  });
});
