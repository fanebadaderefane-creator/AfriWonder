const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export async function impactLight() {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(10);
  } catch {
    // no-op
  }
}

export async function impactMedium() {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(20);
  } catch {}
}

export async function impactHeavy() {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(35);
  } catch {}
}

