from transformers import pipeline
import logging

def generate_passage(user_id, language):
    try:
        generator = pipeline("text-generation", model="gpt2")
        prompt = f"Generate an educational passage for user {user_id} in {language} about language learning."
        result = generator(prompt, max_length=200, num_return_sequences=1)[0]["generated_text"]
        return result, ""
    except Exception as e:
        logging.error(f"Passage generation error: {str(e)}")
        return "", str(e)