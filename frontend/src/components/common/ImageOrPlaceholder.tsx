import React from 'react';
import { View, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  icon?: IconName;
  iconSize?: number;
};

/**
 * Affiche une image distante ou un bloc neutre (plus de picsum / pravatar en prod).
 * expo-image : cache mémoire + disque + recyclingKey (listes / scroll) — moins de re-téléchargements sur 3G.
 */
export function ImageOrPlaceholder({ uri, style, icon = 'image-outline', iconSize = 36 }: Props) {
  const u = typeof uri === 'string' ? uri.trim() : '';
  if (!u) {
    return (
      <View
        style={[
          style as StyleProp<ViewStyle>,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={Colors.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: u }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={u}
      transition={0}
    />
  );
}
