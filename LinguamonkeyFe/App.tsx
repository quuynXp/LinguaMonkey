import React from "react";
import { View, StyleSheet } from 'react-native';
import Toast from "react-native-toast-message";
// import { AuthProvider } from "./src/contexts/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/services/queryClient";
import RootNavigation from "./src/RootNavigation";

import "./src/i18n";
import { toastConfig } from "./src/components/Toast";


export default function App() {

  return (
    <QueryClientProvider client={queryClient}>
      {/* <AuthProvider> */}
      <View style={styles.container}>
        <RootNavigation />
      </View>
      <Toast config={toastConfig} />
      {/* </AuthProvider> */}
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});