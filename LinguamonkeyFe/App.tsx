import React from "react";
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from "react-native-toast-message";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/services/queryClient";
import RootNavigation from "./src/RootNavigation";

import "./src/i18n";
import { toastConfig } from "./src/components/Toast";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <RootNavigation />
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});