/**
 * PostHog — activé uniquement en prod si VITE_POSTHOG_KEY est défini.
 */
export function initPosthog() {
  if (!import.meta.env.PROD) return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !String(key).trim()) return;

  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

  import('posthog-js')
    .then((mod) => {
      const posthog = mod.default;
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      });
    })
    .catch(() => {});
}
