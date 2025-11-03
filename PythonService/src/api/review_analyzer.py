import logging
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    MODEL_NAME = "gemini-1.5-flash"

    # Định nghĩa các quy tắc chung cho model
    # Yêu cầu model LUÔN trả về JSON
    SYSTEM_INSTRUCTION = (
        "You are a strict content moderation and analysis AI for a language learning app. "
        "Your sole output MUST be a valid JSON object. Do not include markdown backticks (```json) "
        "or any other text outside of the JSON structure."
    )

    # Khởi tạo model với cấu hình JSON
    GENERATION_CONFIG = genai.types.GenerationConfig(
        response_mime_type="application/json"
    )

    MODEL = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=SYSTEM_INSTRUCTION,
        generation_config=GENERATION_CONFIG
    )
    logging.info(f"Gemini model '{MODEL_NAME}' initialized successfully for review analysis.")

except Exception as e:
    logging.error(f"Failed to initialize Gemini model: {e}")
    MODEL = None
# ---------------------------------------------------


def build_review_prompt(content_type: str, rating: float, review_text: str) -> str:
    """
    Xây dựng một prompt chi tiết và khách quan cho Gemini.
    """
    return f"""
    Please analyze the following user review for our learning platform.

    **Input Data:**
    - Content Type: "{content_type}" (e.g., "COURSE", "LESSON", "VIDEO")
    - Rating Given: {rating}/5
    - Review Text: "{review_text}"

    **Analysis Task:**
    Provide your analysis as a JSON object strictly matching this format:
    {{
      "is_valid": <boolean>,
      "sentiment": "<POSITIVE|NEUTRAL|NEGATIVE>",
      "topics": ["<topic1>", "<topic2>", ...],
      "suggested_action": "<AUTO_APPROVE|FLAG_FOR_MODERATION>"
    }}

    **Rules for Analysis:**
    1.  **is_valid (boolean):**
        - 'false' if the text is clearly spam (e.g., "asdfasdf", "buy my stuff"), hate speech, harassment, 
          or contains fewer than 5 meaningful words.
        - 'true' for all other cases, even if the feedback is negative.

    2.  **sentiment (string):**
        - "POSITIVE": Rating is >= 4.0 OR the text is clearly positive.
        - "NEGATIVE": Rating is <= 2.5 OR the text contains strong negative feedback.
        - "NEUTRAL": Rating is between 2.6 and 3.9 AND the text is mixed or neutral.

    3.  **topics (array of strings):**
        - Identify key topics. Choose one or more from this specific list:
          ["instructor", "content_quality", "content_difficulty", "sound_quality", 
           "video_quality", "ui_ux", "bug_report", "pricing", "general"]
        - If no specific topic fits, use ["general"].

    4.  **suggested_action (string):**
        - "FLAG_FOR_MODERATION": Use this if 'is_valid' is 'false' OR if the review contains 
          severe accusations, threats, or extreme profanity.
        - "AUTO_APPROVE": Use this for all other valid reviews.

    Return ONLY the JSON object.
    """


async def analyze_review(
    user_id: str,
    content_id: str,
    review_text: str,
    rating: float,
    content_type: str,
):
    """
    Hàm AI phân tích review bằng Gemini.
    """
    logging.info(f"Analyzing review for {content_type} {content_id} from {user_id} using Gemini.")

    if not MODEL:
        error_msg = "Gemini model is not initialized."
        logging.error(error_msg)
        return False, "NEUTRAL", ["general"], "FLAG_FOR_MODERATION", error_msg

    # Tạo prompt
    prompt = build_review_prompt(content_type, rating, review_text)

    # Giá trị mặc định an toàn (nếu có lỗi thì sẽ gắn cờ)
    default_error_return = (False, "NEUTRAL", ["general"], "FLAG_FOR_MODERATION")

    try:
        # Gọi Gemini API
        response = await MODEL.generate_content_async(prompt)

        # Parse JSON response
        try:
            data = json.loads(response.text)

            # Bóc tách dữ liệu một cách an toàn
            is_valid = data.get("is_valid", False)
            sentiment = data.get("sentiment", "NEUTRAL")
            topics = data.get("topics", ["general"])
            suggested_action = data.get("suggested_action", "FLAG_FOR_MODERATION")

            # Đảm bảo kiểu dữ liệu
            if not isinstance(is_valid, bool):
                is_valid = False
            if not isinstance(topics, list) or not topics:
                topics = ["general"]

            logging.info(f"Review analysis complete for {content_id}. Action: {suggested_action}")
            return is_valid, sentiment, topics, suggested_action, "" # Không có lỗi

        except json.JSONDecodeError as json_err:
            error_msg = f"Gemini response parsing error: {json_err}. Response was: {response.text}"
            logging.error(error_msg)
            return *default_error_return, error_msg

    except Exception as e:
        error_msg = f"Gemini API call failed: {str(e)}"
        logging.error(error_msg)
        return *default_error_return, error_msg