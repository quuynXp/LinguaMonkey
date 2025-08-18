import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { RootNavigationRef } from "./utils/navigationRef";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingScreen from "./screens/appLaunch/OnboardingScreen";
import AuthStack from "./navigation/stack/AuthStack";
import TabNavigator from "./navigation/TabNavigator";
import { useTokenStore } from "./stores/tokenStore";
import { NavigationContainer } from "@react-navigation/native";

const Stack = createNativeStackNavigator();

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialScreen, setInitialScreen] = useState<'Onboarding' | 'Auth' | 'Main'>('Auth');
  const { initializeTokens } = useTokenStore();

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Init tokens / first install
  useEffect(() => {
    const init = async () => {
      try {
        const hasValidToken = await initializeTokens();
        const firstInstall = await AsyncStorage.getItem('firstInstall');

        if (!firstInstall) {
          await AsyncStorage.setItem('firstInstall', 'true');
          setInitialScreen('Onboarding');
        } else if (hasValidToken) {
          setInitialScreen('Main');
        } else {
          setInitialScreen('Auth');
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Foreground Notification:", notification);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("User tapped notification:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [initializeTokens]);

  // Request notification permission
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={RootNavigationRef}
      onReady={() => {
        console.log("Navigation is ready");
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {initialScreen === 'Onboarding' && (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={() => setInitialScreen('Auth')} />}
          </Stack.Screen>
        )}
        {initialScreen === 'Auth' && (
          <Stack.Screen name="Auth">
            {() => <AuthStack onLogin={() => setInitialScreen('Main')} />}
          </Stack.Screen>
        )}
        {initialScreen === 'Main' && (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigation;
