from transformers import pipeline
import logging

def chat_with_ai(message, history, language):
    try:
        chat = pipeline("conversational", model="facebook/blenderbot-400M-distill")
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
        input_text = f"{history_text}\nUser: {message}" if history else f"User: {message}"
        response = chat(input_text)[0]["generated_text"]
        return response, ""
    except Exception as e:
        logging.error(f"Chat AI error: {str(e)}")
        return "", str(e)