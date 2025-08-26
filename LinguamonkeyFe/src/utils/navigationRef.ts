import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const RootNavigationRef = createNavigationContainerRef();

// Reset về TabApp và mở đúng tab + (tuỳ chọn) màn hình trong stack của tab đó
export function resetToTab(
  tab: 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile' | 'Admin' | 'Teacher',
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
    console.log('[navigationRef] reset to Tab ->', tab, stackScreen || 'no stack screen');
  };

  if (RootNavigationRef.isReady()) run();
  else queuePending(run);
}

export function gotoTab(
  tab: 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile' | 'Admin' | 'Teacher' | 'Auth' | 'SetupInitScreen' | 'AppLaunchScreen' | 'ProficiencyTestScreen',
  stackScreen?: string,
  stackParams?: object
) {
  let action;

  if (['Home', 'Learn', 'Progress', 'Chat', 'Profile', 'Admin', 'Teacher'].includes(tab)) {
    // TabApp case
    action = CommonActions.navigate({
      name: 'TabApp',
      params: {
        screen: tab,
        params: stackScreen
          ? { screen: stackScreen, params: stackParams }
          : undefined,
      },
    });
  } else {
    // Root-level stack (Auth, Main, …)
    action = CommonActions.navigate({
      name: tab,
      params: stackScreen
        ? { screen: stackScreen, params: stackParams }
        : undefined,
    });
  }

  const run = () => {
    RootNavigationRef.dispatch(action);
    console.log('[navigationRef] goto ->', tab, stackScreen);
  };

  if (RootNavigationRef.isReady()) run();
  else queuePending(run);
}


export function resetToAuth(screen: "Login" | "Register" = "Login") {
  const action = CommonActions.reset({
    index: 0,
    routes: [
      {
        name: "Auth",   // route cấp root (đã khai báo trong MainStack)
        state: {
          index: 0,
          routes: [{ name: screen }], // màn hình con trong AuthStack
        },
      },
    ],
  });

  if (RootNavigationRef.isReady()) {
    RootNavigationRef.dispatch(action);
    console.log("[navigationRef] reset to Auth ->", screen);
  } else {
    console.log("[navigationRef] not ready, queueing action");
    queuePending(() => RootNavigationRef.dispatch(action));
  }
}

// ---- pending queue (giữ nguyên) ----
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
