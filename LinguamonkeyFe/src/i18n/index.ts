import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";
import motivation from "./locales/motivation.json";

const LANGUAGE_DETECTOR = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem("userLanguage");
      if (savedLanguage) {
        callback(savedLanguage);
      } else {
        callback("en");
      }
    } catch (error) {
      callback("en");
    }
  },
  init: () => { },
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
      en: {
        translation: en,
        motivation: motivation.en
      },
      vi: {
        translation: vi,
        motivation: motivation.vi
      },
      zh: {
        translation: zh,
        motivation: motivation.zh
      },
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
      useSuspense: false,
    },
  });

export default i18n;