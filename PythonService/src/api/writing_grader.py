import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
import json
import httpx
import re

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

def transform_google_drive_url(url: str) -> str:
    """
    Input: https://drive.google.com/file/d/1UQJYj-wOc9RtZOReRL5ZsUUGK0mIYi87/view?usp=sharing
    Output: https://drive.google.com/uc?export=download&id=1UQJYj-wOc9RtZOReRL5ZsUUGK0mIYi87
    """
    try:
        if "drive.google.com" in url and "/d/" in url:
            file_id_match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
            if file_id_match:
                file_id = file_id_match.group(1)
                return f"https://drive.google.com/uc?export=download&id={file_id}"
    except Exception as e:
        logging.warning(f"Could not transform Drive URL: {e}")
    return url

async def download_media(url: str):
    """Hàm helper để download file từ URL"""
    try:
        direct_url = transform_google_drive_url(url)
        
        logging.info(f"Downloading media from: {direct_url}")

        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(direct_url)
            if resp.status_code == 200:
                return resp.content, resp.headers.get("content-type")
            else:
                logging.error(f"Download failed with status: {resp.status_code}")
    except Exception as e:
        logging.error(f"Download failed: {e}")
    return None, None

async def grade_writing_logic(
    user_text: str, 
    prompt_text: str, 
    media_bytes: bytes = None, 
    media_url: str = None, 
    mime_type: str = None, 
    language: str = "en"
) -> tuple[str, float, str]:
    
    if not user_text:
        return "Bạn chưa nhập nội dung bài viết.", 0.0, "EMPTY_INPUT"

    word_count = len(user_text.split())

    if not media_bytes and media_url:
        downloaded_bytes, downloaded_mime = await download_media(media_url)
        if downloaded_bytes:
            media_bytes = downloaded_bytes
            if not mime_type or "octet-stream" in mime_type or "unknown" in mime_type:
                mime_type = downloaded_mime

    media_context_str = ""
    if mime_type:
        if "audio" in mime_type or "mpeg" in mime_type:
            media_context_str = "- Context: Based on the provided AUDIO."
        elif "video" in mime_type or "mp4" in mime_type:
            media_context_str = "- Context: Based on the provided VIDEO."
        else:
            media_context_str = "- Context: Based on the provided IMAGE."

    system_prompt = f"""
    You are a strict language examiner grading a Writing exercise.
    
    **Input:**
    - Language: {language}
    - Question: "{prompt_text}"
    - Answer: "{user_text}"
    {media_context_str}

    **Rules:**
    1. If answer is irrelevant to the Media/Question -> Score 0.
    2. If answer is too short (< 5 words) for a writing task -> Score 0.
    
    **Output JSON:** {{ "score": 0-100, "feedback": "Vietnamese feedback", "corrections": [] }}
    """

    inputs = [system_prompt]
    
    if media_bytes:
        try:
            final_mime = mime_type if mime_type and "/" in mime_type else "image/jpeg"
            
            if "html" in final_mime:
                 logging.error("Detected HTML content instead of media. Skipping media attachment.")
            else:
                inputs.append({"mime_type": final_mime, "data": media_bytes})
        except Exception as e:
            logging.error(f"Media attach error: {e}")

    try:
        response = await model.generate_content_async(inputs)
        text_resp = response.text
        
        clean_json = text_resp.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        
        score = float(data.get("score", 0))
        feedback = data.get("feedback", "Đã chấm điểm.")
        
        if score < 30 and word_count < 5:
             feedback = "Bài làm quá sơ sài so với nội dung media. " + feedback

        if data.get("corrections"):
            feedback += "\n\nSửa lỗi: " + "; ".join(data["corrections"])

        return feedback, score, ""

    except json.JSONDecodeError:
        import re
        score_match = re.search(r'\b(\d{1,3})', text_resp)
        score = float(score_match.group(1)) if score_match else 0.0
        return text_resp, score, ""
        
    except Exception as e:
        logging.error(f"Grading error: {e}")
        return "Hệ thống AI đang bận, vui lòng thử lại sau.", 0.0, str(e)