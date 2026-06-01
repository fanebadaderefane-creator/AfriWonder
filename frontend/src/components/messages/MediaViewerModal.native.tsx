import React, { useEffect } from 'react';
import { Image } from 'expo-image';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  MediaViewerModalChrome,
  mediaViewerStyles,
  type MediaViewerItem,
  type MediaViewerModalProps,
  type MediaViewerModalResolvedProps,
} from './MediaViewerModal.shared';

export type { MediaViewerItem };

/** Native iOS/Android : pinch / pan / double-tap avec Reanimated. */
export function MediaViewerModal(props: MediaViewerModalProps) {
  if (!props.item) return null;
  return <MediaViewerModalNativeBody {...props} item={props.item} />;
}

function MediaViewerModalNativeBody(props: MediaViewerModalResolvedProps) {
  const { item } = props;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  }, [item.id, item.uri, scale, savedScale, translateX, translateY, savedX, savedY]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.01) return;
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <MediaViewerModalChrome
      {...props}
      renderMedia={(uri) => (
        <GestureHandlerRootView style={mediaViewerStyles.gestureRoot}>
          <GestureDetector gesture={composed}>
            <Animated.View style={[mediaViewerStyles.imageWrap, animatedStyle]}>
              <Image source={{ uri }} style={mediaViewerStyles.image} contentFit="contain" transition={120} />
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>
      )}
    />
  );
}
