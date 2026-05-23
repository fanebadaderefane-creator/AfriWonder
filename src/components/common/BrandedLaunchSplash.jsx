import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';

/**
 * Splash type grandes apps : logo centré, fond brand.
 * `fixed` au boot global ; `absolute` au-dessus du feed (vidéos se chargent derrière).
 */
export default function BrandedLaunchSplash({
  position = 'fixed',
  className = '',
  showWordmark = true,
}) {
  const posClass = position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0';

  return (
    <div
      className={cn(
        posClass,
        'z-[100] flex flex-col items-center justify-center bg-[#030712]',
        'px-6',
        className
      )}
      aria-busy="true"
      aria-label="Chargement AfriWonder"
    >
      {/* Léger vignettage — sans image floutée pour garder un écran « marque » net */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(2,6,23,0.85)_100%)]"
        aria-hidden
      />
      <motion.div
        className="relative z-[1] flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <AfriWonderLogo
          size="3xl"
          priority
          className="drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
        />
        {showWordmark ? (
          <p className="mt-8 text-center text-[13px] font-semibold uppercase tracking-[0.28em] text-white/40">
            AfriWonder
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
