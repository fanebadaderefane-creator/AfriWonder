/** Android / web : CallKit indisponible — ne pas charger react-native-callkeep (crash New Architecture). */

export type CallKeepModule = {
  setup: (options: unknown) => Promise<boolean>;
  setAvailable: (available: boolean) => void;
  addEventListener: (event: string, handler: (...args: never[]) => void) => void;
  displayIncomingCall: (
    uuid: string,
    handle: string,
    localizedCallerName: string,
    handleType: string,
    hasVideo: boolean,
  ) => void;
  endCall: (uuid: string) => void;
};

export function getCallKeep(): CallKeepModule | null {
  return null;
}
