# import azure.cognitiveservices.speech as speechsdk
# import google.generativeai as genai
# import logging
# import json
# import os
# import tempfile
# import asyncio
# from dotenv import load_dotenv
# from typing import AsyncGenerator, Tuple

# load_dotenv()

# # --- CẤU HÌNH CÁC API KEYS ---
# AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
# AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
# GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# # --- KHỞI TẠO CÁC DỊCH VỤ ---
# try:
#     speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
#     genai.configure(api_key=GEMINI_API_KEY)
#     gemini_model = genai.GenerativeModel('gemini-1.5-flash')
# except Exception as e:
#     logging.error(f"Lỗi khởi tạo API: {e}")
#     speech_config = None
#     gemini_model = None


# class PronunciationAnalyzer:
#     """Lớp phân tích phát âm với hỗ trợ streaming chunks"""

#     def __init__(self):
#         self.temp_files = []

#     def _save_temp_file(self, audio_bytes: bytes) -> str:
#         """Lưu bytes audio vào file tạm"""
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
#             f.write(audio_bytes)
#             self.temp_files.append(f.name)
#             return f.name

#     def _cleanup_temp_files(self):
#         """Dọn dẹp tất cả file tạm"""
#         for file_path in self.temp_files:
#             if os.path.exists(file_path):
#                 try:
#                     os.remove(file_path)
#                     logging.info(f"Cleaned up: {file_path}")
#                 except Exception as e:
#                     logging.error(f"Không thể xóa file: {e}")
#         self.temp_files.clear()

#     async def analyze_pronunciation_async(
#         self,
#         audio_bytes: bytes,
#         reference_text: str
#     ) -> Tuple[str, float, str]:
#         """
#         Phân tích phát âm đồng bộ (cho non-streaming requests)
#         Returns: (feedback_str, score_float, error_str)
#         """
#         if not speech_config or not gemini_model:
#             return ("Lỗi: Dịch vụ AI chưa được khởi tạo.", 0.0, "ServiceInitializationError")

#         if not audio_bytes or not reference_text:
#             return ("Lỗi: Dữ liệu âm thanh hoặc văn bản tham chiếu bị thiếu.", 0.0, "MissingInput")

#         temp_file_path = None
#         try:
#             temp_file_path = self._save_temp_file(audio_bytes)
#             logging.info(f"Audio saved to: {temp_file_path}")

#             # Gọi Azure để chấm điểm
#             pron_result_raw = self._call_azure_pronunciation(temp_file_path, reference_text)
#             if pron_result_raw is None:
#                 return ("Lỗi: Không nhận dạng được giọng nói.", 0.0, "Azure NoMatch")

#             # Gọi Gemini để tạo feedback
#             feedback, score = await self._call_gemini_analysis(pron_result_raw, reference_text)
#             return (feedback, score, "")

#         except Exception as e:
#             logging.error(f"Lỗi phân tích: {e}", exc_info=True)
#             return (f"Lỗi máy chủ: {e}", 0.0, str(e))
#         finally:
#             self._cleanup_temp_files()

#     def _call_azure_pronunciation(self, audio_file_path: str, reference_text: str):
#         """Gọi Azure Pronunciation Assessment"""
#         try:
#             audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)
            
#             pronunciation_config = speechsdk.PronunciationAssessmentConfig(
#                 reference_text=reference_text,
#                 grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
#                 granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
#                 enable_miscue="True"
#             )

#             recognizer = speechsdk.SpeechRecognizer(
#                 speech_config=speech_config,
#                 audio_config=audio_config
#             )
#             pronunciation_config.apply_to(recognizer)
#             result = recognizer.recognize_once()

#             if result.reason == speechsdk.ResultReason.RecognizedSpeech:
#                 logging.info(f"Azure recognized: '{result.text}'")
#                 return speechsdk.PronunciationAssessmentResult(result)
#             elif result.reason == speechsdk.ResultReason.NoMatch:
#                 logging.error("Azure: No speech detected")
#                 return None
#             elif result.reason == speechsdk.ResultReason.Canceled:
#                 logging.error(f"Azure Canceled: {result.cancellation_details.reason}")
#                 return None

#         except Exception as e:
#             logging.error(f"Azure call error: {e}")
#             return None

#     async def _call_gemini_analysis(self, pron_result, reference_text: str) -> Tuple[str, float]:
#         """Gọi Gemini để phân tích và tạo feedback"""
#         try:
#             accuracy_score = pron_result.accuracy_score
#             fluency_score = pron_result.fluency_score
#             pron_score = pron_result.pronunciation_score
            
#             error_details = []
#             for word in pron_result.words:
#                 if word.error_type != 'None':
#                     error_details.append(f"- '{word.word}': {word.error_type}")
#             error_summary = "\n".join(error_details) if error_details else "Phát âm hoàn hảo!"

