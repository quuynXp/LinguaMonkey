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

// Cập nhật Type: Thêm các màn hình Auth vào danh sách hỗ trợ
export function gotoTab(
  screenName:
    // Tab Screens
    | 'Home' | 'Learn' | 'Progress' | 'Chat' | 'Profile'
    // Main Stack Screens
    | 'AdminStack' | 'LearnStack' | 'PaymentStack' | 'ChatStack' | 'ProfileStack' | 'ProgressStack' | 'CourseStack' | 'RoadmapStack'
    | 'DailyWelcomeScreen' | 'ProficiencyTestScreen' | 'SetupInitScreen'
    // Auth Stack Screens (Thêm mới)
    | 'LoginScreen' | 'RegisterScreen' | 'ForgotPasswordScreen',
  nestedScreen?: string,
  nestedParams?: object
) {
  if (!RootNavigationRef.isReady()) {
    queuePending(() => gotoTab(screenName, nestedScreen, nestedParams));
    return;
  }

  let action;

  // 1. Nếu là Tab con của TabApp (Navigation lồng nhau)
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
  // 2. Các màn hình ngang hàng (Siblings) trong Stack hiện tại (AuthStack hoặc MainStack)
  else {
    action = CommonActions.navigate({
      name: screenName,
      params: nestedScreen
        ? { screen: nestedScreen, params: nestedParams } // Trường hợp Stack lồng Stack (VD: LearnStack -> Lesson)
        : nestedParams || undefined, // Trường hợp Screen thường (VD: LoginScreen)
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