import os

import logging

from dotenv import load_dotenv

import google.generativeai as genai

# Import lỗi giới hạn tần suất và các lỗi khác từ API

from google.api_core.exceptions import ResourceExhausted, NotFound, PermissionDenied, GoogleAPICallError



load_dotenv()

genai.api_key = os.getenv("GOOGLE_API_KEY")



# ============ CẤU HÌNH CÁC CẤP ĐỘ MODEL DỰ PHÒNG ============

# Thử theo thứ tự: Pro (chất lượng) -> Flash (tốc độ) -> Lite (tiết kiệm) -> Live (vĩnh viễn)

# Giữ nguyên cấu hình để tận dụng cấp độ chất lượng cao nhất khi có thể.

MODEL_TIERS = [

    {"name": "gemini-2.5-pro", "purpose": "Pro - Chất lượng tối đa (2 RPM)"},

    {"name": "gemini-2.5-flash", "purpose": "Flash - Cân bằng tốt nhất (10 RPM)"},

    {"name": "gemini-2.5-flash-lite", "purpose": "Lite - Tiết kiệm chi phí (15 RPM)"},

    {"name": "gemini-2.5-flash-live", "purpose": "LIVE - Dự phòng cuối cùng (Unlimited)"},

]

# ==========================================================





async def chat_with_ai(

        message: str,

        history: list[dict],

        language: str,

        user_profile: dict | None = None,

) -> tuple[str, str]:

    """

    Thử lần lượt các model theo cấp độ, dự phòng khi hết giới hạn (ResourceExhausted).

    """

    

    # 1. --- SETUP: System Instruction & Messages ---

    system_instruction = (

        "You are a friendly and helpful language learning assistant "

        "for the 'MonkeyLingua' app."

    )



    if user_profile:

        profile_summary = f"User ID: {user_profile.get('user_id')}. "

        

        # Thêm thông tin cá nhân hóa chi tiết hơn

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

        # Chuyển đổi 'assistant' -> 'model' cho Gemini SDK

        role = "model" if h.get("role") == "assistant" else h.get("role")

        # Đảm bảo nội dung là chuỗi

        content = h.get("content")

        if isinstance(content, str):

            messages.append({'role': role, 'parts': [{'text': content}]})

    

    messages.append({'role': 'user', 'parts': [{'text': message}]})

    # ---------------------------------------------------





    # 2. --- CASCADING FALLBACK LOGIC ---

    for tier in MODEL_TIERS:

        current_model = tier["name"]

        

        try:

            logging.info(f"Attempting to use model: {current_model} ({tier['purpose']})")

            

            model = genai.GenerativeModel(

                current_model,

                system_instruction=system_instruction

            )

            

            # Sử dụng await để gọi async API

            response = await model.generate_content_async(messages)



            # THÀNH CÔNG: Kiểm tra phản hồi có nội dung không

            reply_text = response.text

            if reply_text.strip():

                logging.info(f"Successfully received response from {current_model}")

                return reply_text, ""

            else:

                # TRƯỜNG HỢP KHÔNG CÓ LỖI NHƯNG PHẢN HỒI RỖNG (Ví dụ: Safety Filter)

                logging.warning(f"Model {current_model} returned empty response (possibly due to safety blocks or configuration). Falling back...")

                continue # Thử model tiếp theo



        except ResourceExhausted:

            # LỖI GIỚI HẠN TẦN SUẤT: Thử model tiếp theo

            logging.warning(f"Rate limit hit for model {current_model}. Falling back...")

            continue

            

        except NotFound as e:

            # LỖI 404: Mô hình không tồn tại

            logging.error(f"Model {current_model} not found (404). Check API key/version: {str(e)}", exc_info=True)

            # Lỗi này thường là lỗi cấu hình, nhưng ta vẫn thử model tiếp theo để dự phòng

            continue 

        

        except PermissionDenied as e:

            # LỖI XÁC THỰC/QUYỀN: API Key không có quyền. Dừng lại, không fallback

            logging.critical(f"Permission denied (403) for model {current_model}. Check API Key configuration: {str(e)}")

            return "", f"Authentication/Permission error on model {current_model}. Key might be invalid or restricted."

            

        except GoogleAPICallError as e:

            # BẮT CÁC LỖI API KHÁC (ví dụ: bad request, internal server error)

            logging.error(f"Google API Call Error with {current_model}: {str(e)}", exc_info=True)

            continue # Thử model tiếp theo

            

        except Exception as e:

            # CÁC LỖI KHÔNG XÁC ĐỊNH (Network, I/O, etc.)

            logging.error(f"Unknown generic error with {current_model}: {str(e)}", exc_info=True)

            continue 



    # 3. --- THẤT BẠI HOÀN TOÀN ---

    logging.error("All model tiers failed due to rate limits or unknown issues.")

    return "", "All language services are currently unavailable or overloaded. Please try again later. Check logs for details."





async def chat_with_ai_stream(

        message: str,

        history: list[dict],

        user_profile: dict | None = None,

):

    """

    Phiên bản streaming: sử dụng mô hình tối ưu nhất cho streaming (Flash).

    Đã bổ sung logic cá nhân hóa (user_profile).

    """

    # Ta chỉ dùng model Flash cho streaming để tối ưu tốc độ phản hồi đầu tiên.

    MODEL_STREAM = "gemini-2.5-flash" 

    

    try:

        # --- 1. Personalization (Tạo System Instruction) ---

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



        # --- 2. Ghép lịch sử hội thoại ---

        messages = []

        for h in history:

            role = "model" if h["role"] == "assistant" else h["role"]

            content = h.get("content")

            if isinstance(content, str):

                messages.append({'role': role, 'parts': [{'text': content}]})



        messages.append({'role': 'user', 'parts': [{'text': message}]})



        # --- 3. Khởi tạo Model và Gọi API ---

        model = genai.GenerativeModel(

            MODEL_STREAM,

            system_instruction=system_instruction

        )

        

        response_stream = await model.generate_content_async(

            messages,

            stream=True

        )



        # Sử dụng logic async for để yield chunk

        async for chunk in response_stream:

            if chunk.parts and chunk.parts[0].text:

                yield chunk.parts[0].text



    except ResourceExhausted:

        # Lỗi Rate limit cho streaming (ít xảy ra, nhưng vẫn bắt)

        logging.error(f"Gemini streaming rate limit hit for {MODEL_STREAM}.", exc_info=True)

        yield "Error: Chat service is currently busy. Please try non-streaming mode."

    

    except Exception as e:

        logging.error(f"Gemini streaming chat error: {str(e)}", exc_info=True)

        yield f"Error: Failed to stream response ({type(e).__name__})."