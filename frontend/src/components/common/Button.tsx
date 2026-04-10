import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
    };

    // Size styles
    switch (size) {
      case 'small':
        base.paddingVertical = Spacing.sm;
        base.paddingHorizontal = Spacing.md;
        break;
      case 'large':
        base.paddingVertical = Spacing.lg;
        base.paddingHorizontal = Spacing.xxl;
        break;
      default:
        base.paddingVertical = Spacing.md;
        base.paddingHorizontal = Spacing.xl;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        base.backgroundColor = Colors.surface;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1;
        base.borderColor = Colors.primary;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      default:
        base.backgroundColor = Colors.primary;
    }

    if (disabled) {
      base.opacity = 0.5;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
    };

    // Size styles
    switch (size) {
      case 'small':
        base.fontSize = FontSizes.sm;
        break;
      case 'large':
        base.fontSize = FontSizes.lg;
        break;
      default:
        base.fontSize = FontSizes.md;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
      case 'ghost':
        base.color = Colors.primary;
        break;
      default:
        base.color = Colors.text;
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.text} />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
