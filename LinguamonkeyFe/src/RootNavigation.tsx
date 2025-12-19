import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, AppState, BackHandler, Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { RootNavigationRef, flushPendingActions, gotoTab } from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService";
import { useTokenStore } from "./stores/tokenStore";
import { isAdmin, decodeToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import { useChatStore } from "./stores/ChatStore";
import * as Localization from "expo-localization";
import instance from "./api/axiosClient";
import SplashScreen from "./screens/Splash/SplashScreen";
import * as Linking from "expo-linking";
import permissionService from "./services/permissionService";
import i18n from "./i18n";
import AuthStack from "./navigation/stack/AuthStack";
import MainStack, { MainStackParamList } from "./navigation/stack/MainStack";
import ChatBubble from "./components/chat/ChatBubble";
import Toast from "react-native-toast-message";
import eventBus from "./events/appEvents";

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [serverErrorMsg, setServerErrorMsg] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const clearTokens = useTokenStore((state) => state.clearTokens);
  const { setUser, setLocalNativeLanguage } = useUserStore();
  const { setAppIsActive, setCurrentAppScreen, initStompClient, disconnectStompClient } = useChatStore();
  const fetchLexiconMaster = useChatStore((state) => state.fetchLexiconMaster);

  const [initialMainRoute, setInitialMainRoute] = useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);
  const appState = useRef(AppState.currentState);
  const lastBackPressed = useRef<number>(0);

  useEffect(() => {
    const handleSessionExpired = async () => {
      // Backup onboarding state before clearing tokens (in case clearTokens wipes all storage)
      const hasOnboarding = await AsyncStorage.getItem("hasFinishedOnboarding");

      Alert.alert(
        "Phiên đăng nhập hết hạn",
        "Tài khoản của bạn đã được đăng nhập trên một thiết bị khác. Vui lòng đăng nhập lại.",
        [{
          text: "OK", onPress: async () => {
            await clearTokens();
            if (hasOnboarding) {
              await AsyncStorage.setItem("hasFinishedOnboarding", hasOnboarding);
            }
          }
        }],
        { cancelable: false }
      );
    };

    eventBus.on("auth.session_expired", handleSessionExpired);
    return () => {
      eventBus.off("auth.session_expired", handleSessionExpired);
    };
  }, [clearTokens]);

  useEffect(() => {
    if (accessToken) {
      initStompClient();
    }
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
      const isActive = nextAppState === "active";
      setAppIsActive(isActive);
      if (accessToken && isActive) {
        initStompClient();
      }
    });
    return () => { subscription.remove(); };
  }, [accessToken, initStompClient, disconnectStompClient, setAppIsActive]);

  const linking = useMemo(() => ({
    prefixes: [
      Linking.createURL("/"),
      "monkeylingua://",
      "https://monkeylingua.vercel.app"
    ],
    config: {
      screens: {
        LoginScreen: "login",
        RegisterScreen: "register",
        TabApp: {
          screens: {
            Home: "home",
            Chat: "chats",
            Profile: "profile",
          },
        },
        PaymentStack: {
          path: 'payment',
          screens: {
            TopUpScreen: 'topup',
            WithdrawScreen: 'withdraw',
            DepositScreen: 'deposit',
            TransactionHistoryScreen: 'history',
            WalletScreen: 'result',
          },
        },
        CourseStack: {
          path: 'course',
          screens: {
            CourseDetail: 'detail/:courseId',
          }
        },
        ChatStack: 'chat-full',
      },
    },
    subscribe(listener: (url: string) => void) {
      const onReceiveURL = ({ url }: { url: string }) => listener(url);
      const eventListener = Linking.addEventListener("url", onReceiveURL);
      return () => { eventListener.remove(); };
    },
  }), []);

  useEffect(() => {
    notificationService.initialize();
    const cleanup = notificationService.setupNotificationListeners();
    permissionService.checkNotificationPermission();
    return () => { if (cleanup) cleanup(); };
  }, []);

  const HEALTH_CHECK_ENDPOINT = "/actuator/health";

  useEffect(() => {
    let mounted = true;
    const waitForConnectivity = async () => {
      while (mounted) {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          setServerErrorMsg("no_internet");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        try {
          const response = await instance.get(HEALTH_CHECK_ENDPOINT, { timeout: 5000 });
          if (response.status === 200) {
            setServerErrorMsg(null);
            return true;
          } else {
            setServerErrorMsg("server_maintenance");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          setServerErrorMsg("server_maintenance");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      return false;
    };

    const boot = async () => {
      try {
        console.log("--- BOOT SEQUENCE START ---");
        setIsLoading(true);

        // Check onboarding status independently
        const hasFinishedOnboarding = await AsyncStorage.getItem("hasFinishedOnboarding");
        if (hasFinishedOnboarding === "true") {
          setInitialAuthParams({ skipToAuth: true });
        } else {
          setInitialAuthParams(undefined);
        }

        if (!accessToken) {
          await initializeTokens();
          const recheckToken = useTokenStore.getState().accessToken;
          if (!recheckToken) {
            setIsUserAdmin(false);
            setInitialMainRoute("TabApp");
            console.log("[BOOT] No token found. Stay at AuthStack.");
            setIsLoading(false);
            return;
          }
        }

        console.log(`[BOOT] Token detected. Verifying user session...`);

        const isHealthy = await waitForConnectivity();
        if (!mounted || !isHealthy) return;

        let currentLocalLang = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!currentLocalLang) {
          currentLocalLang = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", currentLocalLang);
        }

        const currentToken = useTokenStore.getState().accessToken;
        if (currentToken) {
          fetchLexiconMaster();
          const userIsAdmin = isAdmin(currentToken);
          setIsUserAdmin(userIsAdmin);

          const payload = decodeToken(currentToken);

          if (payload?.userId) {
            try {
              console.log(`[BOOT] Fetching user data for ID: ${payload.userId}`);

              const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
              const rawUser = userRes.data.result || {};

              console.log(`[DEBUG] Raw hasFinishedSetup from BE: ${rawUser.hasFinishedSetup}`);

              const backendLang = rawUser.nativeLanguage;
              if (backendLang && backendLang !== currentLocalLang) {
                console.log(`[BOOT] Switching language to user preference: ${backendLang}`);
                await i18n.changeLanguage(backendLang);
                await AsyncStorage.setItem("userLanguage", backendLang);
                currentLocalLang = backendLang;
              } else {
                if (i18n.language !== currentLocalLang) {
                  await i18n.changeLanguage(currentLocalLang);
                }
              }

              setUser({ ...rawUser, userId: rawUser.userId ?? rawUser.id, roles: userIsAdmin ? ["ROLE_ADMIN"] : ["ROLE_USER"] }, currentLocalLang);
              setLocalNativeLanguage(currentLocalLang);

              const hasSetupFinished = useUserStore.getState().hasFinishedSetup || false;
              console.log(`[DEBUG] Store hasFinishedSetup (after setUser): ${hasSetupFinished}`);

              notificationService.registerTokenToBackend();

              let nextRoute: keyof MainStackParamList = "TabApp";

              if (userIsAdmin) {
                nextRoute = "AdminStack";
              } else if (hasSetupFinished === false) {
                nextRoute = "SetupInitScreen";
              } else {
                nextRoute = "TabApp";
              }

              setInitialMainRoute(nextRoute);
              console.log(`[BOOT] DECISION: Setting Initial Route to ${nextRoute}`);

            } catch (userErr) {
              console.error("Fetch user failed", userErr);
              setInitialMainRoute("TabApp");
            }
          }
        }
      } catch (e) {
        console.error("Boot error:", e);
      } finally {
        if (mounted) {
          console.log("--- BOOT SEQUENCE END / Setting isLoading=false ---");
          setIsLoading(false);
        }
      }
    };
    boot();
    return () => { mounted = false; };
  }, [accessToken, initializeTokens, setUser, setLocalNativeLanguage, fetchLexiconMaster]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const debugLog = (...args: any[]) => {
      // console.log('[onBackPress]', ...args);
    };

    const getRootStateSafely = () => {
      const s = (RootNavigationRef as any).getRootState?.() ?? RootNavigationRef.current?.getRootState?.() ?? RootNavigationRef.current?.getState?.();
      return s;
    };

    const onBackPress = () => {
      try {
        debugLog('back pressed');

        if (!RootNavigationRef.isReady()) {
          debugLog('nav not ready -> consume');
          const now = Date.now();
          if (now - lastBackPressed.current < 2000) {
            BackHandler.exitApp();
          } else {
            lastBackPressed.current = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        const rootState = getRootStateSafely();
        debugLog('rootState', !!rootState);

        if (!rootState) {
          const current = RootNavigationRef.current?.getCurrentRoute();
          debugLog('no rootState, current:', current?.name);
          if (!current) {
            const now = Date.now();
            if (now - lastBackPressed.current < 2000) {
              BackHandler.exitApp();
            } else {
              lastBackPressed.current = now;
              Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
            }
            return true;
          }

          if (current.name === 'TabApp') {
            const now = Date.now();
            if (now - lastBackPressed.current < 2000) {
              BackHandler.exitApp();
            } else {
              lastBackPressed.current = now;
              Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
            }
            return true;
          }

          if (RootNavigationRef.canGoBack()) {
            RootNavigationRef.goBack();
            return true;
          }

          const now = Date.now();
          if (now - lastBackPressed.current < 2000) {
            BackHandler.exitApp();
          } else {
            lastBackPressed.current = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        const routes = (rootState as any).routes || [];
        const tabRoute = routes.find((r: any) => r.name === 'TabApp') ?? routes[(rootState as any).index || 0];
        debugLog('tabRoute', !!tabRoute, tabRoute?.name);

        if (!tabRoute) {
          if (RootNavigationRef.canGoBack()) {
            RootNavigationRef.goBack();
            return true;
          }
          const now = Date.now();
          if (now - lastBackPressed.current < 2000) {
            BackHandler.exitApp();
          } else {
            lastBackPressed.current = now;
            Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
          }
          return true;
        }

        const tabState = (tabRoute as any).state || {};
        const activeTabRoute = tabState.routes?.[tabState.index] || { name: 'Home' };
        const activeTabName = activeTabRoute?.name;
        const activeTabNestedIndex = (activeTabRoute as any).state?.index ?? 0;

        debugLog('activeTabName', activeTabName, 'nestedIndex', activeTabNestedIndex);

        if (activeTabNestedIndex > 0) {
          RootNavigationRef.goBack();
          return true;
        }

        if (activeTabName === 'Profile' || activeTabName === 'Learn') {
          gotoTab('Home');
          return true;
        }

        const now = Date.now();
        if (now - lastBackPressed.current < 2000) {
          BackHandler.exitApp();
        } else {
          lastBackPressed.current = now;
          Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
        }
        return true;
      } catch (err) {
        console.error('onBackPress error', err);
        const now = Date.now();
        if (now - lastBackPressed.current < 2000) {
          BackHandler.exitApp();
        } else {
          lastBackPressed.current = now;
          Toast.show({ type: 'info', text1: 'Nhấn trở lại lần nữa để thoát ứng dụng' });
        }
        return true;
      }
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  if (isLoading) return <SplashScreen serverError={serverErrorMsg} />;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={RootNavigationRef}
        linking={linking}
        fallback={<SplashScreen serverError={serverErrorMsg} />}
        onReady={() => {
          flushPendingActions();
        }}
        onStateChange={() => {
          const currentRouteName = RootNavigationRef.current?.getCurrentRoute()?.name;
          setCurrentAppScreen(currentRouteName || null);
        }}
      >
        {accessToken ? <MainStack initialRouteName={initialMainRoute} isAdmin={isUserAdmin} /> : <AuthStack initialParams={initialAuthParams} />}
        {accessToken && <ChatBubble />}
      </NavigationContainer>
    </View>
  );
};

export default RootNavigation;