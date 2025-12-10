import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
import json
import httpx # Dùng để download file từ URL

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

async def download_media(url: str):
    """Hàm helper để download file từ URL"""
    try:
        # Xử lý link Google Drive để lấy direct link (nếu cần thiết)
        # Với link drive view?usp=sharing thông thường, ta cần xử lý 1 chút
        # Cách đơn giản nhất: Dùng httpx follow redirects
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.content, resp.headers.get("content-type")
    except Exception as e:
        logging.error(f"Download failed: {e}")
    return None, None

async def grade_writing_logic(
    user_text: str, 
    prompt_text: str, 
    media_bytes: bytes = None, 
    media_url: str = None, # Nhận thêm URL từ Java
    mime_type: str = None, 
    language: str = "en"
) -> tuple[str, float, str]:
    
    if not user_text:
        return "Bạn chưa nhập nội dung bài viết.", 0.0, "EMPTY_INPUT"

    # --- LOGIC MỚI: XỬ LÝ URL ---
    # Nếu không có bytes nhưng có URL, tải về
    if not media_bytes and media_url:
        logging.info(f"Downloading media from: {media_url}")
        downloaded_bytes, downloaded_mime = await download_media(media_url)
        if downloaded_bytes:
            media_bytes = downloaded_bytes
            # Nếu Java gửi mime_type chung chung, lấy mime thật từ header
            if not mime_type or "octet-stream" in mime_type or "unknown" in mime_type:
                mime_type = downloaded_mime
    # -----------------------------

    # Determine context string based on mime_type (or Java hint)
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
            # Gemini cần mime_type chuẩn. Nếu vẫn unknown, fallback sang image/jpeg hoặc audio/mp3 tùy context
            final_mime = mime_type if mime_type and "/" in mime_type else "image/jpeg"
            inputs.append({"mime_type": final_mime, "data": media_bytes})
        except Exception as e:
            logging.error(f"Media attach error: {e}")

    try:
        # Gọi Gemini
        response = await model.generate_content_async(inputs)
        text_resp = response.text
        
        # Parse JSON
        clean_json = text_resp.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        
        score = float(data.get("score", 0))
        feedback = data.get("feedback", "Đã chấm điểm.")
        
        # Logic hậu kiểm (Post-check)
        if score < 30 and word_count < 5:
             feedback = "Bài làm quá sơ sài so với nội dung media. " + feedback

        if data.get("corrections"):
            feedback += "\n\nSửa lỗi: " + "; ".join(data["corrections"])

        return feedback, score, ""

    except json.JSONDecodeError:
        # Fallback regex nếu JSON lỗi
        import re
        score_match = re.search(r'\b(\d{1,3})', text_resp)
        score = float(score_match.group(1)) if score_match else 0.0
        return text_resp, score, ""
        
    except Exception as e:
        logging.error(f"Grading error: {e}")
        return "Hệ thống AI đang bận, vui lòng thử lại sau.", 0.0, str(e)