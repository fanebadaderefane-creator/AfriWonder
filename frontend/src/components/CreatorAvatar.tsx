import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { toAbsoluteMediaUrl } from '../utils/absoluteMediaUrl';
import { Colors } from '../theme/colors';

export function creatorInitials(
  username?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  const u = (username || '').trim().replace(/^@+/, '');
  if (u.length >= 2) return u.slice(0, 2).toUpperCase();
  if (u.length === 1) {
    const extra = (firstName || '').trim()[0] || u;
    return (u + extra).slice(0, 2).toUpperCase();
  }
  const combined = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
  if (combined.length >= 2) return combined.replace(/\s+/g, '').slice(0, 2).toUpperCase();
  if (combined.length === 1) return (combined + combined).toUpperCase();
  return '?';
}

type Props = {
  uri?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: number;
  onPress?: () => void;
  /** Tests Maestro / Appium */
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Bordure blanche type feed TikTok */
  bordered?: boolean;
};

export function CreatorAvatar({
  uri,
  username,
  firstName,
  lastName,
  size = 48,
  onPress,
  testID,
  style,
  bordered = true,
}: Props) {
  const abs = toAbsoluteMediaUrl((uri || '').trim()).trim();
  const showImage = Boolean(abs);
  const initials = creatorInitials(username, firstName, lastName);
  const r = size / 2;
  const borderStyle = bordered ? styles.ring : null;

  const inner = showImage ? (
    <Image source={{ uri: abs }} style={[styles.img, { width: size, height: size, borderRadius: r }, borderStyle]} />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: r }, borderStyle]}>
      <Text style={[styles.fallbackText, { fontSize: Math.max(11, size * 0.34) }]} numberOfLines={1}>
        {initials}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        activeOpacity={0.82}
        style={style}
        accessibilityRole="button"
        accessibilityLabel="Profil du créateur"
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={style}>{inner}</View>;
}

const styles = StyleSheet.create({
  img: { backgroundColor: '#222' },
  ring: { borderWidth: 2, borderColor: '#FFF' },
  fallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