#             prompt = f"""
# Bạn là gia sư AI dạy phát âm tên 'MonkeyLingua AI'. Hãy đưa ra phân tích thân thiện nhưng chuyên nghiệp.

# **Dữ liệu buổi nói:**
# - Văn bản chuẩn: "{reference_text}"
# - Độ chính xác: {accuracy_score}/100
# - Độ lưu loát: {fluency_score}/100
# - Phát âm: {pron_score}/100

# **Lỗi phát âm:**
# {error_summary}

# Hãy viết phân tích gồm:
# 1. **Nhận xét chung**: Động viên, nhận xét chung
# 2. **Chi tiết**: Phân tích cụ thể các lỗi
# 3. **Mẹo cải thiện**: 1-2 lời khuyên
# 4. **Kết luận**: Động viên tiếp tục luyện tập

# Viết bằng tiếng Việt, ngắn gọn và rõ ràng.
# """

#             response = await gemini_model.generate_content_async(prompt)
#             logging.info("Gemini analysis completed")
#             return (response.text, pron_score)

#         except Exception as e:
#             logging.error(f"Gemini analysis error: {e}")
#             return ("Lỗi phân tích Gemini", pron_score)

#     async def stream_pronunciation_chunks(
#         self,
#         audio_bytes: bytes,
#         reference_text: str,
#         chunk_size: int = 512
#     ) -> AsyncGenerator[dict, None]:
#         """
#         Stream pronunciation chunks realtime
#         Yields: {"chunk_index": int, "status": str, "score": float, "feedback": str, "is_final": bool}
#         """
#         if not speech_config or not gemini_model:
#             yield {"status": "error", "error": "Service not initialized", "is_final": True}
#             return

#         temp_file_path = None
#         try:
#             temp_file_path = self._save_temp_file(audio_bytes)
#             chunk_index = 0

#             # Simulate streaming by chunking analysis
#             total_chunks = max(1, len(audio_bytes) // chunk_size)

#             # Yield initial status
#             yield {
#                 "chunk_index": chunk_index,
#                 "status": "analyzing",
#                 "message": "Đang phân tích phát âm...",
#                 "is_final": False
#             }
#             chunk_index += 1

#             # Call Azure for initial assessment
#             pron_result = self._call_azure_pronunciation(temp_file_path, reference_text)
#             if pron_result is None:
#                 yield {
#                     "chunk_index": chunk_index,
#                     "status": "error",
#                     "error": "Không nhận dạng được giọng nói",
#                     "is_final": True
#                 }
#                 return

#             chunk_index += 1

#             # Yield partial score
#             yield {
#                 "chunk_index": chunk_index,
#                 "status": "scored",
#                 "score": pron_result.pronunciation_score,
#                 "accuracy": pron_result.accuracy_score,
#                 "fluency": pron_result.fluency_score,
#                 "message": f"Điểm phát âm: {pron_result.pronunciation_score:.1f}/100",
#                 "is_final": False
#             }
#             chunk_index += 1

#             # Yield word-by-word analysis
#             yield {
#                 "chunk_index": chunk_index,
#                 "status": "word_analysis",
#                 "words": [
#                     {
#                         "word": w.word,
#                         "accuracy": w.accuracy_score,
#                         "error_type": w.error_type
#                     }
#                     for w in pron_result.words
#                 ],
#                 "message": "Phân tích từng từ",
#                 "is_final": False
#             }
#             chunk_index += 1

#             # Yield Gemini feedback
#             yield {
#                 "chunk_index": chunk_index,
#                 "status": "generating_feedback",
#                 "message": "Đang tạo phân tích chi tiết...",
#                 "is_final": False
#             }

#             feedback, score = await self._call_gemini_analysis(pron_result, reference_text)

#             yield {
#                 "chunk_index": chunk_index,
#                 "status": "completed",
#                 "score": score,
#                 "feedback": feedback,
#                 "message": "Phân tích hoàn tất",
#                 "is_final": True
#             }

#         except Exception as e:
#             logging.error(f"Stream error: {e}", exc_info=True)
#             yield {
#                 "status": "error",
#                 "error": str(e),
#                 "is_final": True
#             }
#         finally:
#             self._cleanup_temp_files()


# # --- SINGLETON INSTANCE ---
# analyzer = PronunciationAnalyzer()


# # --- PUBLIC FUNCTIONS (cho learning_service.py) ---
# async def check_pronunciation(
#     audio_bytes: bytes,
#     reference_text: str
# ) -> Tuple[str, float, str]:
#     """
#     Hàm chính cho non-streaming pronunciation check
#     Returns: (feedback_str, score_float, error_str)
#     """
#     return await analyzer.analyze_pronunciation_async(audio_bytes, reference_text)


