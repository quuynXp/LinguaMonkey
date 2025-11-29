import os
import logging
import json
import typing
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied, GoogleAPICallError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_TIERS = [
    {"name": "gemini-2.5-pro", "purpose": "Pro - Max Quality"},
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"},
    {"name": "gemini-2.5-flash-live", "purpose": "LIVE - Fallback"},
]

# Constants
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MAX_RETRIES = 3

if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY is missing in environment variables.")
    raise EnvironmentError("GOOGLE_API_KEY is missing")

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
def _execute_gemini_translation(prompt: str, model_name: str) -> str:
    """
    Executes the API call with retry logic for network stability.
    """
    try:
        # Cấu hình safety để tránh bị block với các từ ngữ đơn giản
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }

        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2, 
            },
            safety_settings=safety_settings
        )
        response = model.generate_content(prompt)
        
        if not response.text:
            if response.prompt_feedback:
                logger.warning(f"Translation blocked due to prompt feedback: {response.prompt_feedback}")
            raise TranslationError("Empty response from Gemini API")
            
        return response.text
    except Exception as e:
        logger.warning(f"Gemini API call ({model_name}) failed, retrying... Error: {str(e)}")
        raise e

def translate_text(text: str, source_lang: str, target_lang: str) -> typing.Tuple[str, str]:
    if not text or not text.strip():
        return "", ""

    if source_lang == target_lang and source_lang != "auto":
        return text, ""
    
    prompt = (
        f"Role: Expert Linguist specializing in semantic localization.\n"
        f"Task: Translate the following text from '{source_lang}' to '{target_lang}'.\n\n"
        "GUIDELINES:\n"
        "1. SEMANTICS OVER SYNTAX: Prioritize natural flow and meaning.\n"
        "2. OUTPUT: Return strictly valid JSON.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        '  "translated_text": "string",\n'
        '  "detected_source_lang": "string",\n'
        '  "notes": "string"\n'
        "}\n\n"
        f"Input Text: {text}"
    )

    last_error = ""
    for tier in TRANSLATION_MODEL_TIERS:
        model_name = tier["name"]
        try:
            logger.info(f"Attempting translation with model: {model_name}")
            raw_response = _execute_gemini_translation(prompt, model_name)
            
            try:
                data = json.loads(raw_response)
                translated_text = data.get("translated_text", "").strip()
                if translated_text:
                    logger.info(f"Translation successful using {model_name}")
                    return translated_text, ""
                else:
                    logger.warning(f"Model {model_name} returned empty text. Trying next tier.")
                    last_error = "Translation returned empty content."
                    continue
            except json.JSONDecodeError:
                logger.error(f"JSON Parsing failed for model {model_name}. Raw: {raw_response}")
                last_error = "Failed to parse translation response."
                continue
        
        except (ResourceExhausted, NotFound, PermissionDenied) as e:
            logger.warning(f"Model {model_name} failed ({type(e).__name__}). Falling back... Error: {str(e)}")
            last_error = f"Service failed: {str(e)}"
            continue
        except Exception as e:
            logger.error(f"Translation service failure: {str(e)}")
            last_error = f"Service Unavailable: {str(e)}"
            break 

    logger.error(f"All translation tiers failed. Last Error: {last_error}")
    return text, f"All translation services failed. {last_error}"