import logging
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

async def generate_image(user_id: str, prompt: str, language: str, user_profile: dict | None = None) -> tuple[bytes, str]:
    if not prompt:
        return b"", "Image prompt is empty"

    model = genai.GenerativeModel('gemini-2.5-flash')
    
    system_prompt = f"""
    You are an AI vector artist.
    Task: Generate a minimalist, colorful SVG image code based on the user's prompt.
    Prompt: "{prompt}"
    Requirements:
    - Output ONLY the raw XML SVG code.
    - Start directly with <svg ...> and end with </svg>.
    - Do not use markdown blocks like ```xml.
    - Ensure the SVG is valid and viewable.
    """

    try:
        logging.info(f"Generating SVG for prompt: {prompt[:50]}...")
        response = await model.generate_content_async(system_prompt)
        svg_content = response.text.strip()
        
        if svg_content.startswith("```"):
            svg_content = svg_content.replace("```xml", "").replace("```svg", "").replace("```", "").strip()

        if not svg_content.startswith("<svg"):
             logging.warning("Gemini did not return valid SVG, using fallback text SVG.")
             svg_content = f"""<svg width="400" height="200" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" style="background-color:#f0f0f0"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#333">{prompt}</text></svg>"""
        
        return svg_content.encode('utf-8'), ""
        
    except Exception as e:
        error_msg = f"Image generation error: {str(e)}"
        logging.error(error_msg)
        return b"", error_msg