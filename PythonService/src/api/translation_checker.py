from transformers import pipeline
from sentence_transformers import SentenceTransformer, util
import logging

def check_translation(reference_text, translated_text, target_language):
    try:
        # Translate reference text to target language for comparison
        translator = pipeline("translation", model="facebook/m2m100_418M")
        lang_map = {"en": "en", "vi": "vi", "fr": "fr", "es": "es"}
        target = lang_map.get(target_language, "vi")
        expected_translation = translator(reference_text, src_lang="en", tgt_lang=target)[0]["translation_text"]

        # Use sentence embeddings to compare similarity
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode([expected_translation, translated_text])
        similarity = util.cos_sim(embeddings[0], embeddings[1])[0][0].item()

        feedback = f"Translation similarity: {similarity:.2f}. Expected: {expected_translation}"
        score = similarity * 100  # Scale to 0-100
        return feedback, score, ""
    except Exception as e:
        logging.error(f"Translation check error: {str(e)}")
        return "", 0.0, str(e)