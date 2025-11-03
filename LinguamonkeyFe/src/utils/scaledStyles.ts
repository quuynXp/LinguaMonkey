import { StyleSheet, TextStyle, ViewStyle, ImageStyle, Platform, Dimensions } from 'react-native';
import { scale, verticalScale, moderateScale, fontScale } from './scale';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const { width, height } = Dimensions.get('window');

// --- Base dimensions cho web (desktop/laptop)
const BASE_WEB_WIDTH = 1440;
const BASE_WEB_HEIGHT = 900;

// --- Scale logic cho web
const webScale = (size: number) => (size / BASE_WEB_WIDTH) * width;
const webVerticalScale = (size: number) => (size / BASE_WEB_HEIGHT) * height;
const webModerateScale = (size: number, factor = 0.5) =>
  size + (webScale(size) - size) * factor;
const webFontScale = (size: number) => (size / BASE_WEB_WIDTH) * width * 1.1;

// --- chọn scale phù hợp platform
const getPlatformScale = {
  scale: Platform.OS === 'web' ? webScale : scale,
  verticalScale: Platform.OS === 'web' ? webVerticalScale : verticalScale,
  moderateScale: Platform.OS === 'web' ? webModerateScale : moderateScale,
  fontScale: Platform.OS === 'web' ? webFontScale : fontScale,
};

// --- core logic mapping property -> scale
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
          scaled[key][prop] = getPlatformScale.scale(value);
        } else if (
          propLower.includes('height') ||
          propLower.includes('top') ||
          propLower.includes('bottom')
        ) {
          scaled[key][prop] = getPlatformScale.verticalScale(value);
        } else if (propLower.includes('font')) {
          scaled[key][prop] = getPlatformScale.fontScale(value);
        } else if (propLower.includes('radius')) {
          scaled[key][prop] = getPlatformScale.moderateScale(value);
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
