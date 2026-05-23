import { useEffect, useMemo, useState } from 'react';

const DOWNLINK_2G_MAX = 0.15; // ~150 kbps
const DOWNLINK_3G_MAX = 0.7;  // ~700 kbps

function readConnection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

export function getNetworkQuality() {
  const connection = readConnection();
  if (!connection) {
    return { quality: 'unknown', effectiveType: 'unknown', downlinkMbps: null, saveData: false };
  }

  const saveData = Boolean(connection.saveData);
  const effectiveType = String(connection.effectiveType || 'unknown');
  const downlink = Number(connection.downlink);
  const downlinkMbps = Number.isFinite(downlink) ? downlink : null;

  if (saveData) {
    return { quality: 'low', effectiveType, downlinkMbps, saveData };
  }

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return { quality: 'low', effectiveType, downlinkMbps, saveData };
  }
  if (effectiveType === '3g') {
    return { quality: 'medium', effectiveType, downlinkMbps, saveData };
  }

  if (downlinkMbps !== null) {
    if (downlinkMbps <= DOWNLINK_2G_MAX) return { quality: 'low', effectiveType, downlinkMbps, saveData };
    if (downlinkMbps <= DOWNLINK_3G_MAX) return { quality: 'medium', effectiveType, downlinkMbps, saveData };
  }

  return { quality: 'high', effectiveType, downlinkMbps, saveData };
}

export function pickPreferredVideoQuality(networkQuality) {
  if (networkQuality === 'low') return 'low';
  if (networkQuality === 'medium') return 'medium';
  return 'high';
}

export function useNetworkQuality() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const connection = readConnection();
    if (!connection || typeof connection.addEventListener !== 'function') return;
    const onChange = () => setTick((v) => v + 1);
    connection.addEventListener('change', onChange);
    return () => connection.removeEventListener('change', onChange);
  }, []);

  return useMemo(() => getNetworkQuality(), [tick]);
}