# async def stream_pronunciation(
#     audio_bytes: bytes,
#     reference_text: str
# ) -> AsyncGenerator[dict, None]:
#     """
#     Hàm streaming cho realtime feedback
#     Yields chunks incrementally
#     """
#     async for chunk in analyzer.stream_pronunciation_chunks(audio_bytes, reference_text):
#         yield chunk
import azure.cognitiveservices.speech as speechsdk
import google.generativeai as genai
import logging
import os
import tempfile
import asyncio
from dotenv import load_dotenv
from typing import AsyncGenerator, Tuple, Dict, Any

load_dotenv()

# --- CONFIG ---
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

try:
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    genai.configure(api_key=GEMINI_API_KEY)
    # Dùng Flash cho nhanh và rẻ
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    logging.error(f"Init Error: {e}")
    speech_config = None
    gemini_model = None

class PronunciationAnalyzer:
    def __init__(self):
        self.temp_files = []

    def _save_temp_file(self, audio_bytes: bytes) -> str:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(audio_bytes)
            self.temp_files.append(f.name)
            return f.name

    def _cleanup(self):
        for p in self.temp_files:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass
        self.temp_files.clear()

    async def analyze(self, audio_bytes: bytes, reference_text: str, language: str) -> Tuple[str, float, str]:
        """Core logic cho CheckPronunciation (Non-streaming)"""
        if not audio_bytes or not reference_text:
            return "Missing input data", 0.0, "INVALID_INPUT"

        try:
            temp_path = self._save_temp_file(audio_bytes)
            
            # 1. Gọi Azure để lấy điểm số kỹ thuật
            azure_result = self._call_azure(temp_path, reference_text, language)
            if not azure_result:
                return "Không nghe rõ giọng nói. Hãy thử lại.", 0.0, "NO_MATCH"

            # 2. Gọi Gemini để nhận xét "Con người" hóa
            feedback, score = await self._call_gemini_feedback(azure_result, reference_text)
            
            return feedback, score, ""
        except Exception as e:
            logging.error(f"Analysis error: {e}")
            return "Lỗi xử lý hệ thống", 0.0, str(e)
        finally:
            self._cleanup()

    def _call_azure(self, audio_path: str, ref_text: str, lang: str):
        # Map language code if needed (e.g., 'vi' -> 'vi-VN')
        lang_map = {'vi': 'vi-VN', 'en': 'en-US'}
        azure_lang = lang_map.get(lang, 'en-US')

        audio_cfg = speechsdk.audio.AudioConfig(filename=audio_path)
        # Tạo config chấm điểm
        pron_cfg = speechsdk.PronunciationAssessmentConfig(
            reference_text=ref_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue=True
        )
        
        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config, 
            language=azure_lang,
            audio_config=audio_cfg
        )
        pron_cfg.apply_to(recognizer)
        
        result = recognizer.recognize_once()
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return speechsdk.PronunciationAssessmentResult(result)
        return None

    async def _call_gemini_feedback(self, azure_res, ref_text) -> Tuple[str, float]:
        score = azure_res.pronunciation_score
        
        # Tổng hợp lỗi từ Azure
        errors = [f"Word '{w.word}': {w.error_type}" for w in azure_res.words if w.error_type != 'None']
        error_str = "\n".join(errors) if errors else "Perfect pronunciation!"

        prompt = f"""
        Act as a friendly language tutor named 'MonkeyLingua'.
        Analyze this pronunciation attempt:
        - Target Sentence: "{ref_text}"
        - Technical Score: {score}/100
        - Fluency: {azure_res.fluency_score}/100
        - Detailed Errors: {error_str}

        Task:
        1. Give a short, encouraging comment (in Vietnamese).
        2. Point out specific words to improve (if any).
        3. Keep it under 3 sentences.
        """
        try:
            resp = await gemini_model.generate_content_async(prompt)
            return resp.text, score
        except:
            return "Phát âm khá tốt! Hãy tiếp tục luyện tập.", score

    async def stream_logic(self, audio_bytes: bytes, ref_text: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Logic cho Streaming (Giả lập chunking vì Azure Python SDK khó stream async thực sự)"""
        # Yield trạng thái ban đầu
        yield {"type": "metadata", "status": "analyzing", "feedback": "Đang phân tích..."}

        # Reuse logic analyze
        feedback, score, error = await self.analyze(audio_bytes, ref_text, "en") # Default en for now
        
        if error:
            yield {"type": "error", "feedback": feedback, "is_final": True}
        else:
            # Yield kết quả cuối
            yield {
                "type": "final",
                "score": score,
                "feedback": feedback,
                "is_final": True
            }

# Singleton
analyzer = PronunciationAnalyzer()

# --- EXPORT FUNCTIONS FOR SERVICE ---
async def check_pronunciation_logic(audio_bytes, ref_text, lang):
    return await analyzer.analyze(audio_bytes, ref_text, lang)

async def stream_pronunciation_logic(audio_bytes, ref_text):
    async for chunk in analyzer.stream_logic(audio_bytes, ref_text):
        yield chunk