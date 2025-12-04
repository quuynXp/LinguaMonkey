import json
import logging
from .chat_ai import chat_with_ai

async def decide_refund(transaction_id: str, user_id: str, course_id: str, reason_text: str):
    prompt = f"""
    You are an AI arbitrator for a Course Platform. Analyze this refund request.
    
    Context:
    - User ID: {user_id}
    - Course ID: {course_id}
    - Refund Reason: "{reason_text}"

    Policy:
    1. REJECT if the reason indicates USER ERROR or PREFERENCE. 
       Examples: "Bought by mistake", "Changed mind", "Don't like it anymore", "Too expensive", "Accidental purchase", "Forgot to cancel".
    2. APPROVE if the reason indicates PLATFORM/CREATOR FAULT.
       Examples: "Course is empty", "Video not playing", "Scam content", "Audio missing", "Content doesn't match description", "Duplicate charge".
    3. REVIEW if the reason is ambiguous, mixed, or requires human investigation.

    Task:
    - Detect the language of the reason automatically.
    - Classify the request based on the meaning, not just keywords.
    - Return a JSON object ONLY.

    Format:
    {{
        "decision": "APPROVE" | "REJECT" | "REVIEW",
        "confidence": 0.95,
        "explanation": "Brief explanation in English"
    }}
    """

    try:
        response_text, error = await chat_with_ai(prompt, [], "en")
        
        if error:
            logging.error(f"Gemini Refund Analysis Error: {error}")
            return "REVIEW", "AI_ERROR", 0.0, [str(error)], str(error)

        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        decision = data.get("decision", "REVIEW")
        explanation = data.get("explanation", "No explanation provided")
        confidence = float(data.get("confidence", 0.0))

        return decision, decision, confidence, [explanation], ""

    except Exception as e:
        logging.error(f"Refund Analysis Exception: {e}")
        return "REVIEW", "EXCEPTION", 0.0, [str(e)], str(e)