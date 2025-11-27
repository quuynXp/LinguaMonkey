import os
import logging
import json
import typing
from dotenv import load_dotenv
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
TRANSLATION_MODEL = "gemini-1.5-flash"
MAX_RETRIES = 3

if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY is missing in environment variables.")

genai.configure(api_key=GOOGLE_API_KEY)

class TranslationError(Exception):
    """Custom exception for translation failures."""
    pass

@retry(
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((Exception)),
    reraise=True
)
def _execute_gemini_translation(prompt: str) -> str:
    """
    Executes the API call with retry logic for network stability.
    """
    try:
        model = genai.GenerativeModel(
            model_name=TRANSLATION_MODEL,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2, 
            }
        )
        response = model.generate_content(prompt)
        
        if not response.text:
            raise TranslationError("Empty response from Gemini API")
            
        return response.text
    except Exception as e:
        logger.warning(f"Gemini API call failed, retrying... Error: {str(e)}")
        raise e

def translate_text(text: str, source_lang: str, target_lang: str) -> typing.Tuple[str, str]:
    """
    Translates text focusing on semantic equivalence over literal translation.
    Handles linguistic nuances (Topic-Comment structure, Honorifics, etc.).

    Args:
        text: Input string.
        source_lang: Source code (e.g., 'en', 'vi').
        target_lang: Target code (e.g., 'ja', 'th').

    Returns:
        Tuple[str, str]: (Translated Text, Error Message).
    """
    if not text or not text.strip():
        return "", ""

    if source_lang == target_lang and source_lang != "auto":
        return text, ""

    # Prompt engineering for semantic accuracy vs literal translation
    prompt = (
        f"Role: Expert Linguist specializing in semantic localization.\n"
        f"Task: Translate the following text from '{source_lang}' to '{target_lang}'.\n\n"
        "GUIDELINES:\n"
        "1. SEMANTICS OVER SYNTAX: Prioritize natural flow and meaning. Adjust sentence structure if the target language requires it (e.g., SVO -> SOV).\n"
        "2. SCRIPT ACCURACY: Ensure correct vowel placements (Thai/Lao), ligatures (Indic), and character variants (CJK).\n"
        "3. TONE: Maintain the original tone (casual/formal/polite).\n"
        "4. OUTPUT: Return strictly valid JSON.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        '  "translated_text": "string",\n'
        '  "detected_source_lang": "string",\n'
        '  "notes": "string (optional explanation if structure changed significantly)"\n'
        "}\n\n"
        f"Input Text: {text}"
    )

    try:
        raw_response = _execute_gemini_translation(prompt)
        
        try:
            data = json.loads(raw_response)
            translated_text = data.get("translated_text", "").strip()
            
            if not translated_text:
                return text, "Translation returned empty content"
            
            # Log structural changes if the model noted them (useful for debugging semantic issues)
            if data.get("notes"):
                logger.debug(f"Translation Note: {data['notes']}")

            return translated_text, ""

        except json.JSONDecodeError:
            logger.error(f"JSON Parsing failed. Raw: {raw_response}")
            return text, "Failed to parse translation response"

    except Exception as e:
        logger.error(f"Translation service failure: {str(e)}")
        return text, f"Service Unavailable: {str(e)}"