import AsyncStorage from '@react-native-async-storage/async-storage';

/** Inscription : personnalisation feed (intérêts + suggestions). */
export const KEY_PERSONALIZATION_PENDING = 'p8_personalization_pending';

const KEY_INTERESTS = 'p8_onboarding_interests_done';
const KEY_SUGGEST = 'p8_onboarding_suggest_done';

export async function setPersonalizationPending(value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(KEY_PERSONALIZATION_PENDING, '1');
  else await AsyncStorage.removeItem(KEY_PERSONALIZATION_PENDING);
}

export async function isPersonalizationPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY_PERSONALIZATION_PENDING)) === '1';
}

export async function setInterestsDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_INTERESTS, '1');
}

export async function setSuggestCreatorsDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_SUGGEST, '1');
}

/**
 * Après connexion / inscription : prochain écran à afficher.
 * - Inscription récente (`p8_personalization_pending`) → intérêts → suggestions.
 * - Sinon → feed.
 */
export async function getPostAuthRoute(): Promise<'/interests' | '/suggest-creators' | '/(tabs)'> {
  const pending = await isPersonalizationPending();
  if (!pending) return '/(tabs)';

  const interests = await AsyncStorage.getItem(KEY_INTERESTS);
  if (interests !== '1') return '/interests';

  const suggest = await AsyncStorage.getItem(KEY_SUGGEST);
  if (suggest !== '1') return '/suggest-creators';

  await setPersonalizationPending(false);
  return '/(tabs)';
}
