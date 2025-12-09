import azure.cognitiveservices.speech as speechsdk
import os
import logging
import asyncio

logger = logging.getLogger("AzureSTT")

class AzureTranscriber:
    def __init__(self, callback_final, callback_interim, language="en-US"):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.service_region = os.getenv("AZURE_SPEECH_REGION")
        
        if not self.speech_key or not self.service_region:
            logger.error("❌ MISSING AZURE CREDENTIALS in .env")
            raise ValueError("Azure Key/Region missing")

        self.language = language
        self.callback_final = callback_final
        self.callback_interim = callback_interim
        self.loop = asyncio.get_event_loop()
        
        # Stream Format: Client React Native gửi lên 16kHz, 16bit, Mono
        self.stream_format = speechsdk.audio.AudioStreamFormat(samples_per_second=16000, bits_per_sample=16, channels=1)
        self.push_stream = speechsdk.audio.PushAudioInputStream(stream_format=self.stream_format)
        
        # Config Speech
        self.speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.service_region)
        self.speech_config.speech_recognition_language = self.language
        
        # Tắt kiểm duyệt từ ngữ nhạy cảm (tùy chọn) để tăng tốc
        self.speech_config.set_profanity(speechsdk.ProfanityOption.Raw)
        
        # Tối ưu connection
        self.speech_config.set_property(speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "1500") 
        
        self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
        self.recognizer = speechsdk.SpeechRecognizer(speech_config=self.speech_config, audio_config=self.audio_config)

        # Events
        self.recognizer.recognizing.connect(self.on_recognizing)
        self.recognizer.recognized.connect(self.on_recognized)
        self.recognizer.session_started.connect(lambda evt: logger.info(f"✅ Azure Session Started: {evt}"))
        self.recognizer.session_stopped.connect(lambda evt: logger.info(f"🛑 Azure Session Stopped: {evt}"))
        self.recognizer.canceled.connect(self.on_canceled)

    def start(self):
        try:
            self.recognizer.start_continuous_recognition()
        except Exception as e:
            logger.error(f"Failed to start Azure: {e}")

    def stop(self):
        try:
            self.recognizer.stop_continuous_recognition()
            self.push_stream.close()
        except Exception as e:
            logger.error(f"Error stopping Azure: {e}")

    def write_stream(self, pcm_bytes: bytes):
        if pcm_bytes:
            self.push_stream.write(pcm_bytes)

    # --- Callbacks ---
    def on_recognizing(self, evt):
        # Kết quả tạm thời (Interim)
        if evt.result.text:
            asyncio.run_coroutine_threadsafe(self.callback_interim(evt.result.text), self.loop)

    def on_recognized(self, evt):
        # Kết quả chốt câu (Final)
        if evt.result.text:
            asyncio.run_coroutine_threadsafe(self.callback_final(evt.result.text), self.loop)

    def on_canceled(self, evt):
        cancellation_details = evt.result.cancellation_details
        logger.warning(f"⚠️ Azure Canceled. Reason: {cancellation_details.reason}")
        
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            logger.error(f"❌ Azure Error Details: {cancellation_details.error_details}")
            logger.error("👉 CHECK YOUR .ENV: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")