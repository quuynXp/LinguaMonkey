# src/api/passage_generator.py
from transformers import pipeline
import logging

try:
    generator = pipeline("text-generation", model="distilgpt2")
except Exception as e:
    logging.error(f"Failed to load passage generator model: {str(e)}")
    generator = None


def generate_passage(user_id, language, topic, user_profile: dict | None = None):
    if generator is None:
        return "", "Model not loaded"

    try:
        prompt = f"Generate an educational passage for user {user_id} in {language} about {topic or 'language learning'}."
        if user_profile and user_profile.get("recent_messages_summary"):
            prompt += f" Personalize this: the user recently discussed {user_profile.get('recent_messages_summary')}."

        result = generator(prompt, max_length=200, num_return_sequences=1)[0][
            "generated_text"
        ]
        return result, ""
    except Exception as e:
        logging.error(f"Passage generation error: {str(e)}")
        return "", str(e)
