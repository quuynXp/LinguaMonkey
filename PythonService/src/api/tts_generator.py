import os
import logging
import hashlib
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()
logger = logging.getLogger(__name__)

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")

LANGUAGE_VOICE_MAP = {
    "en": "en-US-JennyNeural",
    "vi": "vi-VN-HoaiMyNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
}

speech_config = None
if AZURE_SPEECH_KEY and AZURE_SPEECH_REGION:
    try:
        speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm
        )
    except Exception as e:
        logger.error(f"Azure Speech Config Error: {e}")
else:
    logger.warning("Missing Azure Speech Credentials.")

def _get_cache_key(text: str, voice_name: str) -> str:
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    return f"tts:{voice_name}:{text_hash}"

async def generate_tts(text: str, language: str, redis: Redis = None) -> tuple[bytes, str]:
    if not speech_config:
        return b"", "TTS service not configured."

    voice_name = LANGUAGE_VOICE_MAP.get(language, LANGUAGE_VOICE_MAP.get("en"))
    
    if redis:
        try:
            cache_key = _get_cache_key(text, voice_name)
            cached_audio = await redis.get(cache_key)
            if cached_audio:
                logger.info(f"[TTS CACHE HIT] Served audio for '{text[:15]}...' from Redis")
                return cached_audio, ""
        except Exception as e:
            logger.warning(f"Redis TTS Cache check failed: {e}")

    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{language}">
        <voice name="{voice_name}">
            {text}
        </voice>
    </speak>
    """

    try:
        speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        
        result = speech_synthesizer.speak_ssml_async(ssml).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_data = result.audio_data
            
            if redis and audio_data:
                try:
                    await redis.set(cache_key, audio_data, ex=86400)
                except Exception as e:
                    logger.error(f"Failed to cache TTS audio: {e}")

            return audio_data, ""
            
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            return b"", f"TTS Canceled: {cancellation.reason}. Error: {cancellation.error_details}"
            
        return b"", f"TTS Unknown Error: {result.reason}"

    except Exception as e:
        logger.error(f"TTS Critical Error: {str(e)}", exc_info=True)
        return b"", str(e)