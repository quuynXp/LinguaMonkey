from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer
import logging
import torch

# Load model global để không phải load lại mỗi request (Tối ưu hiệu năng)
model_name = "facebook/m2m100_418M"
try:
    tokenizer = M2M100Tokenizer.from_pretrained(model_name)
    model = M2M100ForConditionalGeneration.from_pretrained(model_name)
    logging.info("Translation model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load model: {e}")
    model = None
    tokenizer = None

def translate_text(text, source_lang, target_lang):
    if not model or not tokenizer:
        return "", "Model not loaded"

    try:
        # Map ngôn ngữ (m2m100 dùng mã như 'en', 'vi', 'zh')
        # Đảm bảo khớp với enum LanguageCode ở Java
        tokenizer.src_lang = source_lang
        
        encoded_text = tokenizer(text, return_tensors="pt")
        
        # Generate
        generated_tokens = model.generate(
            **encoded_text, 
            forced_bos_token_id=tokenizer.get_lang_id(target_lang)
        )
        
        translated_text = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        return translated_text, ""
    except Exception as e:
        logging.error(f"Translation error: {str(e)}")
        return "", str(e)