import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { RootNavigationRef, flushPendingActions, resetToTab } from "./utils/navigationRef";
import { NavigationContainer } from "@react-navigation/native";
import MainStack from "./navigation/stack/MainStack";
import { useTokenStore } from "./stores/tokenStore";
import { getRoleFromToken } from "./utils/decodeToken";
import { useUserStore } from "./stores/UserStore";
import * as Localization from 'expo-localization';

type InitialRoute =
  | "Auth"
  | "DailyWelcome"
  | "TabApp"
  | "AppLaunchScreen"
  | "ProficiencyTestScreen"
  | "Admin"
  | "Teacher";

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialScreenName, setInitialScreenName] = useState<InitialRoute>("Auth");

  const initializeTokens = useTokenStore((s) => s.initializeTokens);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const hasValidToken = await initializeTokens();

        // Parse string -> boolean
        const hasDonePlacementTestStr = await AsyncStorage.getItem("hasDonePlacementTest");
        const hasLoggedInStr = await AsyncStorage.getItem("hasLoggedIn");

        const hasDonePlacementTest = hasDonePlacementTestStr === "true";
        const hasLoggedIn = hasLoggedInStr === "true";

        console.log("Boot flags:", { hasValidToken, hasDonePlacementTest, hasLoggedIn });

        const userStore = useUserStore.getState();
        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        if (!savedLanguage) {
          savedLanguage = Localization.locale ? Localization.locale.split("-")[0] : "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
          console.log("Saved default language:", savedLanguage);
        }
        userStore.setNativeLanguage(savedLanguage);

        const currentDate = new Date().toLocaleDateString("en-CA");
        const lastAppOpenDate = await AsyncStorage.getItem("lastAppOpenDate");
        const isFirstOpenToday = lastAppOpenDate !== currentDate;

        await AsyncStorage.setItem("lastAppOpenDate", currentDate);
        console.log("Last app open date updated:", currentDate, "First open today:", isFirstOpenToday);

        const state = useTokenStore.getState();
        const accessToken = state.accessToken;
        const refreshToken = state.refreshToken;

        if (hasValidToken) {
          const roles = accessToken ? getRoleFromToken(accessToken) : [];
          console.log("User roles from token:", roles);

          if (roles.includes("ROLE_ADMIN")) {
            console.log("Navigating to Admin");
            setInitialScreenName("Admin");
          } else if (roles.includes("ROLE_TEACHER")) {
            console.log("Navigating to Teacher");
            setInitialScreenName("Teacher");
          } else if (!hasDonePlacementTest) {
            setInitialScreenName("ProficiencyTestScreen");
          } else {
            console.log("Navigating to", isFirstOpenToday);
            setInitialScreenName(isFirstOpenToday ? "DailyWelcome" : "TabApp");
            if (!isFirstOpenToday) {
              resetToTab("Home");
            }
          }
        } else if (refreshToken) {
          setInitialScreenName("Auth");
        } else {
          setInitialScreenName("AppLaunchScreen");
        }
      } catch (e) {
        console.error("RootNavigation boot error:", e);
        setInitialScreenName("AppLaunchScreen");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    boot();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Foreground Notification:", notification);
      }
    );
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("User tapped notification:", response);
      }
    );

    return () => {
      mounted = false;
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [initializeTokens]);

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
      <MainStack initialRouteName={initialScreenName} />
    </NavigationContainer>
  );
};

export default RootNavigation;