import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPreferences, savePreferences, DEFAULTS } from './preferences';

const getJSON = vi.fn();
const setJSON = vi.fn(() => true);

vi.mock('@/utils/safeStorage', () => ({
  getJSON: (...args) => getJSON(...args),
  setJSON: (...args) => setJSON(...args),
}));

describe('preferences', () => {
  beforeEach(() => {
    getJSON.mockReturnValue(null);
  });

  it('exports DEFAULTS with isMuted and language', () => {
    expect(DEFAULTS).toHaveProperty('isMuted', false);
    expect(DEFAULTS).toHaveProperty('soundPreferenceSet', false);
    expect(DEFAULTS).toHaveProperty('language', 'fr');
  });

  it('loadPreferences returns defaults when storage returns null', () => {
    const prefs = loadPreferences();
    expect(prefs.isMuted).toBe(DEFAULTS.isMuted);
    expect(prefs.language).toBe(DEFAULTS.language);
  });

  it('loadPreferences merges stored prefs with defaults', () => {
    getJSON.mockReturnValue({ language: 'en' });
    const prefs = loadPreferences();
    expect(prefs.language).toBe('en');
    expect(prefs.isMuted).toBe(DEFAULTS.isMuted);
  });

  it('loadPreferences migrates legacy prefs to unmuted when sound preference was never set', () => {
    getJSON.mockReturnValue({ isMuted: true, language: 'fr' });
    const prefs = loadPreferences();
    expect(prefs.isMuted).toBe(false);
    expect(prefs.soundPreferenceSet).toBe(false);
  });

  it('savePreferences accepts patch and calls setJSON', () => {
    const ok = savePreferences({ isMuted: false });
    expect(ok).toBe(true);
    expect(setJSON).toHaveBeenCalledWith('afw_preferences', expect.objectContaining({ isMuted: false, soundPreferenceSet: true }));
  });
});
