# import logging
# import torch
# import numpy as np
# from transformers import pipeline

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# MODEL_NAME = "openai/whisper-tiny"
# # Detect device - important for Torch
# device = "cuda" if torch.cuda.is_available() else "cpu"
# transcriber = None

# try:
#     transcriber = pipeline(
#         "automatic-speech-recognition", 
#         model=MODEL_NAME, 
#         device=device,
#         chunk_length_s=30
#     )
#     logger.info(f"STT Model ({MODEL_NAME}) loaded on {device}")
# except Exception as e:
#     logger.error(f"Failed to load STT model: {e}")

# def speech_to_text(audio_bytes: bytes, language_code: str = "auto") -> tuple[str, str, str]:
#     if not transcriber:
#         return "", "en", "STT Model not loaded"

#     if not audio_bytes or len(audio_bytes) < 100:
#         return "", "en", ""

#     try:
#         # Uses numpy, soundfile is implicit backend for transformers
#         audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
#         gen_kwargs = {}
#         if language_code and language_code != "auto":
#             gen_kwargs["language"] = language_code
        
#         result = transcriber(audio_array, generate_kwargs=gen_kwargs)
#         text = result.get("text", "").strip()

#         detected_lang = language_code if language_code != "auto" else "vi" 
        
#         return text, detected_lang, ""

#     except Exception as e:
#         logger.error(f"STT Error: {e}")
#         return "", "en", str(e)