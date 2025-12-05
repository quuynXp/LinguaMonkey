import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { RootNavigationRef, flushPendingActions } from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken, decodeToken } from "./utils/decodeToken";
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

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const { setUser, setLocalNativeLanguage } = useUserStore();
  const { setAppIsActive, setCurrentAppScreen, initStompClient, disconnectStompClient } = useChatStore();

  const [initialMainRoute, setInitialMainRoute] = useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);
  const appState = useRef(AppState.currentState);

  // --- GLOBAL STOMP CONNECTION MANAGEMENT ---
  useEffect(() => {
    // 1. Connect if we have a token on mount
    if (accessToken) {
      initStompClient();
    }

    // 2. Manage connection based on Foreground/Background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
      const isActive = nextAppState === "active";
      setAppIsActive(isActive);

      if (accessToken) {
        if (isActive) {
          console.log("[Root] App foreground, reconnecting socket...");
          initStompClient();
        } else {
          // Optional: Disconnect on background to save battery
          // console.log("[Root] App background, disconnecting socket...");
          // disconnectStompClient(); 
        }
      }
    });

    return () => { subscription.remove(); };
  }, [accessToken, initStompClient, disconnectStompClient, setAppIsActive]);

  const linking = useMemo(() => ({
    prefixes: [Linking.createURL("/"), "monkeylingua://", "https://monkeylingua.vercel.app"],
    config: {
      screens: {
        AppLaunchScreen: "welcome",
        LoginScreen: "login",
        TabApp: {
          screens: { Home: "home", Chat: "chats" },
        },
        ChatStack: "chat-full",
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

  const HEALTH_CHECK_ENDPOINT = "/health";

  const waitForConnectivity = async () => {
    while (true) {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setServerErrorMsg("no_internet");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      try {
        await instance.get(HEALTH_CHECK_ENDPOINT, { timeout: 3000 });
        setServerErrorMsg(null);
        break;
      } catch (error: any) {
        if (error.response) {
          setServerErrorMsg(null);
          break;
        } else {
          setServerErrorMsg("server_maintenance");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      if (!mounted) return;
      try {
        setIsLoading(true);

        await waitForConnectivity();
        if (!mounted) return;

        const hasValidToken = await initializeTokens();
        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!savedLanguage) {
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
        }
        setLocalNativeLanguage(savedLanguage);
        if (i18n.language !== savedLanguage) await i18n.changeLanguage(savedLanguage);

        if (hasValidToken && useTokenStore.getState().accessToken) {
          const currentToken = useTokenStore.getState().accessToken;
          const payload = decodeToken(currentToken!);
          if (payload?.userId) {
            try {
              const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
              const rawUser = userRes.data.result || {};
              setUser({ ...rawUser, userId: rawUser.userId ?? rawUser.id, roles: getRoleFromToken(currentToken!) }, savedLanguage);
              notificationService.registerTokenToBackend();
              setInitialMainRoute("TabApp");
            } catch (userErr) {
              console.error("Fetch user failed", userErr);
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
        linking={linking}
        fallback={<SplashScreen serverError={serverErrorMsg} />}
        onReady={() => {
          console.log("Navigation Ready");
          flushPendingActions();
        }}
        onStateChange={() => {
          const currentRouteName = RootNavigationRef.current?.getCurrentRoute()?.name;
          setCurrentAppScreen(currentRouteName || null);
        }}
      >
        {accessToken ? <MainStack initialRouteName={initialMainRoute} /> : <AuthStack initialParams={initialAuthParams} />}
        {accessToken && <ChatBubble />}
      </NavigationContainer>
    </View>
  );
};

export default RootNavigation;