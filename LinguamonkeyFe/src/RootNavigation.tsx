import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import messaging from '@react-native-firebase/messaging';
import {
  RootNavigationRef,
  flushPendingActions,
  resetToTab,
  gotoTab,
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
    console.log('No data payload in notification.');
    return;
  }

  const { data } = remoteMessage;
  const { screen, stackScreen, ...params } = data;

  if (screen) {
    console.log(`Navigating to: ${screen} -> ${stackScreen} with params:`, params);
    gotoTab(
      screen as any,
      stackScreen,
      params
    );
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
    // 1. Khi app đang mở (Foreground)
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('Foreground Notification (FCM):', remoteMessage);
      notificationService.sendLocalNotification(
        remoteMessage.notification?.title || 'Thông báo',
        remoteMessage.notification?.body || '',
        remoteMessage.data
      );
    });

    const unsubscribeOnOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Background Notification Tapped (FCM):', remoteMessage);
      handleNotificationNavigation(remoteMessage);
    });

    // messaging()
    //   .getInitialNotification()
    //   .then(remoteMessage => {
    //     if (remoteMessage) {
    //       console.log('Quit State Notification Tapped (FCM):', remoteMessage);
    //     }
    //   });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnOpen();
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
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
          console.log("Saved default language:", savedLanguage);
        }
        userStore.setLocalNativeLanguage(savedLanguage);

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
              // userStore.setAuthenticated(true);
              await AsyncStorage.setItem("hasLoggedIn", "true");

              // **THAY ĐỔI: Kiểm tra ADMIN trước tiên**
              const roles = getRoleFromToken(accessToken);
              console.log("User roles from token:", roles);

              if (roles.includes("ROLE_ADMIN")) {
                console.log(
                  "User is ADMIN. Bypassing setup/test and routing to Admin screen."
                );
                setInitialScreenName("Admin");
                setInitialRouteParams(undefined);
                return; // Dừng tại đây, đưa Admin vào màn hình
              }

              // **THAY ĐỔI: User không phải admin mới kiểm tra setup**
              if (!hasFinishedSetup) {
                console.log(
                  "User (non-admin) logged in but has NOT finished setup. Forcing SetupInitScreen."
                );
                setInitialScreenName("SetupInitScreen");
                setInitialRouteParams(undefined);
                return; // Dừng tại đây, buộc user (non-admin) vào Setup
              }

              // **THAY ĐỔI: Bỏ logic ROLE_TEACHER**
              // Chỉ xử lý user thường (đã qua check admin và check setup)
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

    return () => {
      mounted = false;
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
    return <SplashScreen />;
  }

  // const linking = {
  //   prefixes: ['linguamonkey://'],
  //   config: {
  //     screens: {
  //       TabApp: {
  //         screens: {
  //           Chat: {
  //             screens: {
  //               ChatDetail: 'chat/:chatId',
  //             },
  //           },
  //           Profile: 'profile',
  //         },
  //       },
  //       Auth: 'auth',
  //     },
  //   },
  //   async getInitialURL() {
  //     const message = await messaging().getInitialNotification();
  //     const url = message?.data?.link;

  //     if (url) {
  //       return url;
  //     }

  //     return Notifications.getInitialNotificationAsync()
  //       .then(response => response?.notification.request.content.data?.url);
  //   },
  //   subscribe(listener: (url: string) => void) {
  //     const onNotification = (response: Notifications.NotificationResponse) => {
  //       const url = response.notification.request.content.data?.url as string;
  //       if (url) {
  //         listener(url);
  //       }
  //     };

  //     const subscription = Notifications.addNotificationResponseReceivedListener(onNotification);

  //     const unsubscribeFirebase = messaging().onNotificationOpenedApp(remoteMessage => {
  //       const url = remoteMessage.data?.link as string;
  //       if (url) {
  //         listener(url);
  //       } else {
  //         handleNotificationNavigation(remoteMessage);
  //       }
  //     });

  //     return () => {
  //       subscription.remove();
  //       unsubscribeFirebase();
  //     };
  //   },
  // };

  return (
    <NavigationContainer
      ref={RootNavigationRef}
      onReady={async () => {
        console.log("Navigation is ready");
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage) {
          console.log('Handling Quit State Notification onReady:');
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