import RNCallKeep from 'react-native-callkeep';

export type CallKeepModule = typeof RNCallKeep;

export function getCallKeep(): CallKeepModule {
  return RNCallKeep;
}
