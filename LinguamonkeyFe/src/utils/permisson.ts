import { Linking } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { Platform } from 'react-native';

async function requestOverlayPermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW,
        {
          title: 'Overlay Permission',
          message: 'App cần quyền hiển thị bong bóng chat trên ứng dụng khác',
          buttonPositive: 'OK',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Linking.openSettings();
      }
    } catch (err) {
      console.warn(err);
    }
  }
}
