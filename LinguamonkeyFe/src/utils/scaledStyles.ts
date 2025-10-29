import { StyleSheet, TextStyle, ViewStyle, ImageStyle } from 'react-native';
import { scale, verticalScale, moderateScale, fontScale } from './scale';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export const createScaledSheet = <T extends NamedStyles<T>>(styles: T): T => {
  const scaled: any = {};

  Object.keys(styles).forEach((key) => {
    const style = styles[key];
    scaled[key] = {};

    Object.entries(style).forEach(([prop, value]) => {
      if (typeof value === 'number') {
        const propLower = prop.toLowerCase();

        if (
          propLower.includes('width') ||
          propLower.includes('margin') ||
          propLower.includes('padding') ||
          propLower.includes('left') ||
          propLower.includes('right') ||
          propLower.includes('border')
        ) {
          scaled[key][prop] = scale(value);
        } else if (
          propLower.includes('height') ||
          propLower.includes('top') ||
          propLower.includes('bottom')
        ) {
          scaled[key][prop] = verticalScale(value);
        } else if (propLower.includes('font')) {
          scaled[key][prop] = fontScale(value);
        } else if (propLower.includes('radius')) {
          scaled[key][prop] = moderateScale(value);
        } else {
          scaled[key][prop] = value;
        }
      } else {
        scaled[key][prop] = value;
      }
    });
  });

  return StyleSheet.create(scaled) as T;
};
