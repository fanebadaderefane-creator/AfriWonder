import { describe, it, expect } from 'vitest';
import {
  applyExpoGoAndroidGoogleWebClientOverride,
  EXPO_EXECUTION_STORE_CLIENT,
} from './googleOAuthExpoGoPolicy';

describe('googleOAuthExpoGoPolicy', () => {
  const ids = {
    webClientId: 'web.apps.googleusercontent.com',
    androidClientId: 'android.apps.googleusercontent.com',
  };

  it('remplace androidClientId par webClientId uniquement sur Android Expo Go', () => {
    expect(
      applyExpoGoAndroidGoogleWebClientOverride(ids, {
        platformOs: 'android',
        executionEnvironment: EXPO_EXECUTION_STORE_CLIENT,
      })
    ).toEqual({
      webClientId: ids.webClientId,
      androidClientId: ids.webClientId,
    });
  });

  it('ne change rien en standalone / iOS', () => {
    expect(
      applyExpoGoAndroidGoogleWebClientOverride(ids, {
        platformOs: 'android',
        executionEnvironment: 'standalone',
      })
    ).toEqual(ids);
    expect(
      applyExpoGoAndroidGoogleWebClientOverride(ids, {
        platformOs: 'ios',
        executionEnvironment: EXPO_EXECUTION_STORE_CLIENT,
      })
    ).toEqual(ids);
  });

  it('sans webClientId, ne change rien', () => {
    expect(
      applyExpoGoAndroidGoogleWebClientOverride(
        { androidClientId: 'x' },
        { platformOs: 'android', executionEnvironment: EXPO_EXECUTION_STORE_CLIENT }
      )
    ).toEqual({ androidClientId: 'x' });
  });
});
