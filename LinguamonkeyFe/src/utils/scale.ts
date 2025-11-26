import { Dimensions, PixelRatio, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Kích thước thiết kế gốc (guidelineBaseWidth, guidelineBaseHeight)
// Sử dụng kích thước phổ thông cho điện thoại di động (ví dụ: iPhone 11/X)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// --- Native Scale Functions ---
// Scale theo chiều ngang (Responsive Horizontal)
export const scale = (size: number, currentWidth = width) => (currentWidth / guidelineBaseWidth) * size;

// Scale theo chiều dọc (Responsive Vertical)
export const verticalScale = (size: number, currentHeight = height) => (currentHeight / guidelineBaseHeight) * size;

// Scale trung bình (Moderate Scale)
export const moderateScale = (size: number, factor = 0.5, currentWidth = width) =>
  size + (scale(size, currentWidth) - size) * factor;

// Font Scale (sử dụng PixelRatio để tự động điều chỉnh theo cài đặt của người dùng)
// Đảm bảo font không quá nhỏ hoặc quá lớn so với chuẩn
export const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(size * PixelRatio.getFontScale()));

// --- Web Base Dimensions ---
export const BASE_WEB_WIDTH = 1440;
export const BASE_WEB_HEIGHT = 900;

// --- Web Scale Functions ---
export const webScale = (size: number, currentWidth: number) => (size / BASE_WEB_WIDTH) * currentWidth;
export const webVerticalScale = (size: number, currentHeight: number) => (size / BASE_WEB_HEIGHT) * currentHeight;
export const webModerateScale = (size: number, currentWidth: number, factor = 0.5) =>
  size + (webScale(size, currentWidth) - size) * factor;

// Tăng cường cho Font Web để dễ đọc hơn trên màn hình lớn
export const webFontScale = (size: number, currentWidth: number) =>
  (size / BASE_WEB_WIDTH) * currentWidth * 1.1;