import azure.cognitiveservices.speech as speechsdk
import os
import logging
import asyncio
import json

logger = logging.getLogger("AzureSTT")

class AzureTranscriber:
    def __init__(self, callback_final, callback_interim, candidate_languages=None):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.service_region = os.getenv("AZURE_SPEECH_REGION")
        
        if not self.speech_key or not self.service_region:
            logger.error("❌ MISSING AZURE CREDENTIALS in .env")
            raise ValueError("Azure Key/Region missing")

        self.candidate_languages = candidate_languages or ["vi-VN", "en-US", "zh-CN", "ja-JP"]
        
        if len(self.candidate_languages) > 4:
            logger.warning(f"⚠️ Too many languages ({len(self.candidate_languages)}). Truncating to first 4 for Azure limits.")
            self.candidate_languages = self.candidate_languages[:4]

        self.callback_final = callback_final
        self.callback_interim = callback_interim
        self.loop = asyncio.get_event_loop()
        
        self.stream_format = speechsdk.audio.AudioStreamFormat(samples_per_second=16000, bits_per_sample=16, channels=1)
        self.push_stream = speechsdk.audio.PushAudioInputStream(stream_format=self.stream_format)
        
        self.speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.service_region)
        self.speech_config.set_profanity(speechsdk.ProfanityOption.Raw)
        self.speech_config.set_property(speechsdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "1500") 
        
        self.auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
            languages=self.candidate_languages
        )
        
        self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
        
        self.recognizer = speechsdk.SpeechRecognizer(
            speech_config=self.speech_config, 
            audio_config=self.audio_config,
            auto_detect_source_language_config=self.auto_detect_config
        )

        self.recognizer.recognizing.connect(self.on_recognizing)
        self.recognizer.recognized.connect(self.on_recognized)
        self.recognizer.session_started.connect(lambda evt: logger.info(f"✅ Azure Session Started (Langs: {self.candidate_languages})"))
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

    def _get_detected_language(self, result):
        """Extracts the language code detected by Azure from the result properties."""
        lang_detection_result = speechsdk.AutoDetectSourceLanguageResult(result)
        lang = lang_detection_result.language
        return lang if lang else "en-US"

    def on_recognizing(self, evt):
        if evt.result.text:
            detected_lang = self._get_detected_language(evt.result)
            asyncio.run_coroutine_threadsafe(
                self.callback_interim(evt.result.text, detected_lang), 
                self.loop
            )

    def on_recognized(self, evt):
        if evt.result.text:
            detected_lang = self._get_detected_language(evt.result)
            asyncio.run_coroutine_threadsafe(
                self.callback_final(evt.result.text, detected_lang), 
                self.loop
            )

    def on_canceled(self, evt):
        cancellation_details = evt.result.cancellation_details
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            logger.error(f"⚠️ Azure Canceled. Reason: {cancellation_details.reason}")
            logger.error(f"❌ Azure Error Details: {cancellation_details.error_details}")