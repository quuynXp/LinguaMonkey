import React from 'react';
import { StyleSheet, Platform, View, Text, ViewStyle, TextStyle, Image, ImageStyle } from 'react-native';
import Toast, { BaseToastProps, ToastShowParams } from 'react-native-toast-message';

interface ShowToastParams {
  message?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

// const APP_LOGO_SOURCE = require('../assets/icons/icon_96.png');

// const APP_LOGO_SOURCE = require('../assets/icons/icon.png');

export const showToast = ({ message, type = 'info' }: ShowToastParams) => {
  Toast.show({
    type: type,
    text1: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  } as ToastShowParams);
};

const getColorByType = (type: string) => {
  switch (type) {
    case 'success': return '#28a745';
    case 'error': return '#dc3545';
    case 'warning': return '#ffc107';
    case 'info': default: return '#007bff';
  }
};

const styles = StyleSheet.create({
  container: {
    height: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  } as ViewStyle,
  appLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  } as ImageStyle,
  text1: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  } as TextStyle,
});

interface CustomToastProps extends BaseToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
}

const CustomBaseToast = ({ ...props }: CustomToastProps) => {
  const borderColor = getColorByType(props.type);

  return (
    <View style={[styles.container, { borderLeftColor: borderColor }]}>
      {/* <Image source={APP_LOGO_SOURCE} style={styles.appLogo} /> */}
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