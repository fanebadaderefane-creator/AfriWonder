/**
 * Fond conversation DM — motif discret type WhatsApp (clair).
 */
import React, { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height: screenH } = Dimensions.get('window');

const WALLPAPER_ICON_NAMES = [
  'chatbubble-outline',
  'heart-outline',
  'camera-outline',
  'musical-notes-outline',
  'happy-outline',
  'star-outline',
  'cloud-outline',
  'call-outline',
  'videocam-outline',
  'mic-outline',
] as const;

export const ChatWallpaperPattern = memo(function ChatWallpaperPattern() {
  const tiles = useMemo(() => {
    const rows = 16;
    const cols = 7;
    const out: {
      key: string;
      name: (typeof WALLPAPER_ICON_NAMES)[number];
      left: number;
      top: number;
      rotate: string;
    }[] = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const name = WALLPAPER_ICON_NAMES[i % WALLPAPER_ICON_NAMES.length];
        i++;
        out.push({
          key: `${r}-${c}`,
          name,
          left: (c / cols) * width + (r % 2 === 0 ? 0 : 14),
          top: (r / rows) * screenH,
          rotate: `${((r + c) % 5) * 15 - 30}deg`,
        });
      }
    }
    return out;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      {tiles.map((t) => (
        <View
          key={t.key}
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            left: t.left,
            top: t.top,
            transform: [{ rotate: t.rotate }],
          }}
        >
          <Ionicons name={t.name} size={20} color="rgba(17,27,33,0.06)" />
        </View>
      ))}
    </View>
  );
});
