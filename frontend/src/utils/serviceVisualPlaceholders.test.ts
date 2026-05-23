import { describe, expect, it } from 'vitest';
import {
  doctorAvatarPlaceholderUrl,
  eventHeroPlaceholderUrl,
  newsArticlePlaceholderUrl,
} from './serviceVisualPlaceholders';

describe('serviceVisualPlaceholders', () => {
  it('retourne des URLs https stables pour un même id', () => {
    expect(eventHeroPlaceholderUrl('e1', 'concert')).toMatch(/^https:\/\//);
    expect(eventHeroPlaceholderUrl('e1', 'concert')).toBe(eventHeroPlaceholderUrl('e1', 'concert'));
  });

  it('varie selon le type d’événement', () => {
    const a = eventHeroPlaceholderUrl('same', 'concert');
    const b = eventHeroPlaceholderUrl('same', 'forum');
    expect(a).not.toBe(b);
  });

  it('médecin et actu : URLs différentes pour ids différents', () => {
    expect(doctorAvatarPlaceholderUrl('d1')).not.toBe(doctorAvatarPlaceholderUrl('d2'));
    expect(newsArticlePlaceholderUrl('n1')).not.toBe(newsArticlePlaceholderUrl('n2'));
  });
});
