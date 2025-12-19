import instance from '../api/axiosClient';
import { AppApiResponse } from '../types/dto';

interface TranslationResponse {
  translated_text: string;
  detected_lang: string;
}

export const translateText = async (
  text: string,
  targetLang: string,
  roomId?: string,
  messageId?: string
): Promise<string | null> => {
  try {
    const response = await instance.post<AppApiResponse<TranslationResponse>>('/api/py/translate', {
      text,
      source_lang: 'auto',
      target_lang: targetLang,
      room_id: roomId,
      message_id: messageId
    });

    if (response.data && response.data.result) {
      return response.data.result.translated_text;
    }
    return null;
  } catch (error) {
    console.error('Translation API error:', error);
    return null;
  }
};