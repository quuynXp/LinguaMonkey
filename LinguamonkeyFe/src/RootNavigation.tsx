import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Platform, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import { RootNavigationRef, flushPendingActions, resetToTab } from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import notificationService from './services/notificationService';
import MainStack from "./navigation/stack/MainStack";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken, decodeToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import * as Localization from "expo-localization";
import instance from "./api/axiosInstance";
import { EXPO_PUBLIC_API_BASE_URL } from "react-native-dotenv";

const API_URL = EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
console.log("API_URL", API_URL);

type InitialRoute =
  | "Auth"
  | "DailyWelcome"
  | "TabApp"
  | "AppLaunchScreen"
  | "ProficiencyTestScreen"
  | "SetupInitScreen"
  | "Admin"
  | "Teacher";

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialScreenName, setInitialScreenName] =
    useState<InitialRoute>("AppLaunchScreen");

    const { user, setUser } = useUserStore.getState();

  const [initialRouteParams, setInitialRouteParams] = useState<object | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(true);

  const initializeTokens = useTokenStore((s) => s.initializeTokens);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

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
    notificationService.requestPermissions();
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

        // TRƯỜNG HỢP 1: Token hết hạn (đã từng đăng nhập)
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
          savedLanguage = locales[0].languageCode || 'en';
          await AsyncStorage.setItem("userLanguage", savedLanguage);
          console.log("Saved default language:", savedLanguage);
        }
        userStore.setNativeLanguage(savedLanguage);

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

        // TRƯỜNG HỢP 2: Đã đăng nhập và token CÒN HẠN
        if (hasValidToken && accessToken) {
          try {
            const payload = decodeToken(accessToken);
            if (payload?.userId) {
              setUser({ ...user, userId: payload.userId });
              const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
              const rawUser = userRes.data.result || {};
              const normalizedUser = {
                ...rawUser,
                userId:
                  rawUser.userId ?? rawUser.user_id ?? rawUser.id,
                roles: getRoleFromToken(accessToken),
              };
              userStore.setUser(normalizedUser);
              userStore.setAuthenticated(true);
              await AsyncStorage.setItem("hasLoggedIn", "true");

              if (!hasFinishedSetup) {
                console.log("User logged in but has NOT finished setup. Forcing SetupInitScreen.");
                setInitialScreenName("SetupInitScreen");
                setInitialRouteParams(undefined);
                return; // Dừng tại đây, buộc user vào Setup
              }

              const roles = getRoleFromToken(accessToken);
              console.log("User roles from token:", roles);


              if (roles.includes("ROLE_ADMIN")) {
                setInitialScreenName("Admin");
                setInitialRouteParams(undefined);
              } else if (roles.includes("ROLE_TEACHER")) {
                setInitialScreenName("Teacher");
                setInitialRouteParams(undefined);
              } else {
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
            }
          } catch (e) {
            console.error("Boot fetch user failed:", e);
            await useTokenStore.getState().clearTokens();
            setInitialScreenName("AppLaunchScreen");
            setInitialRouteParams({ skipToAuth: true });
            return false;
          }
          // TRƯỜNG HỢP 3: Chưa bao giờ đăng nhập (không có token)
        } else {
          if (hasFinishedOnboarding) {
            // Đã xem slide rồi -> Về AppLaunchScreen, skip đến Quick Start
            setInitialScreenName("AppLaunchScreen");
            setInitialRouteParams({ skipToAuth: true });
          } else {
            // Lần đầu mở app -> Về AppLaunchScreen, không skip
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

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Foreground Notification:", notification);
      });
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("User tapped notification:", response);
      });

    return () => {
      mounted = false;
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, [initializeTokens, user, setUser]);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    };
    requestNotificationPermission();
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
          🚫No internet connection. {"\n"}
          Please check your network.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={RootNavigationRef}
      onReady={() => {
        console.log("Navigation is ready");
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
