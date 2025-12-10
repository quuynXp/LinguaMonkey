import logging
from typing import Tuple
from redis.asyncio import Redis
from src.core.text_translator import get_text_translator, TextTranslator

logger = logging.getLogger(__name__)

class AudioTranslator:
    def __init__(self, text_translator: TextTranslator):
        self.text_translator = text_translator
        logger.info("AudioTranslator initialized.")

    async def translate(self, text: str, source_lang_hint: str, target_lang: str) -> Tuple[str, str]:
        if not text or not text.strip():
            return "", source_lang_hint
        
        # Audio translation relies on the core text translation logic (LPM + Gemini)
        translated_text, detected_lang = await self.text_translator.translate(
            text, 
            source_lang_hint, 
            target_lang
        )
        return translated_text, detected_lang

_audio_translator = None

def get_audio_translator(redis_client: Redis) -> AudioTranslator:
    global _audio_translator
    if _audio_translator is None:
        text_translator = get_text_translator(redis_client)
        _audio_translator = AudioTranslator(text_translator)
    return _audio_translator