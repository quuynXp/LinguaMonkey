import React, { useEffect, useState, useMemo } from "react";
import { Platform, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import messaging, {
  onMessage,
} from "@react-native-firebase/messaging";
import {
  RootNavigationRef,
  flushPendingActions,
} from "./utils/navigationRef"; // Giữ lại RootNavigationRef và flushPendingActions
import { NavigationContainer } from "@react-navigation/native";
import notificationService from "./services/notificationService"; // Sử dụng service đã có listener
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

// Thêm logic đăng ký FCM Token (Giữ nguyên)
const registerFCMToken = async (userId: string) => {
  const { fcmToken, isTokenRegistered, setToken, setTokenRegistered } =
    useUserStore.getState();

  if (fcmToken && isTokenRegistered) {
    console.log("FCM Token already registered.");
    return;
  }

  try {
    let token = fcmToken;
    let registered = isTokenRegistered;

    // 1. Lấy token mới nếu chưa có
    if (!token) {
      console.log("Requesting new FCM token...");
      await messaging().requestPermission();
      token = await messaging().getToken();
      if (token) {
        setToken(token); // Cập nhật vào store
        registered = false;
        console.log("New FCM Token obtained:", token);
      } else {
        console.warn("Failed to obtain FCM token.");
        return;
      }
    }

    // 2. Đăng ký/Cập nhật token lên server
    if (token && !registered) {
      const payload = {
        userId,
        fcmToken: token,
        deviceId: useUserStore.getState().deviceId,
      };

      await instance.post("/api/v1/users/fcm-token", payload);
      setTokenRegistered(true);
      console.log("FCM Token successfully registered on server.");
    }
  } catch (error) {
    console.error("FCM Token registration failed:", error);
    setTokenRegistered(false);
  }
};

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const accessToken = useTokenStore((state) => state.accessToken);
  const initializeTokens = useTokenStore((state) => state.initializeTokens);
  const clearTokens = useTokenStore((state) => state.clearTokens);

  const { user, setUser, setLocalNativeLanguage, fcmToken, isTokenRegistered } =
    useUserStore();

  const [initialMainRoute, setInitialMainRoute] =
    useState<keyof MainStackParamList>("TabApp");
  const [initialAuthParams, setInitialAuthParams] = useState<any>(undefined);

  const linking = useMemo(
    () => ({
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
            },
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

        // 👉 XÓA: Loại bỏ onNotificationOpenedApp ở đây, để logic này nằm gọn trong notificationService.ts
        // const unsubscribeNotification = messaging().onNotificationOpenedApp((remoteMessage) => { ... });

        // Tạm thời giữ lại việc unsubcribe cho clean up, nhưng nếu bạn đã xóa listener trên thì chỉ cần return eventListener.remove
        return () => {
          eventListener.remove();
          // unsubscribeNotification(); // Nếu đã xóa listener
        };
      },
    }),
    []
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Kích hoạt Listener xử lý TẤT CẢ các trạng thái click Notification (Foreground/Background/Quit)
  useEffect(() => {
    // Service này sẽ bao gồm logic onNotificationOpenedApp và getInitialNotification
    const cleanup = notificationService.setupNotificationListeners();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // ✅ Xử lý Notification ở trạng thái Foreground (Hiển thị local noti khi app đang mở)
  useEffect(() => {
    const unsubscribeOnMessage = onMessage(
      messaging(),
      async (remoteMessage) => {
        console.log("Foreground Notification (FCM):", remoteMessage);
        // Sau khi nhận, chuyển sang hiển thị Local Notification (có thể kèm data để click)
        notificationService.sendLocalNotification(
          remoteMessage.notification?.title ||
          i18n.t("notification.default_title"),
          remoteMessage.notification?.body || "",
          remoteMessage.data
        );
      }
    );
    return () => unsubscribeOnMessage();
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const hasValidToken = await initializeTokens();

        // 1. Initial Language Load (from Local)
        let savedLanguage = await AsyncStorage.getItem("userLanguage");
        const locales = Localization.getLocales();
        if (!savedLanguage) {
          savedLanguage = locales[0].languageCode || "en";
          await AsyncStorage.setItem("userLanguage", savedLanguage);
        }
        setLocalNativeLanguage(savedLanguage);

        // Initial i18n set from storage
        if (i18n.language !== savedLanguage) {
          await i18n.changeLanguage(savedLanguage);
        }

        if (hasValidToken) {
          const currentToken = useTokenStore.getState().accessToken;
          if (currentToken) {
            try {
              const payload = decodeToken(currentToken);
              if (payload?.userId) {
                const userId = payload.userId;

                const userRes = await instance.get(`/api/v1/users/${userId}`);
                const rawUser = userRes.data.result || {};
                const normalizedUser = {
                  ...rawUser,
                  userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
                  roles: getRoleFromToken(currentToken),
                };

                // 2. Sync Language from User Profile (if different from local)
                if (
                  normalizedUser.nativeLanguageCode &&
                  normalizedUser.nativeLanguageCode !== savedLanguage
                ) {
                  await i18n.changeLanguage(normalizedUser.nativeLanguageCode);
                  await AsyncStorage.setItem(
                    "userLanguage",
                    normalizedUser.nativeLanguageCode
                  );
                  setLocalNativeLanguage(normalizedUser.nativeLanguageCode);
                  savedLanguage = normalizedUser.nativeLanguageCode;
                }

                setUser(normalizedUser, savedLanguage);
                await AsyncStorage.setItem("hasLoggedIn", "true");

                // === BỔ SUNG LOGIC KIỂM TRA & ĐĂNG KÝ FCM TOKEN SAU KHI CÓ USER ID ===
                const isTokenMissingOrUnregistered =
                  !useUserStore.getState().fcmToken ||
                  !useUserStore.getState().isTokenRegistered;

                if (isTokenMissingOrUnregistered) {
                  await registerFCMToken(userId);
                }
                // ====================================================================

                const roles = normalizedUser.roles || [];

                // 3. Check Backend Status Flags instead of AsyncStorage
                const hasFinishedSetup = normalizedUser.hasFinishedSetup === true;
                const hasDonePlacementTest =
                  normalizedUser.hasDonePlacementTest === true;

                // Daily Welcome Check
                const today = new Date().toISOString().split("T")[0];
                const lastDailyWelcomeAt = normalizedUser.lastDailyWelcomeAt;
                let isFirstOpenToday = true;

                if (lastDailyWelcomeAt) {
                  const lastDateString = new Date(lastDailyWelcomeAt)
                    .toISOString()
                    .split("T")[0];
                  if (lastDateString === today) {
                    isFirstOpenToday = false;
                  }
                }

                if (roles.includes("ROLE_ADMIN")) {
                  setInitialMainRoute("AdminStack");
                } else if (!hasFinishedSetup) {
                  setInitialMainRoute("SetupInitScreen");
                } else if (!hasDonePlacementTest) {
                  setInitialMainRoute("ProficiencyTestScreen");
                } else {
                  if (isFirstOpenToday) {
                    setInitialMainRoute("DailyWelcomeScreen");
                  } else {
                    setInitialMainRoute("TabApp");
                  }
                }
              }
            } catch (e) {
              console.error("Boot user fetch failed:", e);
            }
          }
        } else {
          // Fallback for onboarding check (still local as it precedes login)
          const hasFinishedOnboarding =
            (await AsyncStorage.getItem("hasFinishedOnboarding")) === "true";
          if (hasFinishedOnboarding) {
            setInitialAuthParams({ skipToAuth: true });
          }
        }
      } catch (e) {
        console.error("Boot error:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    boot();

    const initPermissions = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: i18n.t("notification.channel_default_name"),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
      await permissionService.checkNotificationPermission();
    };
    initPermissions();

    return () => {
      mounted = false;
    };
  }, [
    initializeTokens,
    setUser,
    clearTokens,
    setLocalNativeLanguage,
    fcmToken,
    isTokenRegistered,
  ]);

  // 👉 XÓA: Loại bỏ hàm handleNotificationNavigation LẶP LẠI ở đây
  // const handleNotificationNavigation = (remoteMessage: any) => { ... };

  if (!isConnected) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, color: "red" }}>
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
        console.log("Navigation Ready");

        // 👉 XÓA: Loại bỏ việc gọi getInitialNotification ở đây
        // Logic này đã được chuyển vào notificationService.setupNotificationListeners()
        // const initialMessage = await getInitialNotification(messaging());
        // if (initialMessage) {
        //   handleNotificationNavigation(initialMessage);
        // }

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