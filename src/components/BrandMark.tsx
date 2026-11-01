import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const BRAND_MARK = require('../../assets/brand-mark.png');

interface BrandMarkProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function BrandMark({ size = 48, style }: BrandMarkProps) {
  return (
    <Image
      source={BRAND_MARK}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessible
      accessibilityLabel="PrettyCash logo"
    />
  );
}
