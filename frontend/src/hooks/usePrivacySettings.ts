import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

/**
 * Modèle des préférences "Settings and privacy" — miroir de `PRIVACY_DEFAULTS`
 * côté backend (`backend/src/routes/me.routes.ts`). Doit rester aligné.
 */
export type Audience = 'everyone' | 'friends' | 'no_one';
export type Visibility = 'everyone' | 'friends' | 'only_me';

export type PrivacySettings = {
  private_account: boolean;
  following_list_visibility: Visibility;
  liked_videos_visibility: Visibility;
  comments: { who: Audience; filter_keywords: string[] };
  mentions: Audience;
  direct_messages: Audience;
  activity_status: Audience;
  viewers: boolean;
  downloads: boolean;
  display_profile_when_sharing: boolean;
  reuse_of_content: { duet: boolean; stitch: boolean; remix: boolean };
  content_preferences: { disliked_tags: string[] };
  time_and_wellbeing: {
    screen_time_limit_min: number | null;
    break_reminder_min: number | null;
    restricted_mode: boolean;
  };
  language: { app_lang: string; content_lang: string[] };
  display: { theme: 'light' | 'dark' | 'system' };
  accessibility: { auto_captions: boolean; reduce_motion: boolean; tts: boolean };
  contacts_and_location: { contacts_allowed: boolean; location_allowed: boolean };
  data_saver: boolean;
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  private_account: false,
  following_list_visibility: 'everyone',
  liked_videos_visibility: 'only_me',
  comments: { who: 'everyone', filter_keywords: [] },
  mentions: 'everyone',
  direct_messages: 'friends',
  activity_status: 'no_one',
  viewers: true,
  downloads: true,
  display_profile_when_sharing: true,
  reuse_of_content: { duet: true, stitch: true, remix: true },
  content_preferences: { disliked_tags: [] },
  time_and_wellbeing: { screen_time_limit_min: null, break_reminder_min: null, restricted_mode: false },
  language: { app_lang: 'fr', content_lang: ['fr'] },
  display: { theme: 'system' },
  accessibility: { auto_captions: false, reduce_motion: false, tts: false },
  contacts_and_location: { contacts_allowed: false, location_allowed: false },
  data_saver: false,
};

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = (base as Record<string, unknown>)[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[key] = deepMerge(current as Record<string, unknown>, value as Record<string, unknown>);
    } else if (typeof value !== 'undefined') {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Hook unique pour charger / mettre à jour les préférences privacy.
 *
 * - `update(patch)` : mise à jour optimiste + appel `PUT /me/settings/privacy`,
 * - rollback automatique si l'API échoue,
 * - `refresh()` : re-fetch (utile au focus d'écran).
 */
export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get('/me/settings/privacy');
      const data = (res.data?.data ?? res.data) as Partial<PrivacySettings>;
      setSettings(deepMerge(DEFAULT_PRIVACY, data));
    } catch {
      /* garde les defaults locaux */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<PrivacySettings>) => {
      const previous = settings;
      const next = deepMerge(settings, patch);
      setSettings(next);
      setSaving(true);
      try {
        await apiClient.put('/me/settings/privacy', patch);
      } catch {
        setSettings(previous);
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  return { settings, loading, saving, refresh, update };
}

export default usePrivacySettings;
