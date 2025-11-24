# file: PythonService/src/api/translation.py

from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer

import logging

import torch

from langdetect import detect, LangDetectException # <-- Import thư viện phát hiện ngôn ngữ

logging.basicConfig(level=logging.INFO) 
logger = logging.getLogger(__name__)

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
    
    # DEBUG 1: Log target_lang nhận được từ Frontend
    logger.info(f"[Translate] Attempting translation to target_lang: {target_lang}")

    # Kiểm tra xem target_lang có được M2M100 hỗ trợ không
    if target_lang not in tokenizer.lang_code_to_id:
        # Nếu không hỗ trợ, đây là nguyên nhân có thể gây ra lỗi dịch
        logger.error(f"[Translate Error] Target language '{target_lang}' is NOT supported by M2M100 tokenizer.")
        return text, f"Target language '{target_lang}' not supported by model."
    
    
    actual_source_lang = source_lang
        
    if source_lang == 'auto':
        try:
            # 1. Phát hiện ngôn ngữ thực tế
            detected_lang = detect(text)
            
            # 2. Kiểm tra nếu M2M100 hỗ trợ ngôn ngữ này
            if detected_lang in tokenizer.lang_code_to_id:
                actual_source_lang = detected_lang
            else:
                # M2M100 không hỗ trợ ngôn ngữ phát hiện được, fallback về tiếng Anh
                logger.warning(f"[Translate Warning] Detected source language '{detected_lang}' not supported by M2M100. Falling back to 'en'.")
                actual_source_lang = 'en'
            
        except LangDetectException as e:
            logger.error(f"[Translate Error] Language detection failed for text: {e}")
            # Fallback cứng về English nếu detect lỗi
            actual_source_lang = 'en'
            
        except Exception as e:
            logger.error(f"[Translate Error] Error during 'auto' source handling: {e}")
            return "", "Auto source handling error"

    # DEBUG 2: Log final source_lang và target_lang trước khi gọi model
    logger.info(f"[Translate Info] Final Source: {actual_source_lang}, Final Target: {target_lang}")

    try:
        # Gán ngôn ngữ nguồn thực tế (hoặc đã được phát hiện/fallback)
        tokenizer.src_lang = actual_source_lang
        
        # Lấy ID ngôn ngữ đích
        forced_bos_token_id = tokenizer.get_lang_id(target_lang)
        logger.info(f"[Translate Debug] Target language ID (forced_bos_token_id): {forced_bos_token_id}")

        encoded_text = tokenizer(text, return_tensors="pt")
        
        # Generate
        generated_tokens = model.generate(
            **encoded_text, 
            forced_bos_token_id=forced_bos_token_id
        )
        
        translated_text = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        
        # DEBUG 3: Log kết quả dịch cuối cùng
        logger.info(f"[Translate Result] Translation successful. Output: '{translated_text[:50]}...'")

        return translated_text, ""

    except Exception as e:
        logger.error(f"[Translate Critical Error] Model generation failed: {str(e)}")
        return "", str(e)