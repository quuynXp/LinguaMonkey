import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Kích thước thiết kế gốc (ví dụ iPhone 11)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// scale theo chiều ngang
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

// scale theo chiều dọc
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

// scale trung bình (kết hợp 2 chiều)
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// font scale (tự động theo user setting)
export const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(size * PixelRatio.getFontScale()));
