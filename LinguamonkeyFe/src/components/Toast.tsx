import React from 'react';
import { StyleSheet, Platform, View, Text, ViewStyle, TextStyle, Image, ImageStyle } from 'react-native'; // Import ImageStyle
import Toast, { BaseToastProps, ToastShowParams } from 'react-native-toast-message';

interface ShowToastParams {
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const APP_LOGO_SOURCE = require('../assets/icons/icon_96.png');

const getTitleByType = (type: string) => {
  switch (type) {
    case 'success': return 'Thành công';
    case 'error': return 'Lỗi';
    case 'warning': return 'Cảnh báo';
    case 'info': default: return 'Thông báo';
  }
};

export const showToast = ({ title, message, type = 'info' }: ShowToastParams) => {
  const finalTitle = title || getTitleByType(type);

  Toast.show({
    type: type,
    text1: message ? `${finalTitle}: ${message}` : finalTitle,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  } as ToastShowParams);
};

const styles = StyleSheet.create({
  container: {
    height: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    width: '94%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  } as ViewStyle,
  // Đã sửa: Sử dụng ImageStyle thay vì ViewStyle
  appLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
    resizeMode: 'contain',
  } as ImageStyle, // Chỉ định rõ kiểu là ImageStyle
  text1: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flexShrink: 1,
  } as TextStyle,
});

interface CustomToastProps extends BaseToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
}

const CustomBaseToast = ({ type, ...props }: CustomToastProps) => {
  return (
    <View style={styles.container}>
      {/* Không cần thay đổi gì ở đây, vì styles.appLogo đã đúng kiểu */}
      <Image source={APP_LOGO_SOURCE} style={styles.appLogo} />
      <Text style={styles.text1} numberOfLines={3}>
        {props.text1}
      </Text>
    </View>
  );
};

export const toastConfig = {
  error: (props: BaseToastProps) => <CustomBaseToast {...props} type="error" />,
  success: (props: BaseToastProps) => <CustomBaseToast {...props} type="success" />,
  info: (props: BaseToastProps) => <CustomBaseToast {...props} type="info" />,
  warning: (props: BaseToastProps) => <CustomBaseToast {...props} type="warning" />,
};

export default Toast;