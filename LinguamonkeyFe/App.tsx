import React, { useCallback } from "react";
import { View, StyleSheet } from 'react-native'; // <-- 1. THÊM View, StyleSheet
import Toast from "react-native-toast-message";
import { AuthProvider } from "./src/contexts/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/services/queryClient";
import RootNavigation from "./src/RootNavigation";

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

import "./src/i18n";
import { toastConfig } from "./src/components/Toast";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome.font,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <RootNavigation />
        </View>
        <Toast config={toastConfig} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});