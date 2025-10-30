import { createNavigationContainerRef, NavigationAction } from '@react-navigation/native';
import { RootNavigationRef } from '../utils/navigationRef';
/**
 * Tham chiếu (ref) đến navigation container.
 * Cần được gán vào <NavigationContainer ref={navigationRef}> trong App.tsx.
 */
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Điều hướng đến một màn hình cụ thể.
 * Có thể được gọi từ bất kỳ đâu sau khi navigation đã sẵn sàng.
 * @param name - Tên của route (màn hình).
 * @param params - Tham số truyền cho màn hình.
 */
export function navigate(name: string, params?: object) {
  if (RootNavigationRef.isReady()) {
    (RootNavigationRef.navigate as any)(name, params);
  } else {
    console.warn('[navigationService] Navigation container chưa sẵn sàng.');
  }
}

/**
 * Gửi một hành động (action) điều hướng.
 * @param action - Hành động điều hướng.
 */
export function dispatch(action: NavigationAction) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
  } else {
    console.warn('[navigationService] Navigation container chưa sẵn sàng.');
  }
}
