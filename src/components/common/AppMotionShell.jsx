import { MotionConfig } from 'framer-motion';
import { useNetworkQuality } from '@/utils/networkAdaptive';

/**
 * Sur 2G / save-data : pas de MotionConfig racine (évite travail d’init Framer sur bas de gamme).
 * Les écrans importent toujours leurs propres `motion` à la navigation ; ici on réduit le coût du shell.
 */
export default function AppMotionShell({ children }) {
  const { quality, saveData } = useNetworkQuality();
  if (quality === 'low' || saveData) {
    return children;
  }
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
