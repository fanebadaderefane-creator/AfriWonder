import React from 'react';
import { View, Image, StyleProp, ImageStyle, ViewStyle } from 'react-native';
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
  return <Image source={{ uri: u }} style={style} />;
}
