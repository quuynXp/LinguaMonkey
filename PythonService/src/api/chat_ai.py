import os
import logging
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
# Thiết lập API key
genai.api_key = os.getenv("GOOGLE_API_KEY")

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
    history: danh sách lịch sử [{role: "user"/"assistant", content: "..."}]
    language: ngôn ngữ (Gemini tự phát hiện, vẫn có thể dùng để thêm vào prompt)
    user_profile: Dữ liệu cá nhân hóa (từ cache/DB)
    """
    try:
        # --- Personalization ---
        system_instruction = (
            "You are a friendly and helpful language learning assistant "
            "for the 'MonkeyLingua' app."
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

        # --- Ghép lịch sử hội thoại ---
        # Google GenAI mới không dùng model.start_chat trực tiếp
        # Chúng ta tạo messages list: [{"role": "system"/"user"/"assistant", "content": "..."}]
        messages = [{"role": "system", "content": system_instruction}]
        # chuyển history sang role "user" / "assistant"
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})

        # **LOGIC SỬA: Thêm tin nhắn của user SAU vòng lặp**
        messages.append({"role": "user", "content": message})

        # Gọi API async
        response = await genai.chat.completions.create(
            model=MODEL_NAME,
            messages=messages
        )

        # Lấy nội dung trả về
        reply_text = response.choices[0].message.content
        return reply_text, ""

    except Exception as e:
        logging.error(f"Gemini chat error: {str(e)}")
        return "", str(e)


async def chat_with_ai_stream(
        message: str,
        history: list[dict],
        user_profile: dict | None = None,
):
    try:
        system_instruction = (
            "You are a friendly and helpful language learning assistant "
            "for the 'MonkeyLingua' app."
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

        messages = [{"role": "system", "content": system_instruction}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})

        messages.append({"role": "user", "content": message})

        # Gọi API streaming
        model = genai.GenerativeModel(MODEL_NAME)
        response_stream = await model.generate_content_async(
            messages,
            stream=True
        )

        async for chunk in response_stream:
            if chunk.parts:
                yield chunk.parts[0].text

    except Exception as e:
        logging.error(f"Gemini streaming chat error: {str(e)}")
        yield f"Error: {str(e)}"