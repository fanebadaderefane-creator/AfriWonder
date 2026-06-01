import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import {
  MediaViewerModalChrome,
  mediaViewerStyles,
  type MediaViewerItem,
  type MediaViewerModalProps,
  type MediaViewerModalResolvedProps,
} from './MediaViewerModal.shared';

export type { MediaViewerItem };

/**
 * Web : aucun import Reanimated/RNGH worklets (Metro charge ce fichier à la place de .native).
 * Évite : `[Worklets] createSerializableObject should never be called in JSWorklets`.
 */
export function MediaViewerModal(props: MediaViewerModalProps) {
  if (!props.item) return null;
  const resolved: MediaViewerModalResolvedProps = { ...props, item: props.item };

  return (
    <MediaViewerModalChrome
      {...resolved}
      renderMedia={(uri) => (
        <View style={mediaViewerStyles.imageWrap}>
          <Image source={{ uri }} style={mediaViewerStyles.image} contentFit="contain" transition={120} />
        </View>
      )}
    />
  );
}
