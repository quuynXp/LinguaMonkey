import logging
import os
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

# --- CẤU HÌNH AZURE ---
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")

LANGUAGE_VOICE_MAP = {
    "en": "en-US-JennyNeural",
    "vi": "vi-VN-HoaiMyNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
}

if AZURE_SPEECH_KEY and AZURE_SPEECH_REGION:
    try:
        speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
        # Thiết lập output format là WAV (cần cho việc trả về audio bytes)
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
        )
    except Exception as e:
        logging.error(f"Lỗi khởi tạo Azure Speech Config: {e}")
        speech_config = None
else:
    logging.warning("AZURE_SPEECH_KEY hoặc AZURE_SPEECH_REGION bị thiếu. TTS sẽ không hoạt động.")
    speech_config = None


def generate_tts(text: str, language: str) -> tuple[bytes, str]:
    """
    Text-to-Speech (TTS) generator sử dụng Azure Cognitive Services.

    :param text: Văn bản cần chuyển đổi.
    :param language: Mã ngôn ngữ (ví dụ: 'en', 'vi').
    :return: (audio_data_bytes, error_string)
    """
    if not speech_config:
        return b"", "TTS service is not initialized (missing Azure credentials)."
    
    voice_name = LANGUAGE_VOICE_MAP.get(language, LANGUAGE_VOICE_MAP.get("en"))
    
    # Thiết lập cú pháp SSML để chỉ định giọng nói
    ssml = f"""
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="{language}">
    <voice name="{voice_name}">
        {text}
    </voice>
</speak>
"""
    
    try:
        logging.info(f"Generating TTS for language '{language}' with voice '{voice_name}': '{text[:30]}...'")
        
        # Khởi tạo Synthesizer
        speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None) # audio_config=None để lấy bytes
        
        # Gọi hàm tổng hợp giọng nói
        result = speech_synthesizer.speak_ssml_async(ssml).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_data = result.audio_data
            logging.info(f"TTS successful. Generated {len(audio_data)} bytes of audio.")
            return audio_data, ""
        
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            error_msg = f"TTS Canceled: Reason={cancellation.reason}. "
            if cancellation.reason == speechsdk.CancellationReason.Error:
                error_msg += f"ErrorDetails={cancellation.error_details}"
            logging.error(error_msg)
            return b"", error_msg
        
        else:
            error_msg = f"TTS failed with unknown reason: {result.reason}"
            logging.error(error_msg)
            return b"", error_msg

    except Exception as e:
        error_msg = f"TTS generation critical error: {str(e)}"
        logging.error(error_msg, exc_info=True)
        return b"", error_msg