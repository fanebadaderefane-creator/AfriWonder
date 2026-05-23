import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  stageW: number;
  stageH: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
};

/** Assombrissement autour du cadre + grille + coins (pointerEvents: none). */
export function ProfileAvatarCropOverlay({ stageW, stageH, cropX, cropY, cropW, cropH }: Props) {
  const t = Math.max(0, cropY);
  const b = Math.max(0, stageH - cropY - cropH);
  const l = Math.max(0, cropX);
  const r = Math.max(0, stageW - cropX - cropW);

  const gridThirdX = cropW / 3;
  const gridThirdY = cropH / 3;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} accessibilityElementsHidden>
      <View style={[styles.dim, { height: t, width: stageW }]} />
      <View style={{ flexDirection: 'row', height: cropH }}>
        <View style={[styles.dim, { width: l }]} />
        <View style={{ width: cropW, height: cropH }}>
          <View style={[styles.gridLineV, { left: gridThirdX }]} />
          <View style={[styles.gridLineV, { left: gridThirdX * 2 }]} />
          <View style={[styles.gridLineH, { top: gridThirdY }]} />
          <View style={[styles.gridLineH, { top: gridThirdY * 2 }]} />
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View
            style={[
              styles.edgeTick,
              { top: 0, left: cropW / 2 - 10, width: 20, height: 2 },
            ]}
          />
          <View
            style={[
              styles.edgeTick,
              { bottom: 0, left: cropW / 2 - 10, width: 20, height: 2 },
            ]}
          />
          <View
            style={[
              styles.edgeTick,
              { left: 0, top: cropH / 2 - 10, width: 2, height: 20 },
            ]}
          />
          <View
            style={[
              styles.edgeTick,
              { right: 0, top: cropH / 2 - 10, width: 2, height: 20 },
            ]}
          />
        </View>
        <View style={[styles.dim, { width: r }]} />
      </View>
      <View style={[styles.dim, { height: b, width: stageW }]} />
    </View>
  );
}

const CORNER = 4;
const EDGE = 22;

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  corner: {
    position: 'absolute',
    width: EDGE,
    height: EDGE,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER,
    borderLeftWidth: CORNER,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER,
    borderRightWidth: CORNER,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER,
    borderLeftWidth: CORNER,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER,
    borderRightWidth: CORNER,
  },
  edgeTick: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
});
