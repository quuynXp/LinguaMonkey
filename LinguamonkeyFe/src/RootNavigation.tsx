import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import messaging, {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import {
  RootNavigationRef,
  flushPendingActions,
  resetToTab,
  gotoTab,
  resetToAuth,
} from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService";
import MainStack from "./navigation/stack/MainStack";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken, decodeToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import * as Localization from "expo-localization";
import instance from "./api/axiosInstance";
import SplashScreen from "./screens/Splash/SplashScreen";
import { API_BASE_URL } from "./api/apiConfig";
import * as Linking from "expo-linking";
import permissionService from "./services/permissionService";
import i18n from "./i18n";

console.log("API_URL:", API_BASE_URL);

type InitialRoute =
  | "Auth"
  | "DailyWelcome"
  | "TabApp"
  | "AppLaunchScreen"
  | "ProficiencyTestScreen"
  | "SetupInitScreen"
  | "Admin";

const handleNotificationNavigation = (remoteMessage: any) => {
  if (!remoteMessage || !remoteMessage.data) {
    console.log("No data payload in notification.");
    return;
  }

  const { accessToken } = useTokenStore.getState();
  const { data } = remoteMessage;
  const { screen, stackScreen, ...params } = data;

  if (screen) {
    if (!accessToken) {
      console.log("User not authenticated, redirecting to Auth.");
      resetToAuth("Login");
      return;
    }

    console.log(
      `Navigating to: ${screen} -> ${stackScreen} with params:`,
      params
    );
    gotoTab(screen as any, stackScreen, params);
  }
};

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialScreenName, setInitialScreenName] =
    useState<InitialRoute>("AppLaunchScreen");

  const { user, setUser } = useUserStore.getState();

  const [initialRouteParams, setInitialRouteParams] = useState<
    object | undefined
  >(undefined);
  const [isConnected, setIsConnected] = useState(true);

  const initializeTokens = useTokenStore((s) => s.initializeTokens);

  const linking = {
    prefixes: [
      Linking.createURL("/"),
      "monkeylingua://",
      "https://monkeylingua.vercle.app",
    ],
    config: {
      screens: {
        Auth: {
          screens: {
            Login: "login",
            Register: "register",
            ForgotPassword: "forgot-password",
          },
        },
        TabApp: {
          screens: {
            Home: "home",
            Learn: "learn",
            Progress: "progress",
            Chat: {
              screens: {
                ChatList: "chats",
                ChatDetail: "chat/:chatId",
              },
            },
            Profile: "profile",
          },
        },
        DailyWelcome: "daily-welcome",
        ProficiencyTestScreen: "proficiency-test",
        SetupInitScreen: "setup",
        Admin: "admin",
        Teacher: "teacher",
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
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    notificationService.loadPreferences();
    if (user?.userId) {
      notificationService.registerTokenToBackend();
    }
  }, [user?.userId]);

  useEffect(() => {
    const unsubscribeOnMessage = onMessage(
      messaging(),
      async (remoteMessage) => {
        console.log("Foreground Notification (FCM):", remoteMessage);
        notificationService.sendLocalNotification(
          remoteMessage.notification?.title || i18n.t("notification.default_title"),
          remoteMessage.notification?.body || "",
          remoteMessage.data
        );
      }
    );

    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const hasValidToken = await initializeTokens();

        const hasDonePlacementTest =
          (await AsyncStorage.getItem("hasDonePlacementTest")) === "true";
        const hasLoggedIn =
          (await AsyncStorage.getItem("hasLoggedIn")) === "true";

        const hasFinishedOnboarding =
          (await AsyncStorage.getItem("hasFinishedOnboarding")) === "true";

        const hasFinishedSetup =
          (await AsyncStorage.getItem("hasFinishedSetup")) === "true";

        console.log("Boot flags:", {
          hasValidToken,
          hasDonePlacementTest,
          hasLoggedIn,
          hasFinishedOnboarding,
          hasFinishedSetup,
        });

        if (!hasValidToken && hasLoggedIn) {
          console.log("Token invalid but hasLoggedIn=true, cleaning up");
          await useTokenStore.getState().clearTokens();
          await AsyncStorage.setItem("hasLoggedIn", "false");
          setInitialScreenName("AppLaunchScreen");
          setInitialRouteParams({ skipToAuth: true });
          return;
        }

        const userStore = useUserStore.getState();
        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!savedLanguage) {
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
          console.log("Saved default language:", savedLanguage);
        }
        userStore.setLocalNativeLanguage(savedLanguage);

        if (i18n.language !== savedLanguage) {
          await i18n.changeLanguage(savedLanguage);
        }

        const currentDate = new Date().toLocaleDateString("en-CA");
        const lastAppOpenDate = await AsyncStorage.getItem("lastAppOpenDate");
        const isFirstOpenToday = lastAppOpenDate !== currentDate;

        await AsyncStorage.setItem("lastAppOpenDate", currentDate);
        console.log(
          "Last app open date updated:",
          currentDate,
          "First open today:",
          isFirstOpenToday
        );

        const state = useTokenStore.getState();
        const accessToken = state.accessToken;

        if (hasValidToken && accessToken) {
          try {
            const payload = decodeToken(accessToken);
            if (payload?.userId) {
              setUser({ ...user, userId: payload.userId });
              const userRes = await instance.get(
                `/api/v1/users/${payload.userId}`
              );
              const rawUser = userRes.data.result || {};
              const normalizedUser = {
                ...rawUser,
                userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
                roles: getRoleFromToken(accessToken),
              };
              userStore.setUser(normalizedUser, savedLanguage);
              await AsyncStorage.setItem("hasLoggedIn", "true");

              const roles = getRoleFromToken(accessToken);
              console.log("User roles from token:", roles);

              if (roles.includes("ROLE_ADMIN")) {
                setInitialScreenName("Admin");
                setInitialRouteParams(undefined);
                return;
              }

              if (!hasFinishedSetup) {
                setInitialScreenName("SetupInitScreen");
                setInitialRouteParams(undefined);
                return;
              }

              if (!hasDonePlacementTest) {
                setInitialScreenName("ProficiencyTestScreen");
              } else {
                setInitialScreenName(
                  isFirstOpenToday ? "DailyWelcome" : "TabApp"
                );
                setInitialRouteParams(undefined);
                if (!isFirstOpenToday) {
                  resetToTab("Home");
                }
              }
            }
          } catch (e) {
            console.error("Boot fetch user failed:", e);
            await useTokenStore.getState().clearTokens();
            setInitialScreenName("AppLaunchScreen");
            setInitialRouteParams({ skipToAuth: true });
            return false;
          }
        } else {
          if (hasFinishedOnboarding) {
            setInitialScreenName("AppLaunchScreen");
            setInitialRouteParams({ skipToAuth: true });
          } else {
            setInitialScreenName("AppLaunchScreen");
            setInitialRouteParams(undefined);
          }
        }
        return false;
      } catch (e) {
        console.error("RootNavigation boot error:", e);
        setInitialScreenName("AppLaunchScreen");
        setInitialRouteParams({ skipToAuth: true });
        return false;
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [initializeTokens, user, setUser]);

  useEffect(() => {
    const initPermissions = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync("default", {
          name: i18n.t("notification.channel_default_name"),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const hasNotiPermission = await permissionService.checkNotificationPermission();
      if (!hasNotiPermission) {
        console.log("User denied notification permission");
      }
    };

    initPermissions();
  }, []);

  if (!isConnected) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: "red",
            textAlign: "center",
          }}
        >
          {i18n.t("common.no_internet")}
        </Text>
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
        console.log("Navigation is ready");
        const initialMessage = await getInitialNotification(messaging());
        if (initialMessage) {
          console.log("Handling Quit State Notification onReady:");
          handleNotificationNavigation(initialMessage);
        }
        flushPendingActions();
      }}
    >
      <MainStack
        initialRouteName={initialScreenName}
        initialParams={initialRouteParams}
      />
    </NavigationContainer>
  );
};

export default RootNavigation;