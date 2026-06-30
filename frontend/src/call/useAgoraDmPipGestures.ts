import { useMemo, useRef } from 'react';
import { Dimensions, PanResponder, type ViewStyle } from 'react-native';
import { clampAgoraDmPipDrag } from './agoraDmPipPosition';
import {
  AGORA_DM_VIDEO_PIP_HEIGHT,
  AGORA_DM_VIDEO_PIP_WIDTH,
} from './agoraDmVideoLayout';

export function defaultAgoraDmPipStyle(input: {
  bottomOffset: number;
  rightInset?: number;
  dragX: number | null;
  dragY: number | null;
}): ViewStyle {
  if (input.dragX != null && input.dragY != null) {
    return {
      position: 'absolute',
      left: input.dragX,
      top: input.dragY,
      width: AGORA_DM_VIDEO_PIP_WIDTH,
      height: AGORA_DM_VIDEO_PIP_HEIGHT,
    };
  }
  return {
    position: 'absolute',
    bottom: input.bottomOffset,
    right: input.rightInset ?? 16,
    width: AGORA_DM_VIDEO_PIP_WIDTH,
    height: AGORA_DM_VIDEO_PIP_HEIGHT,
  };
}

/** Seuil tap court vs drag PiP (WhatsApp). */
export const AGORA_DM_PIP_TAP_MAX_MS = 280;
export const AGORA_DM_PIP_TAP_MAX_MOVE_PX = 12;

export function shouldAgoraDmPipSwapOnRelease(input: {
  elapsedMs: number;
  dx: number;
  dy: number;
}): boolean {
  return (
    input.elapsedMs < AGORA_DM_PIP_TAP_MAX_MS &&
    Math.abs(input.dx) + Math.abs(input.dy) < AGORA_DM_PIP_TAP_MAX_MOVE_PX
  );
}

export function useAgoraDmPipGestures(input: {
  enabled: boolean;
  onTap?: () => void;
  onSwap?: () => void;
  setPipDrag: (x: number, y: number) => void;
  dragX: number | null;
  dragY: number | null;
  defaultX: number;
  defaultY: number;
}) {
  const anchor = useRef({ x: 0, y: 0 });
  const tapStart = useRef(0);
  const onTapRef = useRef(input.onTap);
  const onSwapRef = useRef(input.onSwap);
  const setPipDragRef = useRef(input.setPipDrag);
  const dragRef = useRef({
    x: input.dragX,
    y: input.dragY,
    defaultX: input.defaultX,
    defaultY: input.defaultY,
  });

  onTapRef.current = input.onTap;
  onSwapRef.current = input.onSwap;
  setPipDragRef.current = input.setPipDrag;
  dragRef.current = {
    x: input.dragX,
    y: input.dragY,
    defaultX: input.defaultX,
    defaultY: input.defaultY,
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => input.enabled,
        onStartShouldSetPanResponderCapture: () => input.enabled,
        onMoveShouldSetPanResponder: (_, g) =>
          input.enabled && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
        onMoveShouldSetPanResponderCapture: (_, g) =>
          input.enabled && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          tapStart.current = Date.now();
          const d = dragRef.current;
          anchor.current = {
            x: d.x ?? d.defaultX,
            y: d.y ?? d.defaultY,
          };
        },
        onPanResponderMove: (_, g) => {
          const win = Dimensions.get('window');
          const clamped = clampAgoraDmPipDrag({
            x: anchor.current.x + g.dx,
            y: anchor.current.y + g.dy,
            windowWidth: win.width,
            windowHeight: win.height,
          });
          setPipDragRef.current(clamped.x, clamped.y);
        },
        onPanResponderRelease: (_, g) => {
          const elapsed = Date.now() - tapStart.current;
          if (!shouldAgoraDmPipSwapOnRelease({ elapsedMs: elapsed, dx: g.dx, dy: g.dy })) {
            return;
          }
          if (onTapRef.current) {
            onTapRef.current();
          } else if (onSwapRef.current) {
            onSwapRef.current();
          }
        },
      }),
    [input.enabled],
  );

  return panResponder;
}
