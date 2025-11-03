import {Linking, PermissionsAndroid, Platform, Alert} from 'react-native';
import i18n from '../core/i18n/i18n'; // Import file i18n đã cấu hình

// Một hằng số để dễ quản lý
export const PermissionStatus = {
  GRANTED: PermissionsAndroid.RESULTS.GRANTED,
  DENIED: PermissionsAndroid.RESULTS.DENIED,
  NEVER_ASK_AGAIN: PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
};

/**
 * Hiển thị Alert để điều hướng người dùng đến Cài đặt
 */
const showSettingsAlert = () => {
  const {t} = i18n; // Lấy hàm t
  Alert.alert(
    t('permissions.settingsTitle'),
    t('permissions.settingsMessage'),
    [
      {text: t('permissions.cancel'), style: 'cancel'},
      {text: t('permissions.goToSettings'), onPress: () => Linking.openSettings()},
    ],
  );
};

/**
 * Hàm chung để xin các quyền runtime (camera, location, storage...)
 */
const requestRuntimePermission = async (permission, rationaleKey) => {
  if (Platform.OS !== 'android') {
    return PermissionStatus.GRANTED; // iOS xử lý khác
  }

  const {t} = i18n;
  try {
    // Kiểm tra quyền đã có chưa
    const checkGranted = await PermissionsAndroid.check(permission);
    if (checkGranted) {
      return PermissionStatus.GRANTED;
    }

    // Nếu chưa, yêu cầu quyền
    const granted = await PermissionsAndroid.request(permission, {
      title: t(`permissions.${rationaleKey}.title`),
      message: t(`permissions.${rationaleKey}.message`),
      buttonPositive: 'OK',
    });

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Permission granted:', permission);
      return PermissionStatus.GRANTED;
    } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      console.log('Permission never_ask_again:', permission);
      showSettingsAlert(); // Hiển thị alert đến settings
      return PermissionStatus.NEVER_ASK_AGAIN;
    } else {
      console.log('Permission denied:', permission);
      return PermissionStatus.DENIED;
    }
  } catch (err) {
    console.warn(err);
    return PermissionStatus.DENIED;
  }
};

// --- CÁC HÀM XIN QUYỀN CỤ THỂ ---

/**
 * [SỬA LỖI] Quyền Overlay (Hiển thị trên ứng dụng khác)
 * Đây là quyền đặc biệt, không dùng `request`
 */
export const requestOverlayPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const {t} = i18n;
  try {
    const canDraw = await PermissionsAndroid.canDrawOverlays();
    if (canDraw) {
      return true;
    }

    // Nếu không thể, hiển thị Alert giải thích
    Alert.alert(
      t('permissions.overlay.title'),
      t('permissions.overlay.message'),
      [
        {text: t('permissions.cancel'), style: 'cancel'},
        {
          text: t('permissions.goToSettings'),
          onPress: () =>
            // Điều hướng đến đúng màn hình cài đặt Overlay
            Linking.openSettings('android.settings.action.MANAGE_OVERLAY_PERMISSION'),
        },
      ],
    );
    return false;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

/**
 * [MỚI] Quyền Thông báo (Rất cần thiết cho Android 13+)
 */
export const requestNotificationPermission = async () => {
  if (Platform.OS !== 'android') {
    return PermissionStatus.GRANTED;
  }
  // Chỉ cần xin quyền từ Android 13 (API 33) trở lên
  if (Platform.Version < 33) {
    return PermissionStatus.GRANTED;
  }

  return requestRuntimePermission(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    'notifications',
  );
};

/**
 * [MỚI] Quyền Camera
 */
export const requestCameraPermission = async () => {
  return requestRuntimePermission(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    'camera',
  );
};

/**
 * [MỚI] Quyền Vị trí
 * (Nên dùng FINE, COARSE sẽ tự động được cấp theo)
 */
export const requestLocationPermission = async () => {
  return requestRuntimePermission(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    'location',
  );
};

/**
 * [MỚI] Quyền Lưu trữ (Đọc/Ghi)
 * Logic này xử lý cho cả Android cũ và mới (từ Android 13+)
 */
export const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') {
    return PermissionStatus.GRANTED;
  }

  // Từ Android 13 (API 33) trở lên, quyền được chia nhỏ
  if (Platform.Version >= 33) {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      // Thêm READ_MEDIA_AUDIO nếu cần
    ];
    // Dùng requestMultiple cho nhiều quyền
    try {
      const {t} = i18n;
      const statuses = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(statuses).every(
         status => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        return PermissionStatus.GRANTED;
      }
      
      const oneNeverAskAgain = Object.values(statuses).some(
        status => status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      );

      if(oneNeverAskAgain) {
         showSettingsAlert();
         return PermissionStatus.NEVER_ASK_AGAIN;
      }
      
      return PermissionStatus.DENIED;

    } catch (err) {
      console.warn(err);
      return PermissionStatus.DENIED;
    }
  } else {
    // Android 12 trở xuống, dùng quyền cũ
    return requestRuntimePermission(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      'storage',
    );
    // Lưu ý: WRITE_EXTERNAL_STORAGE thường không cần nữa trên Android 10+
    // nếu bạn lưu file vào thư mục của ứng dụng (scoped storage).
  }
};