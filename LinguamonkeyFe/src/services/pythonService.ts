import instance from "../api/axiosClient";
import { useAppStore } from "../stores/appStore";

export const translateText = async (text: string, externalTargetLang?: string) => {
  const { callPreferences } = useAppStore.getState();
  const defaultTargetLang = callPreferences.nativeLanguage || "en";

  const finalTargetLang = externalTargetLang || defaultTargetLang;

  const response = await instance.post("/api/py/translate", {
    text,
    source_lang: "auto",
    target_lang: finalTargetLang,
  });

  return response.data.translated_text;
};