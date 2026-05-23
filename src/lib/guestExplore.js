/**
 * Mode invité : accès au shell complet (feed, navigation) sans compte — aligné audit « guest ».
 * Persistance session (onglet) ; effacé à la connexion / déconnexion.
 */
export const GUEST_EXPLORE_KEY = 'afw_guest_explore';
export const GUEST_EXPLORE_EVENT = 'afw-guest-explore-change';

export function readGuestExplore() {
  try {
    return sessionStorage.getItem(GUEST_EXPLORE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setGuestExplore(active) {
  try {
    if (active) sessionStorage.setItem(GUEST_EXPLORE_KEY, '1');
    else sessionStorage.removeItem(GUEST_EXPLORE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(GUEST_EXPLORE_EVENT));
    }
  } catch (_e) {}
}
