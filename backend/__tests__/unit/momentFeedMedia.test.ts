import {
  collectMomentMediaUrls,
  isE2eTestAccountUser,
  isSkippableMomentMediaUrl,
  isBrokenImageOnlyMomentRow,
  momentRowIsDisplayable,
} from '../../src/utils/momentFeedMedia.js';

describe('momentFeedMedia', () => {
  it('rejette les URLs placeholder / example.com / dev', () => {
    expect(isSkippableMomentMediaUrl('https://example.com/x.jpg')).toBe(true);
    expect(isSkippableMomentMediaUrl('https://cdn.afriwonder.test/e2e.png')).toBe(true);
    expect(isSkippableMomentMediaUrl('http://127.0.0.1:3000/uploads/x.jpg')).toBe(true);
    expect(isSkippableMomentMediaUrl('/uploads/real.jpg')).toBe(false);
  });

  it('détecte les comptes E2E', () => {
    expect(isE2eTestAccountUser({ email: 'img.abc@example.com', full_name: 'E2E img' })).toBe(true);
    expect(isE2eTestAccountUser({ email: 'user@gmail.com', username: 'real_user' })).toBe(false);
  });

  it('masque les posts E2E du fil public', () => {
    expect(momentRowIsDisplayable({
      text: 'E2E image publication',
      image_url: 'https://cdn.test/x.jpg',
      user: { email: 'img.x@example.com', full_name: 'E2E img' },
    })).toBe(false);
  });

  it('collecte image_url et images[]', () => {
    const urls = collectMomentMediaUrls({
      image_url: '/uploads/a.jpg',
      images: [{ image_url: '/uploads/b.jpg', position: 1 }],
    });
    expect(urls).toEqual(['/uploads/a.jpg', '/uploads/b.jpg']);
  });

  it('repère image-only cassée', () => {
    expect(isBrokenImageOnlyMomentRow({
      image_url: 'https://cdn.afriwonder.test/x.png',
      images: [{ image_url: 'https://example.com/y.jpg' }],
    })).toBe(true);
    expect(isBrokenImageOnlyMomentRow({ text: 'ok', image_url: 'https://example.com/x.jpg' })).toBe(false);
  });
});
