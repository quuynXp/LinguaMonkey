import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const RootNavigationRef = createNavigationContainerRef();

let pendingActions: (() => void)[] = [];

// Định nghĩa kiểu dữ liệu trả về từ Backend
interface NotificationPayload {
  screen?: string;      // Ví dụ: "Chat", "Home"
  stackScreen?: string; // Ví dụ: "ChatDetail"
  [key: string]: any;   // Các params khác: chatId, courseId...
}

function queuePending(fn: () => void) {
  pendingActions.push(fn);
}

export function flushPendingActions() {
  if (!pendingActions.length) return;
  const copy = [...pendingActions];
  pendingActions = [];
  copy.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('[navigationRef] pending action error', e);
    }
  });
}

/**
 * Xử lý data từ notification để navigate
 * Hỗ trợ input là remoteMessage (Firebase) hoặc data object trực tiếp (Expo)
 */
export const handleNotificationNavigation = (raw: any) => {
  // Extract data: Nếu là remoteMessage thì lấy .data, nếu không thì dùng trực tiếp raw
  const data = (raw?.data ? raw.data : raw) as NotificationPayload;

  if (!data || !data.screen) {
    console.log("🚀 Notification Navigation: No screen provided in payload", data);
    return;
  }

  const { screen, stackScreen, ...params } = data;
  console.log("🚀 Notification Navigation ->", { screen, stackScreen, params });

  gotoTab(screen, stackScreen, params);
};

export function resetToTab(
  destination:
    | 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile'
    | 'AdminStack' | 'SetupInitScreen' | 'DailyWelcomeScreen' | 'ProficiencyTestScreen',
  stackScreen?: string,
  stackParams?: object
) {
  const isTab = ['Home', 'Learn', 'Progress', 'Chat', 'Profile'].includes(destination);

  let routes;

  if (isTab) {
    routes = [
      {
        name: 'TabApp',
        state: {
          index: 0,
          routes: [
            {
              name: destination,
              ...(stackScreen ? { state: { index: 0, routes: [{ name: stackScreen, params: stackParams }] } } : {}),
            },
          ],
        },
      },
    ];
  } else {
    routes = [
      {
        name: destination,
        params: stackScreen ? { screen: stackScreen, params: stackParams } : stackParams
      }
    ];
  }

  const action = CommonActions.reset({
    index: 0,
    routes: routes,
  });

  const run = () => {
    if (RootNavigationRef.isReady()) {
      RootNavigationRef.dispatch(action);
      console.log(`[navigationRef] reset -> ${destination} (IsTab: ${isTab})`);
    }
  };

  if (RootNavigationRef.isReady()) run();
  else queuePending(run);
}

export function gotoTab(
  screenName: string,
  nestedScreen?: string,
  nestedParams?: object
) {
  if (!RootNavigationRef.isReady()) {
    queuePending(() => gotoTab(screenName, nestedScreen, nestedParams));
    return;
  }

  const isTab = ['Home', 'Learn', 'Progress', 'Chat', 'Profile'].includes(screenName);
  let action;

  if (isTab) {
    action = CommonActions.navigate({
      name: 'TabApp',
      params: {
        screen: screenName,
        params: nestedScreen ? { screen: nestedScreen, params: nestedParams } : undefined,
      },
    });
  } else {
    action = CommonActions.navigate({
      name: screenName,
      params: nestedScreen ? { screen: nestedScreen, params: nestedParams } : nestedParams || undefined,
    });
  }

  RootNavigationRef.dispatch(action);
  console.log('[navigationRef] goto ->', screenName, nestedScreen);
}

export function goBack() {
  const run = () => {
    if (RootNavigationRef.canGoBack()) {
      RootNavigationRef.goBack();
    }
  };

  if (RootNavigationRef.isReady()) run();
  else queuePending(run);
}

export function resetToAuth(screen: 'LoginScreen' | 'RegisterScreen' = 'LoginScreen') {
  console.log('[navigationRef] resetToAuth triggered');

  const action = CommonActions.reset({
    index: 0,
    routes: [{ name: 'AuthStack', params: { screen } }],
  });

  if (RootNavigationRef.isReady()) {
    RootNavigationRef.dispatch(action);
  } else {
    queuePending(() => RootNavigationRef.dispatch(action));
  }
}