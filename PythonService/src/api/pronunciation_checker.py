import azure.cognitiveservices.speech as speechsdk
import google.generativeai as genai
import logging
import json
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

# --- CẤU HÌNH CÁC API KEYS ---
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- KHỞI TẠO CÁC DỊCH VỤ ---
try:
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    
    genai.configure(api_key=GEMINI_API_KEY)
    # Sử dụng model hỗ trợ async
    gemini_model = genai.GenerativeModel('gemini-1.5-flash') 
except Exception as e:
    logging.error(f"Lỗi khởi tạo API: {e}")
    speech_config = None
    gemini_model = None

# -------------------------------------------------------------------
# HÀM MỚI (PUBLIC): Đây là hàm mà learning_service.py sẽ gọi
# -------------------------------------------------------------------
async def check_pronunciation(audio_bytes: bytes, reference_text: str):
    """
    Hàm "cầu nối" chính.
    1. Nhận bytes âm thanh và văn bản tham chiếu.
    2. Lưu bytes ra file tạm.
    3. Gọi hàm phân tích nội bộ (_analyze_with_gemini).
    4. Xóa file tạm.
    5. Trả về (feedback, score, error) như learning_service.py mong muốn.
    """
    if not speech_config or not gemini_model:
        return ("Lỗi: Dịch vụ AI chưa được khởi tạo.", 0, "ServiceInitializationError")
        
    if not audio_bytes or not reference_text:
        return ("Lỗi: Dữ liệu âm thanh hoặc văn bản tham chiếu bị thiếu.", 0, "MissingInput")

    temp_file_path = None
    try:
        # 1. Lưu bytes ra file tạm
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio_bytes)
            temp_file_path = f.name
        
        logging.info(f"Audio bytes saved to temporary file: {temp_file_path}")

        # 2. Gọi hàm phân tích nội bộ (Azure + Gemini)
        feedback, score, error = await _analyze_with_gemini(temp_file_path, reference_text)
        
        return (feedback, score, error)

    except Exception as e:
        logging.error(f"Lỗi xử lý file tạm hoặc phân tích: {e}", exc_info=True)
        return (f"Lỗi máy chủ nội bộ: {e}", 0, str(e))
    
    finally:
        # 3. Luôn dọn dẹp file tạm
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logging.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logging.error(f"Không thể xóa file tạm: {e}")

# -------------------------------------------------------------------
# HÀM NỘI BỘ (LOGIC CŨ CỦA BẠN): Đã được sửa để trả về 3 giá trị
# -------------------------------------------------------------------
async def _analyze_with_gemini(audio_file_path, reference_text):
    """
    Hàm này gọi Azure để chấm điểm, sau đó gọi Gemini để diễn giải kết quả.
    Trả về: (feedback_string, score_int, error_string_or_none)
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
            return ("Lỗi: Không nhận dạng được giọng nói từ file âm thanh.", 0, "Azure NoMatch")
        elif result.reason == speechsdk.ResultReason.Canceled:
            logging.error(f"Azure bị hủy: {result.cancellation_details.reason}")
            return (f"Lỗi Azure: {result.cancellation_details.reason}", 0, "Azure Canceled")

    except Exception as e:
        logging.error(f"Lỗi ở Bước 1 (Azure): {e}")
        return (f"Lỗi khi gọi Azure: {e}", 0, str(e))

    if not pron_result_raw:
        return ("Lỗi: Không lấy được kết quả phát âm từ Azure.", 0, "Azure NoResult")

    # --- (Giả lập Bước 1.5: Lấy cảm xúc) ---
    emotion_result = "calm (bình tĩnh)"

    # --- BƯỚC 2: GỌI GEMINI ĐỂ DIỄN GIẢI KẾT QUẢ ---
    try:
        logging.info("Đang gọi Gemini để tổng hợp phân tích...")

        # Trích xuất dữ liệu "thô" từ Azure
        accuracy_score = pron_result_raw.accuracy_score
        fluency_score = pron_result_raw.fluency_score
        # Lấy điểm phát âm (pron_score) làm điểm số chính
        pron_score = pron_result_raw.pronunciation_score

        error_details = []
        for word in pron_result_raw.words:
            if word.error_type != 'None':
                error_details.append(f"- Từ '{word.word}': Bị lỗi {word.error_type}.")
        error_summary = "\n".join(error_details) if error_details else "Không có lỗi nào, phát âm rất tốt!"

        # Xây dựng Prompt cho Gemini
        prompt = f"""
        Bạn là một gia sư AI dạy phát âm, tên là 'MonkeyLingua AI'.
        Hãy đưa ra phản hồi cho học viên một cách thân thiện, chi tiết và chuyên nghiệp.

        Dữ liệu phân tích buổi nói của học viên:
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
        Hãy viết một bài phân tích đầy đủ cho học viên bao gồm:
        - **Chào hỏi và Nhận xét tổng quan:** Động viên họ và nhận xét chung dựa trên điểm số.
        - **Phân tích chi tiết:** Chỉ ra họ đã nói thừa/thiếu/sai từ (nếu 'azure_transcript' khác 'reference_text'). Dựa vào "Chi tiết lỗi phát âm", giải thích cụ thể họ sai ở đâu và hướng dẫn họ cách sửa.
        - **Lời khuyên:** Đưa ra 1-2 mẹo để cải thiện.
        - **Kết luận:** Động viên và kết thúc.
        """

        # Sử dụng generate_content_async để không block
        response = await gemini_model.generate_content_async(prompt)

        logging.info("Đã nhận được phân tích từ Gemini.")
        # Trả về thành công
        return (response.text, pron_score, None)

    except Exception as e:
        logging.error(f"Lỗi ở Bước 2 (Gemini): {e}")
        # Trả về lỗi, nhưng vẫn kèm điểm số (pron_score) từ Azure
        return (f"Lỗi khi phân tích Gemini: {e}", pron_score, str(e))