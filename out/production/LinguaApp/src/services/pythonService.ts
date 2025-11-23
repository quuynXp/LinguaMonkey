import instance from "../api/axiosClient";
import { useAppStore } from "../stores/appStore";

export const translateText = async (text: string) => {
  const { callPreferences } = useAppStore.getState();
  const targetLang = callPreferences.nativeLanguage || "en";

  const response = await instance.post("/translate", {
    text,
    source_lang: "auto",
    target_lang: targetLang,
  });

  return response.data.translated_text;
};
