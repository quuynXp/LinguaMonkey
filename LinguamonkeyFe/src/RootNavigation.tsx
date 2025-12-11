import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { RootNavigationRef, flushPendingActions } from "./utils/navigationRef";
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

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [serverErrorMsg, setServerErrorMsg] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const { setUser, setLocalNativeLanguage } = useUserStore();
  const { setAppIsActive, setCurrentAppScreen, initStompClient, disconnectStompClient } = useChatStore();

  const [initialMainRoute, setInitialMainRoute] = useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);
  const appState = useRef(AppState.currentState);

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

  // --- CẤU HÌNH DEEP LINKING ---
  const linking = useMemo(() => ({
    // 1. Prefixes phải trùng với AndroidManifest.xml
    prefixes: [
      Linking.createURL("/"),
      "monkeylingua://",
      "https://monkeylingua.vercel.app"
    ],
    config: {
      // Cấu hình fallback cho màn hình chưa login
      screens: {
        LoginScreen: "login",
        RegisterScreen: "register",

        // Cấu hình cho MainStack (Sau khi login)
        // RootNavigation sẽ tự tìm screen trong stack đang active

        // 1. Tab Bar
        TabApp: {
          screens: {
            Home: "home",
            Chat: "chats",
            Profile: "profile",
          },
        },

        // 2. Payment Stack (Quan trọng cho VNPAY)
        // URL: monkeylingua://payment/...
        PaymentStack: {
          path: 'payment',
          screens: {
            // WalletScreen: 'wallet',
            TopUpScreen: 'topup',
            WithdrawScreen: 'withdraw',
            DepositScreen: 'deposit',
            TransactionHistoryScreen: 'history',

            // Hứng link: monkeylingua://payment/result?...
            WalletScreen: 'result',
          },
        },

        // 3. Các Stack khác (Optional - map để support mở từ noti sau này)
        CourseStack: {
          path: 'course',
          screens: {
            CourseDetail: 'detail/:courseId', // monkeylingua://course/detail/123
          }
        },

        // Catch-all cho Chat
        ChatStack: 'chat-full',
      },
    },
    // Đảm bảo listener hoạt động chuẩn
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

  // ... (Giữ nguyên logic boot và check server của bạn) ...
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
        setIsLoading(true);
        await initializeTokens();
        const isHealthy = await waitForConnectivity();
        if (!mounted || !isHealthy) return;

        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!savedLanguage) {
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
        }
        setLocalNativeLanguage(savedLanguage);
        if (i18n.language !== savedLanguage) await i18n.changeLanguage(savedLanguage);

        const currentToken = useTokenStore.getState().accessToken;
        if (currentToken) {
          const userIsAdmin = isAdmin(currentToken);
          setIsUserAdmin(userIsAdmin);
          const payload = decodeToken(currentToken);
          if (payload?.userId) {
            try {
              const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
              const rawUser = userRes.data.result || {};
              setUser({ ...rawUser, userId: rawUser.userId ?? rawUser.id, roles: userIsAdmin ? ["ROLE_ADMIN"] : ["ROLE_USER"] }, savedLanguage);
              notificationService.registerTokenToBackend();

              if (userIsAdmin) {
                setInitialMainRoute("AdminStack");
              } else if (rawUser.hasFinishedSetup === false) {
                setInitialMainRoute("SetupInitScreen");
              } else {
                setInitialMainRoute("TabApp");
              }
            } catch (userErr) {
              console.error("Fetch user failed", userErr);
              setInitialMainRoute("TabApp");
            }
          }
        }
      } catch (e) {
        console.error("Boot error:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    boot();
    return () => { mounted = false; };
  }, [initializeTokens, setUser, setLocalNativeLanguage]);

  if (isLoading) return <SplashScreen serverError={serverErrorMsg} />;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={RootNavigationRef}
        linking={linking} // Đã cập nhật linking
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