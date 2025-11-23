import React, { useEffect, useState, useMemo } from "react";
import { Platform, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import messaging, {
  getInitialNotification,
  onMessage,
} from "@react-native-firebase/messaging";
import {
  RootNavigationRef,
  flushPendingActions,
  gotoTab,
} from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken, decodeToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import * as Localization from "expo-localization";
import instance from "./api/axiosClient";
import SplashScreen from "./screens/Splash/SplashScreen";
import * as Linking from "expo-linking";
import permissionService from "./services/permissionService";
import i18n from "./i18n";

import AuthStack from "./navigation/stack/AuthStack";
import MainStack, { MainStackParamList } from "./navigation/stack/MainStack";

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const clearTokens = useTokenStore((state) => state.clearTokens);

  const { user, setUser, setLocalNativeLanguage } = useUserStore();

  const [initialMainRoute, setInitialMainRoute] = useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);

  const linking = useMemo(() => ({
    prefixes: [
      Linking.createURL("/"),
      "monkeylingua://",
      "https://monkeylingua.vercle.app",
    ],
    config: {
      screens: {
        AppLaunchScreen: "welcome",
        LoginScreen: "login",
        RegisterScreen: "register",
        ForgotPasswordScreen: "forgot-password",

        TabApp: {
          screens: {
            Home: "home",
            Learn: "learn",
            Progress: "progress",
            Chat: "chats",
            Profile: "profile",
          },
        },

        LearnStack: {
          screens: {
            Lesson: "lesson/:id",
            CourseDetails: "course/:id",
          }
        },
        AdminStack: "admin",
        ChatStack: "chat-full",
        ProfileStack: "profile-stack",
        PaymentStack: "payment",

        DailyWelcomeScreen: "daily-welcome",
        ProficiencyTestScreen: "proficiency-test",
        SetupInitScreen: "setup",
      },
    },
    subscribe(listener: (url: string) => void) {
      const onReceiveURL = ({ url }: { url: string }) => listener(url);
      const eventListener = Linking.addEventListener("url", onReceiveURL);

      const unsubscribeNotification = messaging().onNotificationOpenedApp(
        (remoteMessage) => {
          console.log("Background Notification Tapped:", remoteMessage);
          handleNotificationNavigation(remoteMessage);
        }
      );

      return () => {
        eventListener.remove();
        unsubscribeNotification();
      };
    },
  }), []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // useEffect(() => {
  //   notificationService.loadPreferences();
  //   if (user?.userId) {
  //     notificationService.registerTokenToBackend();
  //   }
  // }, [user?.userId]);

  useEffect(() => {
    const unsubscribeOnMessage = onMessage(messaging(), async (remoteMessage) => {
      console.log("Foreground Notification (FCM):", remoteMessage);
      notificationService.sendLocalNotification(
        remoteMessage.notification?.title || i18n.t("notification.default_title"),
        remoteMessage.notification?.body || "",
        remoteMessage.data
      );
    });
    return () => unsubscribeOnMessage();
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const hasValidToken = await initializeTokens();

        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!savedLanguage) {
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
        }
        setLocalNativeLanguage(savedLanguage);
        if (i18n.language !== savedLanguage) {
          await i18n.changeLanguage(savedLanguage);
        }

        const currentDate = new Date().toLocaleDateString("en-CA");
        const lastAppOpenDate = await AsyncStorage.getItem("lastAppOpenDate");
        const isFirstOpenToday = lastAppOpenDate !== currentDate;
        await AsyncStorage.setItem("lastAppOpenDate", currentDate);

        if (hasValidToken) {
          const currentToken = useTokenStore.getState().accessToken;
          if (currentToken) {
            try {
              const payload = decodeToken(currentToken);
              if (payload?.userId) {
                const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
                const rawUser = userRes.data.result || {};
                const normalizedUser = {
                  ...rawUser,
                  userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
                  roles: getRoleFromToken(currentToken),
                };
                setUser(normalizedUser, savedLanguage);
                await AsyncStorage.setItem("hasLoggedIn", "true");

                const roles = normalizedUser.roles || [];
                const hasFinishedSetup = (await AsyncStorage.getItem("hasFinishedSetup")) === "true";
                const hasDonePlacementTest = (await AsyncStorage.getItem("hasDonePlacementTest")) === "true";

                if (roles.includes("ROLE_ADMIN")) {
                  setInitialMainRoute("AdminStack");
                } else if (!hasFinishedSetup) {
                  setInitialMainRoute("SetupInitScreen");
                } else if (!hasDonePlacementTest) {
                  setInitialMainRoute("ProficiencyTestScreen");
                } else {
                  setInitialMainRoute(isFirstOpenToday ? "DailyWelcomeScreen" : "TabApp");
                }
              }
            } catch (e) {
              console.error("Boot user fetch failed:", e);
              await clearTokens();
            }
          }
        } else {
          const hasFinishedOnboarding = (await AsyncStorage.getItem("hasFinishedOnboarding")) === "true";
          if (hasFinishedOnboarding) {
            setInitialAuthParams({ skipToAuth: true });
          }
        }
      } catch (e) {
        console.error("Boot error:", e);
        await clearTokens();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    boot();

    const initPermissions = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync("default", {
          name: i18n.t("notification.channel_default_name"),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      await permissionService.checkNotificationPermission();
    };
    initPermissions();

    return () => { mounted = false; };
  }, [initializeTokens, setUser, clearTokens, setLocalNativeLanguage]);

  const handleNotificationNavigation = (remoteMessage: any) => {
    if (!remoteMessage?.data) return;
    const { accessToken: token } = useTokenStore.getState();
    const { screen, stackScreen, ...params } = remoteMessage.data;

    if (screen && token) {
      gotoTab(screen as any, stackScreen, params);
    }
  };

  if (!isConnected) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "red" }}>{i18n.t("common.no_internet")}</Text>
      </View>
    );
  }

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      ref={RootNavigationRef}
      linking={linking}
      fallback={<SplashScreen />}
      onReady={async () => {
        console.log("Navigation Ready");
        const initialMessage = await getInitialNotification(messaging());
        if (initialMessage) {
          handleNotificationNavigation(initialMessage);
        }
        flushPendingActions();
      }}
    >
      {accessToken ? (
        <MainStack initialRouteName={initialMainRoute} />
      ) : (
        <AuthStack initialParams={initialAuthParams} />
      )}
    </NavigationContainer>
  );
};

export default RootNavigation;