import React from "react";
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/utils/toastConfig";
import { AuthProvider } from "./src/contexts/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/services/queryClient";
import RootNavigation from "./src/RootNavigation";

import "./src/i18n";

export default function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigation />
        <Toast config={toastConfig} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
