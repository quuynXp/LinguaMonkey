import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const RootNavigationRef = createNavigationContainerRef();

let pendingActions: (() => void)[] = [];

interface NotificationPayload {
  screen?: string;
  stackScreen?: string;
  screenName?: string;
  [key: string]: any;
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

export const handleNotificationNavigation = (raw: any) => {
  const data = (raw?.data ? raw.data : raw) as NotificationPayload;

  if (!data || !data.screen) {
    console.log("🚀 Notification Navigation: No screen provided in payload", data);
    return;
  }

  const { screen, stackScreen, screenName, ...params } = data;

  const targetNestedScreen = stackScreen || screenName;

  console.log("🚀 Notification Navigation ->", { screen, targetNestedScreen, params });

  gotoTab(screen, targetNestedScreen, params);
};

export function resetToTab(
  destination:
    | 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile'
    | 'AdminStack' | 'SetupInitScreen' | 'DailyWelcomeScreen' | 'ProficiencyTestScreen' | 'ResetPasswordScreen' | 'PaymentStack' | 'CourseStack' | 'RoadmapStack' | 'ChatStack',
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
  console.log('[navigationRef] goto ->', screenName, nestedScreen, nestedParams);
}

export function goBack(): boolean {
  if (!RootNavigationRef.isReady()) {
    return false;
  }

  if (RootNavigationRef.canGoBack()) {
    RootNavigationRef.goBack();
    return true;
  }

  return false;
}

export function resetToAuth(screen: 'LoginScreen' | 'RegisterScreen' = 'LoginScreen') {
  console.log('[navigationRef] resetToAuth triggered. Access token expected to be cleared by caller.');
}