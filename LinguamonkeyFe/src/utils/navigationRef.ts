import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const RootNavigationRef = createNavigationContainerRef();

let pendingActions: (() => void)[] = [];

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
 * Reset navigation stack.
 * Hỗ trợ cả Tab (Home, Learn...) và Screen cấp cao (AdminStack, SetupInitScreen...)
 */
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
    // Nếu là Tab, bọc nó trong TabApp
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
    // Nếu là AdminStack hoặc các màn hình full-screen khác, reset trực tiếp
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