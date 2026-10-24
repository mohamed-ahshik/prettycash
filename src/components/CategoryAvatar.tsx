import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { deriveCategoryColors } from '../utils/categoryColors';
import { Icon } from './Icon';

interface CategoryAvatarProps {
  icon: string;
  colorBg: string;
  colorFg: string;
  size?: number;
  iconSize?: number;
}

export function CategoryAvatar({
  icon,
  colorBg,
  colorFg,
  size = 40,
  iconSize = 20,
}: CategoryAvatarProps) {
  const { isDark } = useTheme();
  const derived = deriveCategoryColors(colorBg, colorFg, isDark);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: derived.colorBg },
      ]}
    >
      <Icon name={icon} size={iconSize} color={derived.colorFg} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
