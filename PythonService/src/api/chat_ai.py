import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied, GoogleAPICallError

load_dotenv()

genai.api_key = os.getenv("GOOGLE_API_KEY")

MODEL_TIERS = [
    {"name": "gemini-2.5-pro", "purpose": "Pro - Max Quality"},
    {"name": "gemini-2.5-flash", "purpose": "Flash - Balanced"},
    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Cost Effective"},
    {"name": "gemini-2.5-flash-live", "purpose": "LIVE - Fallback"},
]

async def chat_with_ai(
        message: str,
        history: list[dict],
        language: str,
        user_profile: dict | None = None,
) -> tuple[str, str]:
    
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
    
    messages = []
    for h in history:
        role = "model" if h.get("role") == "assistant" else h.get("role")
        content = h.get("content")
        if isinstance(content, str):
            messages.append({'role': role, 'parts': [{'text': content}]})
    
    messages.append({'role': 'user', 'parts': [{'text': message}]})

    for tier in MODEL_TIERS:
        current_model = tier["name"]
        
        try:
            logging.info(f"Attempting to use model: {current_model} ({tier['purpose']})")
            
            model = genai.GenerativeModel(
                current_model,
                system_instruction=system_instruction
            )
            
            response = await model.generate_content_async(messages)
            reply_text = response.text

            if reply_text.strip():
                logging.info(f"Successfully received response from {current_model}")
                return reply_text, ""
            else:
                logging.warning(f"Model {current_model} returned empty response. Falling back...")
                continue 

        except ResourceExhausted:
            logging.warning(f"Rate limit hit for model {current_model}. Falling back...")
            continue
        except NotFound as e:
            logging.error(f"Model {current_model} not found: {str(e)}", exc_info=True)
            continue 
        except PermissionDenied as e:
            logging.critical(f"Permission denied for model {current_model}: {str(e)}")
            return "", f"Authentication error on model {current_model}."
        except GoogleAPICallError as e:
            logging.error(f"Google API Call Error with {current_model}: {str(e)}", exc_info=True)
            continue
        except Exception as e:
            logging.error(f"Generic error with {current_model}: {str(e)}", exc_info=True)
            continue 

    logging.error("All model tiers failed.")
    return "", "All language services are currently unavailable."

async def chat_with_ai_stream(
        message: str,
        history: list[dict],
        user_profile: dict | None = None,
):
    MODEL_STREAM = "gemini-2.5-flash" 
    
    try:
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

        messages = []
        for h in history:
            role = "model" if h["role"] == "assistant" else h["role"]
            content = h.get("content")
            if isinstance(content, str):
                messages.append({'role': role, 'parts': [{'text': content}]})

        messages.append({'role': 'user', 'parts': [{'text': message}]})

        model = genai.GenerativeModel(
            MODEL_STREAM,
            system_instruction=system_instruction
        )
        
        response_stream = await model.generate_content_async(
            messages,
            stream=True
        )

        async for chunk in response_stream:
            if chunk.parts and chunk.parts[0].text:
                yield chunk.parts[0].text

    except ResourceExhausted:
        logging.error(f"Gemini streaming rate limit hit for {MODEL_STREAM}.", exc_info=True)
        yield "Error: Chat service is currently busy. Please try non-streaming mode."
    except Exception as e:
        logging.error(f"Gemini streaming chat error: {str(e)}", exc_info=True)
        yield f"Error: Failed to stream response ({type(e).__name__})."