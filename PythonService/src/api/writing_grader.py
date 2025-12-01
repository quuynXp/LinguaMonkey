import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
import json
import re

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Dùng model flash để phản hồi nhanh
model = genai.GenerativeModel('gemini-2.5-flash')

async def grade_writing_logic(user_text: str, prompt_text: str, image_bytes: bytes = None, language: str = "en") -> tuple[str, float, str]:
    """
    Chấm điểm bài viết (Writing) dùng AI Multimodal.
    Inputs:
        - user_text: Bài làm của học sinh.
        - prompt_text: Đề bài (từ DB Java).
        - image_bytes: Ảnh bài làm (nếu có) hoặc ảnh đề bài.
    """
    if not user_text:
        return "Bạn chưa nhập nội dung bài viết.", 0.0, "EMPTY_INPUT"

    logging.info(f"Grading writing. Prompt: {prompt_text[:30]}... User Input Length: {len(user_text)}")

    # Xây dựng prompt cho Gemini
    system_prompt = f"""
    You are a strict but helpful language teacher grading a Writing exercise.
    
    **Context:**
    - Target Language: {language}
    - Exercise Prompt (The Question): "{prompt_text}"
    - Student's Submission: "{user_text}"
    {'- An image context is provided.' if image_bytes else ''}

    **Grading Criteria:**
    1. Relevance: Does it answer the prompt? (Max 40 pts)
    2. Grammar & Vocabulary: Accuracy and richness. (Max 40 pts)
    3. Clarity: Coherence and flow. (Max 20 pts)

    **Output Format (JSON only):**
    {{
        "score": <0-100>,
        "feedback": "<Short feedback in Vietnamese explaining the score and correcting 1 major mistake>",
        "corrections": ["<List of specific corrections>"]
    }}
    """

    inputs = [system_prompt]
    if image_bytes:
        try:
            # Gemini nhận raw bytes qua dictionary
            image_blob = {"mime_type": "image/jpeg", "data": image_bytes} 
            inputs.append(image_blob)
        except Exception as e:
            logging.error(f"Image processing error: {e}")

    try:
        response = await model.generate_content_async(inputs)
        text_resp = response.text
        
        # Parse JSON từ phản hồi của AI (Clean markdown code blocks nếu có)
        clean_json = text_resp.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        
        score = float(data.get("score", 0))
        feedback = data.get("feedback", "Đã chấm điểm bài viết.")
        
        # Ghép feedback với corrections để trả về chuỗi duy nhất cho FE hiện
        if data.get("corrections"):
            feedback += "\n\nSửa lỗi: " + "; ".join(data["corrections"])

        return feedback, score, ""

    except json.JSONDecodeError:
        # Fallback nếu AI không trả về JSON chuẩn
        logging.error("AI did not return valid JSON")
        # Thử regex lấy số điểm
        score_match = re.search(r'\b(\d{1,3})/100', text_resp)
        fallback_score = float(score_match.group(1)) if score_match else 50.0
        return text_resp, fallback_score, ""
        
    except Exception as e:
        logging.error(f"Grading error: {e}")
        return "Lỗi chấm điểm từ hệ thống AI.", 0.0, str(e)