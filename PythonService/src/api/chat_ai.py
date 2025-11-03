import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Khởi tạo model (chỉ định tên model)
MODEL_NAME = "gemini-1.5-flash"


async def chat_with_ai(
    message: str,
    history: list[dict],
    language: str,
    user_profile: dict | None = None,
) -> tuple[str, str]:
    """
    message: tin nhắn hiện tại từ user
    history: danh sách lịch sử [{role: "user"/"model", content: "..."}]
    language: ngôn ngữ (hiện tại Gemini tự phát hiện, nhưng vẫn truyền vào)
    user_profile: Dữ liệu cá nhân hóa (từ cache/DB)
    """
    try:
        # --- Personalization ---
        system_instruction = (
            "You are a friendly and helpful language learning assistant "
            "for the 'LinguaMonkey' app."
        )

        if user_profile:
            profile_summary = f"User ID: {user_profile.get('user_id')}. "
            if user_profile.get("recent_messages_summary"):
                profile_summary += (
                    "Their recent messages were about: "
                    f"{user_profile.get('recent_messages_summary')}. "
                )

            system_instruction += (
                "\n\n--User Context (Use this to personalize your response)\n"
                f"{profile_summary}\n"
                "Tailor your explanations and examples to this user.\n"
                "----------------------------------------------------------"
            )

        # Khởi tạo model với system_instruction
        model = genai.GenerativeModel(
            MODEL_NAME, system_instruction=system_instruction
        )

        # Ghép lịch sử hội thoại
        chat = model.start_chat(history=history)

        # Gửi tin nhắn (thêm ngôn ngữ vào tin nhắn nếu cần)
        # prompt = f"[Language: {language}] {message}"

        response = await chat.send_message_async(message)
        return response.text, ""

    except Exception as e:
        logging.error(f"Gemini chat error: {str(e)}")
        return "", str(e)
