import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { RootNavigationRef, flushPendingActions } from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken, decodeToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import { useChatStore } from "./stores/ChatStore"; // Import ChatStore
import * as Localization from "expo-localization";
import instance from "./api/axiosClient";
import SplashScreen from "./screens/Splash/SplashScreen";
import * as Linking from "expo-linking";
import permissionService from "./services/permissionService";
import i18n from "./i18n";
import AuthStack from "./navigation/stack/AuthStack";
import MainStack, { MainStackParamList } from "./navigation/stack/MainStack";
import ChatBubble from "./components/chat/ChatBubble"; // Import ChatBubble

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [serverErrorMsg, setServerErrorMsg] = useState<string | null>(null);

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const clearTokens = useTokenStore((state) => state.clearTokens);
  const { setUser, setLocalNativeLanguage } = useUserStore();
  const { setAppIsActive, setCurrentAppScreen } = useChatStore();

  const [initialMainRoute, setInitialMainRoute] = useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);
  const appState = useRef(AppState.currentState);

  // AppState Listener for Notification Logic
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
      const isActive = nextAppState === "active";
      setAppIsActive(isActive);
      console.log(`AppState changed to: ${nextAppState}`);
    });
    return () => { subscription.remove(); };
  }, [setAppIsActive]);

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
        // ... other mapping
      },
    },
    subscribe(listener: (url: string) => void) {
      const onReceiveURL = ({ url }: { url: string }) => listener(url);
      const eventListener = Linking.addEventListener("url", onReceiveURL);
      return () => { eventListener.remove(); };
    },
  }), []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => { setIsConnected(state.isConnected ?? false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    notificationService.initialize();
    const cleanup = notificationService.setupNotificationListeners();
    permissionService.checkNotificationPermission();
    return () => { if (cleanup) cleanup(); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      if (!mounted) return;
      try {
        setIsLoading(true);
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
          // ... User Fetch Logic (kept identical to your context) ...
          const currentToken = useTokenStore.getState().accessToken;
          const payload = decodeToken(currentToken!);
          if (payload?.userId) {
            const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
            const rawUser = userRes.data.result || {};
            setUser({ ...rawUser, userId: rawUser.userId ?? rawUser.id, roles: getRoleFromToken(currentToken!) }, savedLanguage);
            notificationService.registerTokenToBackend();
            setInitialMainRoute("TabApp"); // Simplified for brevity
          }
        }
      } catch (e) { console.error("Boot error:", e); }
      finally { if (mounted) setIsLoading(false); }
    };
    boot();
    return () => { mounted = false; };
  }, [initializeTokens, setUser, setLocalNativeLanguage, accessToken]);

  if (!isConnected) return <View style={{ flex: 1, justifyContent: "center" }}><Text>No Internet</Text></View>;
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
      </NavigationContainer>
      {/* Mount ChatBubble here to float over entire app */}
      {accessToken && <ChatBubble />}
    </View>
  );
};

export default RootNavigation;