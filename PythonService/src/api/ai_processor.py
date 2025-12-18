import os
import json
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

async def improve_quiz_data(raw_question: str, raw_options: list[str], topic: str) -> tuple[dict, str]:
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_prompt = f"""
    You are a data expert for a Vietnamese language app.
    Task: Validate/Fix the input question or generate a new one based on the Topic.
    
    Input:
    - Topic: {topic}
    - Question: "{raw_question}"
    - Options: {raw_options}
    
    Requirements:
    1. If inputs are random/garbage, generate a NEW valid multiple-choice question about the Topic.
    2. Ensure exactly 4 options.
    3. Provide an 'image_prompt' in English to illustrate the question.
    
    Output JSON ONLY:
    {{
        "fixed_question": "Question text in Vietnamese",
        "fixed_options": ["A", "B", "C", "D"],
        "correct_index": 0,
        "explanation": "Explanation in Vietnamese",
        "image_prompt": "A visual description of the question for an SVG generator"
    }}
    """
    
    try:
        response = await model.generate_content_async(system_prompt)
        text_resp = response.text.strip()
        
        clean_json = text_resp.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        
        if "image_prompt" not in data or not data["image_prompt"]:
            data["image_prompt"] = f"Illustration associated with {data.get('fixed_question', topic)}"

        return data, ""
        
    except Exception as e:
        logging.error(f"AI Processor Error: {e}")
        return None, str(e)