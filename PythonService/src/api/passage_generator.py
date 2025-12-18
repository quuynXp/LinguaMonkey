import os
import logging
import google.generativeai as genai
import re
from dotenv import load_dotenv

load_dotenv()

genai.api_key = os.getenv("GOOGLE_API_KEY")

def clean_ai_output(text: str) -> str:
    """Removes code blocks, metadata, or accidental ID inclusions."""
    text = re.sub(r"```(json|markdown)?", "", text).strip()
    text = text.replace("```", "")
    
    lines = text.split('\n')
    cleaned_lines = [line for line in lines if not line.lower().startswith("user id:")]
    return "\n".join(cleaned_lines).strip()

def generate_passage(user_id: str, language: str, topic: str, user_profile: dict | None = None) -> tuple[str, str]:
    """
    Generates a reading passage.
    CRITICAL: Ensures prompt prevents leaking User ID into the output.
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        level = user_profile.get("proficiency", "beginner") if user_profile else "beginner"
        
        system_instruction = (
            f"You are a professional language content generator. "
            f"Target Language: {language}. "
            f"Level: {level}. "
            f"Topic: {topic}. "
            "STRICT OUPUT RULES:\n"
            "1. Output ONLY the reading passage text.\n"
            "2. Do NOT include any introductions, metadata, User IDs, or labels like 'Passage:'.\n"
            "3. Do NOT wrap output in markdown code blocks.\n"
            "4. Ensure the content is educational and grammatically correct."
        )

        response = model.generate_content(system_instruction)
        
        if response.text:
            cleaned_text = clean_ai_output(response.text)
            return cleaned_text, ""
        else:
            return "", "Empty response from AI model"

    except Exception as e:
        logging.error(f"Passage generation error: {str(e)}", exc_info=True)
        return "", f"AI Service Error: {str(e)}"