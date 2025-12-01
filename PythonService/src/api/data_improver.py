import os
import json
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

async def improve_quiz_data(raw_question: str, raw_options: list[str], topic: str) -> tuple[dict, str]:
    """
    Takes raw (possibly random) data and transforms it into a valid multiple-choice question
    for learning Vietnamese/English.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_prompt = f"""
    You are a data repairing assistant for a language learning app (Vietnamese/English).
    I will provide you with potentially broken, random, or placeholder text for a multiple-choice question.
    
    Your goal is to:
    1. Analyze the 'raw_question' and 'raw_options'.
    2. If they are gibberish, use the 'topic' to GENERATE a completely new, valid question.
    3. If they make partial sense, fix the grammar and logic to make it a high-quality question.
    4. Ensure there are exactly 4 distinct options.
    5. Identify the correct answer.
    
    Context:
    - Topic: {topic if topic else "General Vietnamese conversation"}
    - Input Question: "{raw_question}"
    - Input Options: {raw_options}
    
    Output JSON ONLY:
    {{
        "fixed_question": "The corrected or generated question text",
        "fixed_options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_index": <0-3>,
        "explanation": "Why this answer is correct (in Vietnamese)",
        "image_prompt": "A prompt to generate an image describing this question"
    }}
    """
    
    try:
        response = await model.generate_content_async(system_prompt)
        text_resp = response.text
        
        # Clean potential markdown
        clean_json = text_resp.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        
        return data, ""
        
    except json.JSONDecodeError:
        logging.error(f"Failed to parse JSON from AI: {text_resp}")
        return None, "AI generated invalid JSON structure"
    except Exception as e:
        logging.error(f"Error improving data: {e}")
        return None, str(e)