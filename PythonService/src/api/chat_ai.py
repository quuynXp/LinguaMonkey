import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPICallError, PermissionDenied
from openai import AsyncOpenAI, APIError as OpenAIAPIError, RateLimitError as OpenAIRateLimitError

load_dotenv()
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Cấu hình Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("Missing GOOGLE_API_KEY")

# Cấu hình OpenAI Client
openai_client = None
if OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
else:
    logger.warning("Missing OPENAI_API_KEY. Fallback logic will be disabled.")

# Danh sách ưu tiên Gemini
GEMINI_TIERS = [
    {"name": "gemini-2.5-pro", "purpose": "Pro - Max Quality"},
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"}, # Hoặc flash-lite
]

# Model Fallback của OpenAI
OPENAI_FALLBACK_MODEL = "gpt-3.5-turbo" # Hoặc "gpt-4o-mini" (rẻ và nhanh hơn)

# --- HELPER FUNCTIONS ---

def _build_system_instruction(user_profile: dict | None) -> str:
    instruction = (
        "You are a friendly and helpful language learning assistant "
        "for the 'MonkeyLingua' app."
    )
    if user_profile:
        profile_summary = f"User ID: {user_profile.get('user_id')}. "
        if user_profile.get("proficiency"):
            profile_summary += f"Current proficiency: {user_profile['proficiency']}. "
        if user_profile.get("learning_languages"):
            langs = ', '.join([f"{l['lang']} ({l['level']})" for l in user_profile['learning_languages']])
            profile_summary += f"Learning languages: {langs}. "
        if user_profile.get("recent_chat_summary"):
            profile_summary += f"Recent chat summary: '{user_profile.get('recent_chat_summary')}'. "

        instruction += (
            "\n\n--User Context--\n"
            f"{profile_summary.strip()}\n"
            "Tailor your explanations, vocabulary level, and examples to this user's stated proficiency and goals.\n"
            "----------------------------------------------------------"
        )
    return instruction

def _convert_history_to_openai(history: list[dict], system_instruction: str, current_message: str) -> list[dict]:
    """Chuyển đổi lịch sử chat sang format của OpenAI"""
    openai_messages = [{"role": "system", "content": system_instruction}]
    
    for h in history:
        role = "assistant" if h.get("role") in ["assistant", "model"] else "user"
        content = h.get("content")
        if isinstance(content, str):
            openai_messages.append({"role": role, "content": content})
            
    openai_messages.append({"role": "user", "content": current_message})
    return openai_messages

# --- MAIN CHAT FUNCTIONS ---

async def chat_with_ai(
        message: str,
        history: list[dict],
        language: str,
        user_profile: dict | None = None,
) -> tuple[str, str]:
    
    system_instruction = _build_system_instruction(user_profile)
    
    # 1. Chuẩn bị message cho Gemini
    gemini_messages = []
    for h in history:
        role = "model" if h.get("role") == "assistant" else h.get("role")
        content = h.get("content")
        if isinstance(content, str):
            gemini_messages.append({'role': role, 'parts': [{'text': content}]})
    gemini_messages.append({'role': 'user', 'parts': [{'text': message}]})

    # 2. Thử lần lượt các tier của Gemini
    for tier in GEMINI_TIERS:
        model_name = tier["name"]
        try:
            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction
            )
            response = await model.generate_content_async(gemini_messages)
            
            if response.text and response.text.strip():
                logging.info(f"Response from Gemini ({model_name})")
                return response.text, ""
            
        except ResourceExhausted:
            logging.warning(f"Gemini Rate Limit hit: {model_name}. Trying next tier...")
            continue
        except Exception as e:
            logging.error(f"Gemini error ({model_name}): {str(e)}")
            continue

    # 3. Fallback sang OpenAI nếu tất cả Gemini thất bại
    if openai_client:
        logging.info("All Gemini tiers failed/exhausted. Fallback to OpenAI.")
        try:
            openai_msgs = _convert_history_to_openai(history, system_instruction, message)
            
            response = await openai_client.chat.completions.create(
                model=OPENAI_FALLBACK_MODEL,
                messages=openai_msgs,
                temperature=0.7
            )
            
            reply_text = response.choices[0].message.content
            if reply_text:
                return reply_text, ""
                
        except OpenAIRateLimitError:
            logging.error("OpenAI Rate Limit hit.")
        except Exception as e:
            logging.error(f"OpenAI Fallback error: {str(e)}", exc_info=True)
            return "", "Service temporarily unavailable (Fallback failed)."

    return "", "All language services are currently busy or unavailable."

async def chat_with_ai_stream(
        message: str,
        history: list[dict],
        user_profile: dict | None = None,
):
    system_instruction = _build_system_instruction(user_profile)
    MODEL_STREAM = "gemini-1.5-flash"

    # 1. Thử Stream với Gemini trước
    try:
        gemini_messages = []
        for h in history:
            role = "model" if h["role"] == "assistant" else h["role"]
            content = h.get("content")
            if isinstance(content, str):
                gemini_messages.append({'role': role, 'parts': [{'text': content}]})
        gemini_messages.append({'role': 'user', 'parts': [{'text': message}]})

        model = genai.GenerativeModel(MODEL_STREAM, system_instruction=system_instruction)
        response_stream = await model.generate_content_async(gemini_messages, stream=True)

        async for chunk in response_stream:
            if chunk.parts and chunk.parts[0].text:
                yield chunk.parts[0].text
        return # Kết thúc thành công

    except ResourceExhausted:
        logging.warning(f"Gemini Stream Rate Limit ({MODEL_STREAM}). Switching to OpenAI Stream...")
    except Exception as e:
        logging.error(f"Gemini Stream Error: {str(e)}")

    if openai_client:
        try:
            openai_msgs = _convert_history_to_openai(history, system_instruction, message)
            stream = await openai_client.chat.completions.create(
                model=OPENAI_FALLBACK_MODEL,
                messages=openai_msgs,
                stream=True
            )
            
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logging.error(f"OpenAI Stream Error: {str(e)}")
            yield "Error: All chat services are busy."
    else:
        yield "Error: Chat service busy (No fallback available)."