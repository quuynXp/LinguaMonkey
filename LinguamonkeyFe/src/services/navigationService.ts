import { createNavigationContainerRef, NavigationAction } from '@react-navigation/native';

/**
 * Tham chiếu (ref) đến navigation container.
 * Cần được gán vào <NavigationContainer ref={navigationRef}> trong App.tsx.
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Điều hướng đến một màn hình cụ thể.
 * Có thể được gọi từ bất kỳ đâu sau khi navigation đã sẵn sàng.
 * @param name - Tên của route (màn hình).
 * @param params - Tham số truyền cho màn hình.
 */
export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    // Thực hiện điều hướng
    navigationRef.navigate(name as never, params as never);
  } else {
    // Xử lý trường hợp navigation chưa sẵn sàng
    // Có thể implement một hàng đợi (queue) ở đây nếu cần
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
