import soundfile as sf
import io
import librosa
import logging
from transformers import pipeline


def speech_to_text(audio_data, language):
    try:
        audio, sample_rate = sf.read(io.BytesIO(audio_data))
        if sample_rate != 16000:  # Whisper requires 16kHz
            audio = librosa.resample(audio, orig_sr=sample_rate, target_sr=16000)
        asr = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
        result = asr(audio, generate_kwargs={"language": language})
        return result["text"], ""
    except Exception as e:
        logging.error(f"Speech-to-text error: {str(e)}")
        return "", str(e)
