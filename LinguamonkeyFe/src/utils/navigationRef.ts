import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { useTokenStore } from '../stores/tokenStore';

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
      console.error("[navigationRef] pending action error", e);
    }
  });
}

export function resetToTab(
  tab: 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile',
  stackScreen?: string,
  stackParams?: object
) {
  const action = CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'TabApp',
        state: {
          index: 0,
          routes: [
            {
              name: tab,
              ...(stackScreen ? { state: { index: 0, routes: [{ name: stackScreen, params: stackParams }] } } : {}),
            },
          ],
        },
      },
    ],
  });

  const run = () => {
    RootNavigationRef.dispatch(action);
    console.log('[navigationRef] reset to Tab ->', tab);
  };

  if (RootNavigationRef.isReady()) run();
  else queuePending(run);
}

export function gotoTab(
  screenName:
    | 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile'
    | 'AdminStack' | 'LearnStack' | 'PaymentStack' | 'ChatStack' | 'ProfileStack' | 'ProgressStack' | 'RoadmapStack'
    | 'DailyWelcomeScreen' | 'ProficiencyTestScreen' | 'SetupInitScreen' | 'AuthStack',
  nestedScreen?: string,
  nestedParams?: object
) {
  if (!RootNavigationRef.isReady()) {
    queuePending(() => gotoTab(screenName, nestedScreen, nestedParams));
    return;
  }

  let action;

  // 1. Nếu là Tab con của TabApp
  if (['Home', 'Learn', 'Progress', 'Chat', 'Profile'].includes(screenName)) {
    action = CommonActions.navigate({
      name: 'TabApp',
      params: {
        screen: screenName,
        params: nestedScreen
          ? { screen: nestedScreen, params: nestedParams }
          : undefined,
      },
    });
  }
  // 2. Nếu là các Feature Stack hoặc Screen nằm ngang hàng (Siblings) trong MainStack
  else {
    action = CommonActions.navigate({
      name: screenName,
      params: nestedScreen
        ? { screen: nestedScreen, params: nestedParams }
        : undefined,
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

export function resetToAuth(screen: "LoginScreen" | "RegisterScreen" = "LoginScreen") {
  console.log("[navigationRef] resetToAuth triggered");
  useTokenStore.getState().clearTokens();
}