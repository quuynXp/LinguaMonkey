from transformers import pipeline
import logging


def translate_text(text, source_lang, target_lang):
    try:
        translator = pipeline("translation", model="facebook/m2m100_418M")
        lang_map = {"en": "en", "vi": "vi", "fr": "fr", "es": "es"}
        source = lang_map.get(source_lang, "en")
        target = lang_map.get(target_lang, "vi")

        result = translator(text, src_lang=source, tgt_lang=target)
        translated_text = result[0]["translation_text"]
        return translated_text, ""
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        return "", str(e)
