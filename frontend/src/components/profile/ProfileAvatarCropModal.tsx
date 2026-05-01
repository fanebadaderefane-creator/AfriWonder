import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors } from '../../theme/colors';
import { ProfileAvatarCropOverlay } from './ProfileAvatarCropOverlay';

export type ProfileAvatarCropModalProps = {
  visible: boolean;
  uri: string;
  accent?: string;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => Promise<void>;
};

type CropRect = { x: number; y: number; width: number; height: number };
type ImageFrame = { left: number; top: number; width: number; height: number; scale: number };

const CORNER_HIT = 44;
const HANDLE_HIT = 44;
const MIN_CROP_SIZE = 80;
const AVATAR_PROFILE_PHOTO_STEP = 1;
const AVATAR_PROFILE_PHOTO_STEPS_TOTAL = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildImageFrame(
  stageW: number,
  stageH: number,
  naturalW: number,
  naturalH: number,
): ImageFrame | null {
  if (stageW <= 0 || stageH <= 0 || naturalW <= 0 || naturalH <= 0) return null;
  const scale = Math.min(stageW / naturalW, stageH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    left: (stageW - width) / 2,
    top: (stageH - height) / 2,
    width,
    height,
    scale,
  };
}

function clampRectToFrame(rect: CropRect, frame: ImageFrame): CropRect {
  const maxW = frame.width;
  const maxH = frame.height;
  const width = clamp(rect.width, Math.min(MIN_CROP_SIZE, maxW), maxW);
  const height = clamp(rect.height, Math.min(MIN_CROP_SIZE, maxH), maxH);
  const x = clamp(rect.x, frame.left, frame.left + frame.width - width);
  const y = clamp(rect.y, frame.top, frame.top + frame.height - height);
  return { x, y, width, height };
}

type EdgeMask = {
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
};

