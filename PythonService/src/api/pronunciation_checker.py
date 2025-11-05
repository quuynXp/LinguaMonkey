import azure.cognitiveservices.speech as speechsdk
import google.generativeai as genai
import logging
import json
import os
from dotenv import load_dotenv

load_dotenv()

# --- CẤU HÌNH CÁC API KEYS ---
# Lấy từ Azure Portal (Dịch vụ Speech)
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")


# Lấy từ Google AI Studio
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

# Cấu hình logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- KHỞI TẠO CÁC DỊCH VỤ ---
try:
    # 1. Cấu hình Azure Speech
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)

    # 2. Cấu hình Gemini
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-pro-latest') # Hoặc 'gemini-pro'
except Exception as e:
    logging.error(f"Lỗi khởi tạo API: {e}")


def analyze_speaking_pronunciation(audio_file_path, reference_text):
    """
    Hàm này gọi Azure để chấm điểm, sau đó gọi Gemini để diễn giải kết quả.
    """

    pron_result_raw = None
    azure_transcript = ""

    # --- BƯỚC 1: GỌI AZURE PRONUNCIATION ASSESSMENT ---
    try:
        logging.info("Đang gọi Azure Pronunciation Assessment...")
        audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)

        pronunciation_config = speechsdk.PronunciationAssessmentConfig(
            reference_text=reference_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue="True"
        )

        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )
        pronunciation_config.apply_to(recognizer)

        result = recognizer.recognize_once()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            azure_transcript = result.text
            logging.info(f"Azure nhận dạng được: '{azure_transcript}'")

            pron_result_raw = speechsdk.PronunciationAssessmentResult(result)

        elif result.reason == speechsdk.ResultReason.NoMatch:
            logging.error("Azure không nhận dạng được giọng nói.")
            return "Lỗi: Không nhận dạng được giọng nói từ file âm thanh."
        elif result.reason == speechsdk.ResultReason.Canceled:
            logging.error(f"Azure bị hủy: {result.cancellation_details.reason}")
            return f"Lỗi: {result.cancellation_details.reason}"

    except Exception as e:
        logging.error(f"Lỗi ở Bước 1 (Azure): {e}")
        return f"Lỗi khi gọi Azure: {e}"

    # Nếu gọi Azure thành công, pron_result_raw sẽ có dữ liệu
    if not pron_result_raw:
        return "Lỗi: Không lấy được kết quả phát âm từ Azure."

    # --- (Giả lập Bước 1.5: Lấy cảm xúc) ---
    # Trong thực tế, bạn sẽ gọi mô hình SER ở đây
    emotion_result = "calm (bình tĩnh)"


    # --- BƯỚC 2: GỌI GEMINI ĐỂ DIỄN GIẢI KẾT QUẢ ---
    try:
        logging.info("Đang gọi Gemini để tổng hợp phân tích...")

        # Trích xuất dữ liệu "thô" từ Azure để đưa cho Gemini
        accuracy_score = pron_result_raw.accuracy_score
        fluency_score = pron_result_raw.fluency_score
        pron_score = pron_result_raw.pronunciation_score

        # Lấy chi tiết lỗi
        error_details = []
        for word in pron_result_raw.words:
            if word.error_type != 'None':
                error_details.append(f"- Từ '{word.word}': Bị lỗi {word.error_type}.")

        error_summary = "\n".join(error_details) if error_details else "Không có lỗi nào, phát âm rất tốt!"

        # Xây dựng Prompt cho Gemini
        prompt = f"""
        Bạn là một gia sư AI dạy phát âm tiếng Anh, tên là 'MonkeyLingua AI'.
        Hãy đưa ra phản hồi cho học viên một cách thân thiện, chi tiết và chuyên nghiệp.

        Dưới đây là dữ liệu phân tích buổi nói của học viên:

        1.  **Văn bản tham chiếu (Họ nên nói):** "{reference_text}"

        2.  **Văn bản nhận dạng được (Họ thực sự nói):** "{azure_transcript}"

        3.  **Điểm số (Thang 100):**
            - Điểm Chính xác (Accuracy): {accuracy_score}
            - Điểm Lưu loát (Fluency): {fluency_score}
            - Điểm Phát âm (Pronunciation): {pron_score}

        4.  **Cảm xúc (Tạm thời):** Giọng nói của bạn nghe có vẻ {emotion_result}.

        5.  **Chi tiết lỗi phát âm:**
            {error_summary}

        **Yêu cầu:**
        Hãy viết một bài phân tích đầy đủ cho học viên bao gồm các phần sau:
        - **Chào hỏi và Nhận xét tổng quan:** Động viên họ và nhận xét chung dựa trên điểm số.
        - **Phân tích chi tiết:** - Nếu 'azure_transcript' khác 'reference_text', chỉ ra họ đã nói thừa/thiếu/sai từ.
            - Dựa vào "Chi tiết lỗi phát âm", giải thích cụ thể họ sai ở đâu và hướng dẫn họ cách sửa.
        - **Lời khuyên:** Đưa ra 1-2 mẹo để cải thiện.
        - **Kết luận:** Động viên và kết thúc.
        """

        response = gemini_model.generate_content(prompt)

        logging.info("Đã nhận được phân tích từ Gemini.")
        return response.text

    except Exception as e:
        logging.error(f"Lỗi ở Bước 2 (Gemini): {e}")
        return f"Lỗi khi gọi Gemini: {e}"
