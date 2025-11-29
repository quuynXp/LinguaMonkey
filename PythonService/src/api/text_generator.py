import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.api_key = os.getenv("GOOGLE_API_KEY")

async def generate_text(user_id: str, prompt: str, language: str, user_profile: dict | None = None) -> tuple[str, str]:
    """
    Generates text using Google Gemini with user personalization.
    Replaces the previous transformers/GPT-2 mock implementation.
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        system_context = (
            f"You are an expert language tutor assisting user {user_id}. "
            f"Target Language: {language}. "
        )

        if user_profile:
            if user_profile.get("proficiency"):
                system_context += f"User Proficiency: {user_profile['proficiency']}. "
            if user_profile.get("native_language"):
                system_context += f"Native Language: {user_profile['native_language']}. "
            if user_profile.get("learning_goals"):
                system_context += f"Goals: {user_profile['learning_goals']}. "

        full_prompt = (
            f"{system_context}\n\n"
            f"Task: {prompt}\n"
            "Generate a natural, educational response suitable for the user's level."
        )

        response = await model.generate_content_async(full_prompt)
        
        if response.text:
            return response.text, ""
        else:
            return "", "Empty response from AI model"

    except Exception as e:
        logging.error(f"Gemini text generation error: {str(e)}", exc_info=True)
        return "", f"AI Service Error: {str(e)}"