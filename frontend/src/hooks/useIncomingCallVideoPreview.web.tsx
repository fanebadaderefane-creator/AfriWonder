import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Web — pas de preview caméra avant acceptation. */
export function useIncomingCallVideoPreview(_opts: { callId: string; enabled: boolean }) {
  const PreviewView = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={style} />;
  return {
    PreviewView,
    previewOn: true,
    togglePreview: () => {},
    ready: false,
    stopPreview: async () => {},
  };
}
