import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json"; 

const LANGUAGE_DETECTOR = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem("user-language");
      if (savedLanguage) {
        callback(savedLanguage);
      } else {
        const systemLanguage = (await AsyncStorage.getItem("system-language")) || "en";
        callback(systemLanguage);
      }
    } catch (error) {
      callback("en"); 
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem("user-language", lng);
    } catch (error) {
      console.error("Error saving language to AsyncStorage:", error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      zh: { translation: zh },
    },
    fallbackLng: "en",
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    parseMissingKeyHandler: (key) => {
      return `Missing translation: ${key}`;
    },
    react: {
      useSuspense: false, // Tắt suspense để tránh lỗi trong React Native
    },
  });

export default i18n;