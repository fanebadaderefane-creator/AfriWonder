import { useEffect } from 'react';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function useNativeAppEnhancements() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const root = document.documentElement;
    const body = document.body;
    const standalone = isStandaloneMode();

    root.classList.toggle('pwa-standalone', standalone);
    body.classList.toggle('pwa-standalone', standalone);

    const setViewportVars = () => {
      const vv = window.visualViewport;
      const height = vv?.height || window.innerHeight || 0;
      const appVh = height * 0.01;
      root.style.setProperty('--app-vh', `${appVh}px`);

      const keyboardOffset = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      root.style.setProperty('--keyboard-offset', `${Math.round(keyboardOffset)}px`);
    };

    setViewportVars();
    window.addEventListener('resize', setViewportVars, { passive: true });
    window.visualViewport?.addEventListener('resize', setViewportVars, { passive: true });
    window.visualViewport?.addEventListener('scroll', setViewportVars, { passive: true });

    let lastVibrateAt = 0;
    const onTapFeedback = (event) => {
      if (!standalone || !navigator.vibrate) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const actionable = target.closest('button, a, [role="button"], [data-haptic]');
      if (!actionable || actionable.hasAttribute('disabled') || actionable.getAttribute('aria-disabled') === 'true') return;

      const now = Date.now();
      if (now - lastVibrateAt < 80) return;
      lastVibrateAt = now;
      navigator.vibrate(8);
    };

    document.addEventListener('pointerup', onTapFeedback, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', setViewportVars);
      window.visualViewport?.removeEventListener('resize', setViewportVars);
      window.visualViewport?.removeEventListener('scroll', setViewportVars);
      document.removeEventListener('pointerup', onTapFeedback, true);
      root.classList.remove('pwa-standalone');
      body.classList.remove('pwa-standalone');
    };
  }, []);
}
