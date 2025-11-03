from transformers import pipeline
import logging


def generate_text(user_id, language):
    try:
        generator = pipeline("text-generation", model="gpt2")
        prompt = f"Generate a short text for user {user_id} in {language} for language practice."
        result = generator(prompt, max_length=100, num_return_sequences=1)[0][
            "generated_text"
        ]
        return result, ""
    except Exception as e:
        logging.error(f"Text generation error: {str(e)}")
        return "", str(e)
