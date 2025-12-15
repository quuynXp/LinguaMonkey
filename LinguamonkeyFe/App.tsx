import React from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from "react-native-toast-message";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/services/queryClient";
import RootNavigation from "./src/RootNavigation";
import "./src/i18n";
import { toastConfig } from "./src/components/Toast";
import { StyleSheet, BackHandler, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import 'react-native-quick-crypto';
import { RootNavigationRef, gotoTab } from './src/utils/navigationRef'; // chỉnh path nếu khác


(function patchBackHandlerForDebug() {
  try {
    if (Platform.OS !== 'android') return;
    // @ts-ignore
    if ((BackHandler as any).__patchedForDebug) return;
    // @ts-ignore
    const orig = BackHandler.addEventListener.bind(BackHandler);
    // @ts-ignore
    (BackHandler as any).__patchedForDebug = true;

    // wrap addEventListener so we can log registrations
    // @ts-ignore
    BackHandler.addEventListener = (eventName: string, handler: (...args: any[]) => boolean) => {
      const id = Math.random().toString(36).slice(2, 8);
      console.log(`[BackHandler.debug] register id=${id} handler=${handler.name || 'anon'}`);
      // wrap handler to log invocation + result
      const wrapped = (...args: any[]) => {
        try {
          console.log(`[BackHandler.debug] invoke id=${id} handler=${handler.name || 'anon'}`);
          const r = handler(...args);
          console.log(`[BackHandler.debug] result id=${id} ->`, r);
          return r;
        } catch (err) {
          console.log(`[BackHandler.debug] handler id=${id} threw`, err);
          return false;
        }
      };
      return orig(eventName, wrapped);
    };
  } catch (e) {
    console.warn('BackHandler debug patch failed', e);
  }
})();

// Force global handler: đăng sau 500ms để chạy trước/ứng xử như listener “ưu tiên”.
// Handler này sẽ chạy central logic: nếu nested screen -> goBack(); nếu tab root Profile/Learn -> goto Home; else double-back-to-exit.
(function registerForceBackHandler() {
  if (Platform.OS !== 'android') return;
  // remove previous if exist
  // @ts-ignore
  if ((global as any).__forceBackRegistered) return;
  // setTimeout để listener này được add sau tất cả listener khởi tạo sớm (nhưng trước listeners động của screens)
  setTimeout(() => {
    // @ts-ignore
    (global as any).__forceBackRegistered = true;

    const lastBack = { t: 0 };

    const handler = () => {
      try {
        // Nếu navigation chưa sẵn sàng, fallback: double back to exit (consume)
        if (!RootNavigationRef.isReady()) {
          const now = Date.now();
          if (now - lastBack.t < 2000) {
            BackHandler.exitApp();
          } else {
            lastBack.t = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        // Lấy root state an toàn
        // @ts-ignore
        const rootState = (RootNavigationRef as any).getRootState?.() ?? RootNavigationRef.current?.getRootState?.() ?? RootNavigationRef.current?.getState?.();

        // Nếu ko có state, dùng fallback current route name
        if (!rootState) {
          const current = RootNavigationRef.current?.getCurrentRoute();
          if (!current) {
            const now = Date.now();
            if (now - lastBack.t < 2000) BackHandler.exitApp();
            else {
              lastBack.t = now;
              Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
            }
            return true;
          }
          // nếu đang ở TabApp fallback -> treat as root home
          if (current.name === 'TabApp') {
            const now = Date.now();
            if (now - lastBack.t < 2000) BackHandler.exitApp();
            else {
              lastBack.t = now;
              Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
            }
            return true;
          }
          // nếu có lịch sử stack -> pop
          if (RootNavigationRef.canGoBack()) {
            RootNavigationRef.goBack();
            return true;
          }
          const now = Date.now();
          if (now - lastBack.t < 2000) BackHandler.exitApp();
          else {
            lastBack.t = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        // tìm TabApp route
        const routes = (rootState as any).routes || [];
        const tabRoute = routes.find((r: any) => r.name === 'TabApp') ?? routes[(rootState as any).index || 0];
        if (!tabRoute) {
          if (RootNavigationRef.canGoBack()) {
            RootNavigationRef.goBack();
            return true;
          }
          const now = Date.now();
          if (now - lastBack.t < 2000) BackHandler.exitApp();
          else {
            lastBack.t = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        const tabState = (tabRoute as any).state || {};
        const activeTabRoute = tabState.routes?.[tabState.index] || { name: 'Home' };
        const activeTabName = activeTabRoute?.name;
        const activeTabNestedIndex = (activeTabRoute as any).state?.index ?? 0;

        // nested screen -> goBack()
        if (activeTabNestedIndex > 0) {
          RootNavigationRef.goBack();
          return true;
        }

        // if on Profile or Learn tab root -> goto Home
        if (activeTabName === 'Profile' || activeTabName === 'Learn') {
          gotoTab('Home');
          return true;
        }

        // else double-back-to-exit
        const now2 = Date.now();
        if (now2 - lastBack.t < 2000) {
          BackHandler.exitApp();
        } else {
          lastBack.t = now2;
          Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
        }
        return true;
      } catch (e) {
        console.warn('forceBackHandler error', e);
        const now = Date.now();
        if (now - (lastBack.t || 0) < 2000) BackHandler.exitApp();
        else {
          (lastBack as any).t = now;
          Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
        }
        return true;
      }
    };

    BackHandler.addEventListener('hardwareBackPress', handler);
    console.log('[APP] force back handler registered');
  }, 500);
})();

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={styles.container}>
            <RootNavigation />
            <Toast config={toastConfig} />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});