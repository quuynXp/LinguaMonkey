import React from 'react';
import { StyleSheet, Platform, View, Text, ViewStyle, TextStyle, Image, ImageStyle } from 'react-native';
import Toast, { BaseToastProps, ToastShowParams } from 'react-native-toast-message';

interface ShowToastParams {
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const APP_LOGO_SOURCE = require('../assets/icons/icon_96.png');

// Hàm này không còn được sử dụng vì đã bỏ dòng title
// const getTitleByType = (type: string) => {
//   switch (type) {
//     case 'success': return 'Thành công';
//     case 'error': return 'Lỗi';
//     case 'warning': return 'Cảnh báo';
//     case 'info': default: return 'Thông báo';
//   }
// };

export const showToast = ({ message, type = 'info' }: ShowToastParams) => {
  // text1 chỉ còn là message, bỏ title
  Toast.show({
    type: type,
    text1: message, // Chỉ dùng message
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  } as ToastShowParams);
};

const styles = StyleSheet.create({
  container: {
    height: 'auto',
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    width: '95%',
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
  appLogo: {
    width: 32, // Tăng kích thước icon
    height: 32, // Tăng kích thước icon
    marginRight: 12, // Điều chỉnh margin cho cân đối
    resizeMode: 'contain',
  } as ImageStyle,
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

const CustomBaseToast = ({ ...props }: CustomToastProps) => {
  return (
    <View style={styles.container}>
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