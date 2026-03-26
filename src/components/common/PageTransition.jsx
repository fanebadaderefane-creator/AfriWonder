/**
 * Transition fluide entre les pages.
 * Respecte prefers-reduced-motion (durée quasi nulle).
 */
import { motion, useReducedMotion } from 'framer-motion';

const DURATION = 0.2;

const FULLSCREEN_PAGES = new Set(['Home', 'Create', 'Chat', 'GroupChat', 'DirectCall', 'GroupCallLobby']);

export default function PageTransition({ children, pageKey }) {
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : DURATION;
  const isFullScreen = FULLSCREEN_PAGES.has(pageKey);

  if (isFullScreen) {
    return (
      <div
        key={pageKey}
        className="w-full"
        style={{ height: '100%', minHeight: 'calc(var(--app-vh, 1vh) * 100)' }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={pageKey}
      className="w-full"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ height: '100%', minHeight: 'calc(var(--app-vh, 1vh) * 100)' }}
    >
      {children}
    </motion.div>
  );
}
