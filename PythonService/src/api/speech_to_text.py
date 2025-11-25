import logging
import torch
import numpy as np
from transformers import pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model loading
MODEL_NAME = "openai/whisper-tiny"  # 'tiny' is fastest for realtime CPU inference. Use 'base' for better accuracy.
device = "cuda" if torch.cuda.is_available() else "cpu"

try:
    # Initialize pipeline once
    transcriber = pipeline(
        "automatic-speech-recognition", 
        model=MODEL_NAME, 
        device=device,
        chunk_length_s=30
    )
    logger.info(f"Speech-to-Text model ({MODEL_NAME}) loaded on {device}")
except Exception as e:
    logger.error(f"Failed to load STT model: {e}")
    transcriber = None

def speech_to_text(audio_bytes: bytes, language_code: str = "en") -> tuple[str, str]:
    """
    Converts raw PCM 16-bit 16kHz mono audio bytes to text.
    """
    if not transcriber:
        return "", "STT Model not loaded"

    if not audio_bytes or len(audio_bytes) < 100:
        return "", ""

    try:
        # Convert raw PCM 16-bit bytes to float32 numpy array
        # React Native 'react-native-live-audio-stream' sends 16-bit PCM
        audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        # Run inference
        # generate_kwargs forces the language if provided, otherwise auto-detects
        # whisper uses language tokens like '<|en|>', '<|vi|>' etc.
        
        result = transcriber(
            audio_array, 
            generate_kwargs={"language": language_code} if language_code and language_code != "auto" else None
        )
        
        text = result.get("text", "").strip()
        return text, ""

    except Exception as e:
        logger.error(f"STT Error: {str(e)}")
        return "", str(e)