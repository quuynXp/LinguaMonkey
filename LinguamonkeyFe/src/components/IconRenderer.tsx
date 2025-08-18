import {
    AntDesign,
    Entypo,
    Feather,
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
    Octicons,
} from '@expo/vector-icons';
import React from 'react';

type Props = {
  name: string;
  family: string;
  size?: number;
  color?: string;
};

export const IconRenderer = ({ name, family, size = 24, color = '#000' }: Props) => {
  const icons: Record<string, any> = {
    FontAwesome,
    MaterialIcons,
    Ionicons,
    AntDesign,
    Feather,
    MaterialCommunityIcons,
    Entypo,
    Octicons,
  };

  const IconComponent = icons[family];
  if (!IconComponent) return null;

  return <IconComponent name={name} size={size} color={color} />;
};
