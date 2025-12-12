import os
import logging
from dotenv import load_dotenv
from litellm import acompletion
from litellm.exceptions import RateLimitError, APIError, AuthenticationError, ServiceUnavailableError

load_dotenv()
logger = logging.getLogger(__name__)

if not os.getenv("GOOGLE_API_KEY"):
    logger.error("Missing GOOGLE_API_KEY in environment variables.")
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("Missing OPENAI_API_KEY. Fallback to OpenAI will fail.")

FALLBACK_MODEL_CHAIN = [
    "gemini/gemini-2.5-pro",        # Priority 1: High Quality
    "gemini/gemini-2.5-flash",      # Priority 2: High Speed/Balanced
    "openai/gpt-3.5-turbo",         # Priority 3: Stable Fallback (khi Gemini bị rate limit)
]

MODEL_STREAM = "gemini/gemini-2.5-flash"

def _build_system_instruction(user_profile: dict | None) -> str:
    """Helper function to construct the system prompt based on user profile."""
    system_instruction = (
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
            profile_summary += (
                "Recent chat summary: "
                f"'{user_profile.get('recent_chat_summary')}'. "
            )

        system_instruction += (
            "\n\n--User Context (Use this to personalize your response)\n"
            f"{profile_summary.strip()}\n"
            "Tailor your explanations, vocabulary level, and examples to this user's stated proficiency and goals.\n"
            "----------------------------------------------------------"
        )
    return system_instruction

def _format_messages(message: str, history: list[dict], system_instruction: str) -> list[dict]:
    """Helper function to format messages for LiteLLM (OpenAI format)."""
    messages = [{"role": "system", "content": system_instruction}]
    
    for h in history:
        # Normalize role: 'model' -> 'assistant'
        role = "assistant" if h.get("role") in ["assistant", "model"] else h.get("role")
        content = h.get("content")
        
        if isinstance(content, str):
            messages.append({'role': role, 'content': content})
    
    messages.append({'role': 'user', 'content': message})
    return messages

async def chat_with_ai(
        message: str,
        history: list[dict],
        language: str,
        user_profile: dict | None = None,
) -> tuple[str, str]:
    
    system_instruction = _build_system_instruction(user_profile)
    messages = _format_messages(message, history, system_instruction)

    # Tách model đầu tiên và danh sách fallback
    primary_model = FALLBACK_MODEL_CHAIN[0]
    fallback_models = FALLBACK_MODEL_CHAIN[1:]

    try:
        # LiteLLM xử lý logic fallback tự động qua tham số 'fallbacks'
        response = await acompletion(
            model=primary_model,
            messages=messages,
            fallbacks=fallback_models,
            # Tự động map exception để trigger fallback
            # (ví dụ: Google ResourceExhausted -> LiteLLM RateLimitError)
        )
        
        reply_text = response.choices[0].message.content
        model_used = response.model

        if reply_text and reply_text.strip():
            logger.info(f"Response received from model: {model_used}")
            return reply_text, ""
        else:
            logger.warning(f"Model {model_used} returned empty response.")
            return "", "AI service returned no content."

    except RateLimitError:
        logger.error("All models in the chain hit Rate Limits.")
        return "", "System is currently busy. Please try again later."
    except AuthenticationError as e:
        logger.critical(f"Authentication failed: {str(e)}")
        return "", "Service configuration error."
    except Exception as e:
        logger.error(f"Unexpected error in chat_with_ai: {str(e)}", exc_info=True)
        return "", "An unexpected error occurred."

async def chat_with_ai_stream(
        message: str,
        history: list[dict],
        user_profile: dict | None = None,
):
    system_instruction = _build_system_instruction(user_profile)
    messages = _format_messages(message, history, system_instruction)
    
    try:
        response_stream = await acompletion(
            model=MODEL_STREAM,
            messages=messages,
            stream=True
        )

        async for chunk in response_stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    except RateLimitError:
        logger.warning(f"Rate limit hit for stream model {MODEL_STREAM}. Suggest retry without streaming.")
        yield "Error: Streaming service busy. Please try standard chat."
    except Exception as e:
        logger.error(f"Error in chat_with_ai_stream: {str(e)}", exc_info=True)
        yield "Error: Connection interrupted."