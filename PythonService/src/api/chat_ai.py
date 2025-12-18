import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from openai import AsyncOpenAI, RateLimitError as OpenAIRateLimitError
from redis.asyncio import Redis
from fastapi import BackgroundTasks

load_dotenv()
logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHAT_SUMMARY_PREFIX = "chat_summary"
SUMMARY_TTL = 86400  # 24 hours
CONTEXT_WINDOW_SIZE = 10  # Only send last 10 messages to AI for generation
SUMMARIZATION_THRESHOLD = 15  # Trigger background summary if history > 15

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    logger.error("Missing GOOGLE_API_KEY")

openai_client = None
if OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
else:
    logger.warning("Missing OPENAI_API_KEY. Fallback logic will be disabled.")

GEMINI_TIERS = [
    {"name": "gemini-2.5-pro", "purpose": "Pro - Max Quality"},
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"},
]

OPENAI_FALLBACK_MODEL = "gpt-3.5-turbo"


def _build_system_instruction(user_profile: dict | None) -> str:
    instruction = (
        "You are a friendly and helpful language learning assistant "
        "for the 'MonkeyLingua' app."
    )
    if user_profile:
        profile_summary = f"User ID: {user_profile.get('user_id')}. "
        if user_profile.get("nickname"):
            profile_summary += f"Name: {user_profile['nickname']}. "
        if user_profile.get("proficiency"):
            profile_summary += f"Current proficiency: {user_profile['proficiency']}. "
        if user_profile.get("learning_languages"):
            langs = ', '.join([f"{l['lang']} ({l['level']})" for l in user_profile['learning_languages']])
            profile_summary += f"Learning languages: {langs}. "
        
        if user_profile.get("conversation_summary"):
            instruction += (
                "\n\n--Previous Conversation Context (Summary)--\n"
                f"{user_profile['conversation_summary']}\n"
                "Use this summary to maintain continuity, but do not repeat it."
            )

        instruction += (
            "\n\n--User Context--\n"
            f"{profile_summary.strip()}\n"
            "Tailor your explanations, vocabulary level, and examples to this user's stated proficiency and goals.\n"
            "----------------------------------------------------------"
        )
    return instruction

def _convert_history_to_openai(history: list[dict], system_instruction: str, current_message: str) -> list[dict]:
    openai_messages = [{"role": "system", "content": system_instruction}]
    for h in history:
        role = "assistant" if h.get("role") in ["assistant", "model"] else "user"
        content = h.get("content")
        if isinstance(content, str):
            openai_messages.append({"role": role, "content": content})
    openai_messages.append({"role": "user", "content": current_message})
    return openai_messages


async def update_summary_task(user_id: str, old_history_chunk: list[dict], current_summary: str, redis_client: Redis):
    """
    Background task: Compresses old messages + existing summary into a new summary.
    """
    if not old_history_chunk:
        return

    logger.info(f"Running background summarization for user {user_id} on {len(old_history_chunk)} messages.")
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        text_to_summarize = "\n".join([f"{msg['role']}: {msg['content']}" for msg in old_history_chunk if msg.get('content')])
        
        prompt = (
            "You are a context optimizer. Update the following conversation summary with the new messages.\n\n"
            f"--- EXISTING SUMMARY ---\n{current_summary if current_summary else 'None'}\n\n"
            f"--- NEW MESSAGES ---\n{text_to_summarize}\n\n"
            "OUTPUT RULES:\n"
            "1. Combine facts and context into a concise paragraph.\n"
            "2. Retain key user details (names, goals, errors made).\n"
            "3. Discard trivial greetings.\n"
            "4. Return ONLY the new summary text."
        )

        response = await model.generate_content_async(prompt)
        if response.text:
            new_summary = response.text.strip()
            await redis_client.set(f"{CHAT_SUMMARY_PREFIX}:{user_id}", new_summary, ex=SUMMARY_TTL)
            logger.info(f"Summary updated for user {user_id}.")
            
    except Exception as e:
        logger.error(f"Background summarization failed: {e}")

def _manage_context_and_tasks(history: list[dict], user_profile: dict, background_tasks: BackgroundTasks | None, redis_client: Redis | None):
    """
    Slices history for the immediate AI call and schedules summarization if needed.
    """
    recent_history = history[-CONTEXT_WINDOW_SIZE:] if len(history) > CONTEXT_WINDOW_SIZE else history
    
    if background_tasks and redis_client and len(history) > SUMMARIZATION_THRESHOLD:
        user_id = user_profile.get("user_id")
        existing_summary = user_profile.get("conversation_summary", "")
        
        msgs_to_summarize = history[:-CONTEXT_WINDOW_SIZE]
        
        background_tasks.add_task(update_summary_task, user_id, msgs_to_summarize, existing_summary, redis_client)

    return recent_history


async def chat_with_ai(
        message: str,
        history: list[dict],
        language: str,
        user_profile: dict | None = None,
        background_tasks: BackgroundTasks | None = None,
        redis_client: Redis | None = None
) -> tuple[str, str]:
    
    active_history = _manage_context_and_tasks(history, user_profile, background_tasks, redis_client)
    system_instruction = _build_system_instruction(user_profile)
    
    gemini_messages = []
    for h in active_history:
        role = "model" if h.get("role") == "assistant" else h.get("role")
        content = h.get("content")
        if isinstance(content, str):
            gemini_messages.append({'role': role, 'parts': [{'text': content}]})
    gemini_messages.append({'role': 'user', 'parts': [{'text': message}]})

    for tier in GEMINI_TIERS:
        model_name = tier["name"]
        try:
            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction
            )
            response = await model.generate_content_async(gemini_messages)
            
            if response.text and response.text.strip():
                return response.text, ""
            
        except ResourceExhausted:
            logger.warning(f"Gemini Rate Limit hit: {model_name}. Trying next tier...")
            continue
        except Exception as e:
            logger.error(f"Gemini error ({model_name}): {str(e)}")
            continue

    if openai_client:
        try:
            openai_msgs = _convert_history_to_openai(active_history, system_instruction, message)
            response = await openai_client.chat.completions.create(
                model=OPENAI_FALLBACK_MODEL,
                messages=openai_msgs,
                temperature=0.7
            )
            reply_text = response.choices[0].message.content
            if reply_text:
                return reply_text, ""
                
        except Exception as e:
            logger.error(f"OpenAI Fallback error: {str(e)}")
            return "", "Service temporarily unavailable."

    return "", "All language services are currently busy."

async def chat_with_ai_stream(
        message: str,
        history: list[dict],
        user_profile: dict | None = None,
        background_tasks: BackgroundTasks | None = None,
        redis_client: Redis | None = None
):
    active_history = _manage_context_and_tasks(history, user_profile, background_tasks, redis_client)
    system_instruction = _build_system_instruction(user_profile)
    MODEL_STREAM = "gemini-1.5-flash"

    try:
        gemini_messages = []
        for h in active_history:
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
        return

    except Exception as e:
        logger.error(f"Gemini Stream Error: {str(e)}")

    if openai_client:
        try:
            openai_msgs = _convert_history_to_openai(active_history, system_instruction, message)
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
            logger.error(f"OpenAI Stream Error: {str(e)}")
            yield "Error: All chat services are busy."
    else:
        yield "Error: Chat service busy (No fallback)."