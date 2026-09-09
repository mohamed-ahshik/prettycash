import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color }: IconProps) {
  return <MaterialCommunityIcons name={name as MCIconName} size={size} color={color} />;
}
