import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// --- IMPORT ENGLISH ---
import enAdmin from "./locales/en/admin.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enData from "./locales/en/data.json";
import enLearn from "./locales/en/learn.json";
import enProfile from "./locales/en/profile.json";
import enSocial from "./locales/en/social.json";

// --- IMPORT VIETNAMESE ---
import viAdmin from "./locales/vi/admin.json";
import viAuth from "./locales/vi/auth.json";
import viCommon from "./locales/vi/common.json";
import viData from "./locales/vi/data.json";
import viLearn from "./locales/vi/learn.json";
import viProfile from "./locales/vi/profile.json";
import viSocial from "./locales/vi/social.json";

// --- IMPORT CHINESE ---
import zhAdmin from "./locales/zh/admin.json";
import zhAuth from "./locales/zh/auth.json";
import zhCommon from "./locales/zh/common.json";
import zhData from "./locales/zh/data.json";
import zhLearn from "./locales/zh/learn.json";
import zhProfile from "./locales/zh/profile.json";
import zhSocial from "./locales/zh/social.json";

import motivation from "./locales/motivation.json";

const createResource = (
  admin: any,
  auth: any,
  common: any,
  data: any,
  learn: any,
  profile: any,
  social: any
) => ({
  ...common, // Common chứa các key chung và loose keys nên để đầu hoặc cuối tùy chiến lược override
  ...auth,
  ...learn,
  ...social,
  ...profile,
  ...admin,
  ...data,
});

const resources = {
  en: {
    translation: createResource(
      enAdmin,
      enAuth,
      enCommon,
      enData,
      enLearn,
      enProfile,
      enSocial
    ),
    motivation: motivation.en,
  },
  vi: {
    translation: createResource(
      viAdmin,
      viAuth,
      viCommon,
      viData,
      viLearn,
      viProfile,
      viSocial
    ),
    motivation: motivation.vi,
  },
  zh: {
    translation: createResource(
      zhAdmin,
      zhAuth,
      zhCommon,
      zhData,
      zhLearn,
      zhProfile,
      zhSocial
    ),
    motivation: motivation.zh,
  },
};

const LANGUAGE_DETECTOR = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem("user-language");
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
    resources,
    fallbackLng: "en",
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    parseMissingKeyHandler: (key) => {
      if (__DEV__) {
        console.warn(`[i18n] Missing translation for key: "${key}"`);
      }
      return key;
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;