export function ProfileAvatarCropModal({
  visible,
  uri,
  accent = Colors.primary,
  onCancel,
  onConfirm,
}: ProfileAvatarCropModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();

  const [workingUri, setWorkingUri] = useState(uri);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [stageW, setStageW] = useState(0);
  const [stageH, setStageH] = useState(0);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [busy, setBusy] = useState<'rotate' | 'export' | null>(null);

  const cropStartRef = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const imageFrameRef = useRef<ImageFrame | null>(null);

  useEffect(() => {
    if (!visible) return;
    setWorkingUri(uri);
  }, [visible, uri]);

  useEffect(() => {
    if (!visible || !workingUri) return;
    Image.getSize(
      workingUri,
      (w, h) => {
        setNaturalW(w);
        setNaturalH(h);
      },
      () => {
        setNaturalW(0);
        setNaturalH(0);
      },
    );
  }, [visible, workingUri]);

  const imageFrame = useMemo(
    () => buildImageFrame(stageW, stageH, naturalW, naturalH),
    [stageW, stageH, naturalW, naturalH],
  );

  useEffect(() => {
    imageFrameRef.current = imageFrame;
  }, [imageFrame]);

  useEffect(() => {
    if (!imageFrame) return;
    const w = imageFrame.width * 0.9;
    const h = imageFrame.height * 0.9;
    const next: CropRect = {
      x: imageFrame.left + (imageFrame.width - w) / 2,
      y: imageFrame.top + (imageFrame.height - h) / 2,
      width: w,
      height: h,
    };
    setCropRect(clampRectToFrame(next, imageFrame));
    /** Réinitialise quand la photo / la rotation changent (nouvelles dimensions). */
  }, [
    imageFrame?.left,
    imageFrame?.top,
    imageFrame?.width,
    imageFrame?.height,
    workingUri,
  ]);

  const stageHeight = Math.max(240, windowH - insets.top - 52 - insets.bottom - 72);

  /**
   * Renvoie un geste Pan pour une poignée. `mask` indique quels bords bougent :
   *  - `left`/`right` : largeur (et `x` si bord gauche).
   *  - `top`/`bottom` : hauteur (et `y` si bord haut).
   * Coin = combinaison ; côté = un seul axe.
   */
  const makeHandleGesture = useCallback(
    (mask: EdgeMask) =>
      Gesture.Pan()
        .enabled(!busy && Boolean(imageFrame))
        .runOnJS(true)
        .onStart(() => {
          cropStartRef.current = cropRect;
        })
        .onUpdate(e => {
          const frame = imageFrameRef.current;
          if (!frame) return;
          const start = cropStartRef.current;
          let x = start.x;
          let y = start.y;
          let width = start.width;
          let height = start.height;

          if (mask.left) {
            const right = start.x + start.width;
            const newX = clamp(
              start.x + e.translationX,
              frame.left,
              right - MIN_CROP_SIZE,
            );
            x = newX;
            width = right - newX;
          }
          if (mask.right) {
            width = clamp(
              start.width + e.translationX,
              MIN_CROP_SIZE,
              frame.left + frame.width - start.x,
            );
          }
          if (mask.top) {
            const bottom = start.y + start.height;
            const newY = clamp(
              start.y + e.translationY,
              frame.top,
              bottom - MIN_CROP_SIZE,
            );
            y = newY;
            height = bottom - newY;
          }
          if (mask.bottom) {
            height = clamp(
              start.height + e.translationY,
              MIN_CROP_SIZE,
              frame.top + frame.height - start.y,
            );
          }

          setCropRect(clampRectToFrame({ x, y, width, height }, frame));
        }),
    [busy, imageFrame, cropRect],
  );

  /** Glisser à l'intérieur du cadre = déplacer le cadre sans le redimensionner. */
  const moveGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!busy && Boolean(imageFrame))
        .runOnJS(true)
        .onStart(() => {
          cropStartRef.current = cropRect;
        })
        .onUpdate(e => {
          const frame = imageFrameRef.current;
          if (!frame) return;
          const start = cropStartRef.current;
          setCropRect(
            clampRectToFrame(
              {
                x: start.x + e.translationX,
                y: start.y + e.translationY,
                width: start.width,
                height: start.height,
              },
              frame,
            ),
          );
        }),
    [busy, imageFrame, cropRect],
  );

  const handleRotate = useCallback(async () => {
    if (!workingUri || busy) return;
    setBusy('rotate');
    try {
      const out = await ImageManipulator.manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      setWorkingUri(out.uri);
    } finally {
      setBusy(null);
    }
  }, [workingUri, busy]);

  const handleConfirm = useCallback(async () => {
    if (
      !workingUri ||
      busy ||
      !imageFrame ||
      naturalW <= 0 ||
      naturalH <= 0 ||
      cropRect.width <= 0 ||
      cropRect.height <= 0
    )
      return;
    setBusy('export');
    try {
      const sx = Math.floor((cropRect.x - imageFrame.left) / imageFrame.scale);
      const sy = Math.floor((cropRect.y - imageFrame.top) / imageFrame.scale);
      const sw = Math.floor(cropRect.width / imageFrame.scale);
      const sh = Math.floor(cropRect.height / imageFrame.scale);

      const safeX = clamp(sx, 0, Math.max(0, naturalW - 1));
      const safeY = clamp(sy, 0, Math.max(0, naturalH - 1));
      const safeW = clamp(sw, 1, naturalW - safeX);
      const safeH = clamp(sh, 1, naturalH - safeY);

      const longest = Math.max(safeW, safeH);
      /** Photo de profil : 512 px sur le côté le plus long suffit largement et limite le poids upload. */
      const targetLongest = 512;
      const resizeAction =
        longest > targetLongest
          ? safeW >= safeH
            ? { resize: { width: targetLongest } }
            : { resize: { height: targetLongest } }
          : null;

      const actions = [
        {
          crop: {
            originX: safeX,
            originY: safeY,
            width: safeW,
            height: safeH,
          },
        },
        ...(resizeAction ? [resizeAction] : []),
      ];

      const cropped = await ImageManipulator.manipulateAsync(workingUri, actions, {
        compress: Platform.OS === 'android' ? 0.85 : 0.88,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      await onConfirm(cropped.uri);
    } finally {
      setBusy(null);
    }
  }, [workingUri, busy, imageFrame, naturalW, naturalH, cropRect, onConfirm]);

  const headerPadTop = insets.top + 8;
  const footerPadBottom = Math.max(insets.bottom, 12);

  /** Index des 8 poignées (avec masque d'arêtes affectées). */
  const handles: { key: string; mask: EdgeMask; left: number; top: number }[] = useMemo(() => {
    if (cropRect.width <= 0 || cropRect.height <= 0) return [];
    const { x, y, width, height } = cropRect;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const off = HANDLE_HIT / 2;
    return [
      { key: 'tl', mask: { left: true, top: true }, left: x - off, top: y - off },
      { key: 'tr', mask: { right: true, top: true }, left: x + width - off, top: y - off },
      { key: 'bl', mask: { left: true, bottom: true }, left: x - off, top: y + height - off },
      {
        key: 'br',
        mask: { right: true, bottom: true },
        left: x + width - off,
        top: y + height - off,
      },
      { key: 'l', mask: { left: true }, left: x - off, top: cy - off },
      { key: 'r', mask: { right: true }, left: x + width - off, top: cy - off },
      { key: 't', mask: { top: true }, left: cx - off, top: y - off },
      { key: 'b', mask: { bottom: true }, left: cx - off, top: y + height - off },
    ];
  }, [cropRect]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.root}>
          <View style={[styles.headerRow, { paddingTop: headerPadTop }]}>
            <View style={{ width: CORNER_HIT }} />
            <Text style={styles.stepLabel} accessibilityRole="text">
              {AVATAR_PROFILE_PHOTO_STEP} / {AVATAR_PROFILE_PHOTO_STEPS_TOTAL}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              disabled={Boolean(busy)}
              hitSlop={12}
              style={styles.closeHit}
              accessibilityLabel="Fermer"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={28} color="#CCCCCC" />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.stage, { height: stageHeight }]}
            onLayout={e => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setStageW(w);
              setStageH(h);
            }}
          >
            {imageFrame ? (
              <Image
                source={{ uri: workingUri }}
                style={{
                  position: 'absolute',
                  left: imageFrame.left,
                  top: imageFrame.top,
                  width: imageFrame.width,
                  height: imageFrame.height,
                }}
                resizeMode="stretch"
              />
            ) : (
              <View style={styles.loaderWrap}>
                <ActivityIndicator color={accent} />
              </View>
            )}

            {imageFrame && cropRect.width > 0 && cropRect.height > 0 ? (
              <ProfileAvatarCropOverlay
                stageW={stageW}
                stageH={stageH}
                cropX={cropRect.x}
                cropY={cropRect.y}
                cropW={cropRect.width}
                cropH={cropRect.height}
              />
            ) : null}

            {imageFrame && cropRect.width > 0 ? (
              <GestureDetector gesture={moveGesture}>
                <View
                  style={{
                    position: 'absolute',
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                    backgroundColor: 'transparent',
                  }}
                />
              </GestureDetector>
            ) : null}

            {handles.map(h => (
              <GestureDetector key={h.key} gesture={makeHandleGesture(h.mask)}>
                <View
                  style={[
                    styles.handle,
                    { left: h.left, top: h.top, width: HANDLE_HIT, height: HANDLE_HIT },
                  ]}
                />
              </GestureDetector>
            ))}
          </View>

          <View style={[styles.footerRow, { paddingBottom: footerPadBottom }]}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={Boolean(busy)}
              style={styles.footerBtn}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
            >
              <Text style={[styles.footerText, { color: accent }]}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleRotate()}
              disabled={Boolean(busy) || !workingUri}
              style={styles.rotateHit}
              accessibilityRole="button"
              accessibilityLabel="Rotation"
            >
              <Ionicons name="refresh" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleConfirm()}
              disabled={Boolean(busy) || !imageFrame || cropRect.width <= 0}
              style={styles.footerBtn}
              accessibilityRole="button"
              accessibilityLabel="Terminé"
            >
              <Text style={[styles.footerText, { color: accent }]}>Terminé</Text>
            </TouchableOpacity>
          </View>

          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="large" color={accent} />
            </View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  root: { flex: 1, backgroundColor: '#000000' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  stepLabel: { color: '#AAAAAA', fontSize: 16, fontWeight: '600' },
  closeHit: {
    width: CORNER_HIT,
    height: CORNER_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  handle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 56,
  },
  footerBtn: { minWidth: 88, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  footerText: { fontSize: 17, fontWeight: '700' },
  rotateHit: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
