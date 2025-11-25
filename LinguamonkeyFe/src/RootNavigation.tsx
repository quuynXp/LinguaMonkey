import React, { useEffect, useState, useMemo } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  RootNavigationRef,
  flushPendingActions,
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

// --- Logic Đăng ký Token ---
// Có thể cân nhắc chuyển logic này vào notificationService trong tương lai
// Hiện tại giữ ở đây để đảm bảo luồng Auth
const registerFCMToken = async (userId: string) => {
  const { fcmToken, isTokenRegistered, setToken, setTokenRegistered } =
    useUserStore.getState();

  if (fcmToken && isTokenRegistered) {
    console.log("FCM Token already registered.");
    return;
  }

  try {
    // Tận dụng notificationService để lấy token chuẩn
    const token = await notificationService.getFcmToken();
    if (token) {
      setToken(token);
      const payload = {
        userId,
        fcmToken: token,
        deviceId: await notificationService.getDeviceId(),
      };

      await instance.post("/api/v1/users/fcm-token", payload);
      setTokenRegistered(true);
      console.log("FCM Token successfully registered on server.");
    } else {
      console.warn("Failed to obtain FCM token via Service.");
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

  // --- CẤU HÌNH DEEP LINK ---
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
        return () => {
          eventListener.remove();
        };
      },
    }),
    []
  );

  // --- NETWORK CHECK ---
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // --- NOTIFICATION INITIALIZATION ---
  // Toàn bộ logic listener đã được chuyển vào Service để fix lỗi NativeEventEmitter
  useEffect(() => {
    const initNotifications = async () => {
      await notificationService.initialize();
    };
    initNotifications();

    // Setup listeners (Background, Quit, Foreground -> Local)
    const cleanupListeners = notificationService.setupNotificationListeners();

    return () => {
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  // --- BOOTSTRAP APP (Auth & User Data) ---
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const hasValidToken = await initializeTokens();

        // Language Setup
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

                // Sync Language
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

                // Check FCM Token
                const isTokenMissingOrUnregistered =
                  !useUserStore.getState().fcmToken ||
                  !useUserStore.getState().isTokenRegistered;

                if (isTokenMissingOrUnregistered) {
                  await registerFCMToken(userId);
                }

                // Route Logic
                const roles = normalizedUser.roles || [];
                const hasFinishedSetup = normalizedUser.hasFinishedSetup === true;
                const hasDonePlacementTest = normalizedUser.hasDonePlacementTest === true;
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

    // Check permissions
    const initPermissions = async () => {
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

  if (!isConnected) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
      onReady={() => {
        console.log("Navigation Ready");
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