/**
 * Transition fluide entre les pages.
 * Respecte prefers-reduced-motion (durée quasi nulle).
 */
import { motion, useReducedMotion } from 'framer-motion';

const DURATION = 0.2;

export default function PageTransition({ children, pageKey }) {
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : DURATION;

  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}
