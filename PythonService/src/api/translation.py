import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

TRANSLATION_MODEL = "gemini-2.5-flash"

def translate_text(text: str, source_lang: str, target_lang: str) -> tuple[str, str]:
    if not text or not text.strip():
        return "", ""

    if source_lang == target_lang:
        return text, ""

    try:
        model = genai.GenerativeModel(TRANSLATION_MODEL)
        
        prompt = (
            f"You are a professional translator. Translate the following text strictly from '{source_lang}' to '{target_lang}'. "
            "Output ONLY the translated text. Do not add explanations, notes, quotes, or markdown. "
            "If the source language is 'auto', detect it automatically.\n\n"
            f"Text: {text}"
        )

        response = model.generate_content(prompt)
        
        if response.text:
            cleaned_text = response.text.strip()
            return cleaned_text, ""
        else:
            logger.warning("Empty response from Gemini translation")
            return text, "Empty response from translation model"

    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return text, str(e)