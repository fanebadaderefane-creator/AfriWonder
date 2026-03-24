import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isCapacitorEnv = () => typeof window !== 'undefined' && !!window.Capacitor;

export async function impactLight() {
  if (!isCapacitorEnv()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // pas de crash si haptics indisponible
  }
}

export async function impactMedium() {
  if (!isCapacitorEnv()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function impactHeavy() {
  if (!isCapacitorEnv()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

