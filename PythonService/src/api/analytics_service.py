import json
import logging
from .chat_ai import chat_with_ai

async def analyze_course_quality(course_id: str, lesson_ids: list[str]) -> tuple[float, list[str], str, str]:
    """
    Analyzes the quality of a course based on its structure and content metadata.
    This is a simplified AI-based check for production readiness.
    
    Returns:
        tuple[float, list[str], str, str]: (quality_score, warnings, verdict, error)
    """
    logging.info(f"Analyzing quality for course {course_id} with {len(lesson_ids)} lessons.")
    
    # In a real scenario, lesson metadata would be fetched from a database or a storage service.
    # For a full file, we'll use a placeholder structure and prompt the AI.
    
    # Simulate fetching simple metadata
    lesson_metadata_sample = [
        {"id": f"L{i}", "title": f"Lesson {i} Title", "duration_minutes": 5 + (i % 10)} 
        for i in range(1, 4)
    ]
    total_duration = sum(l["duration_minutes"] for l in lesson_metadata_sample)
    
    prompt = f"""
    You are an AI quality assurance specialist for an educational platform. Analyze the following course structure and give a quality assessment.

    Course ID: {course_id}
    Total Lessons (Simulated): {len(lesson_ids)} (Actual content is only provided for first 3)
    Simulated Lesson Structure Sample: {lesson_metadata_sample}
    Total Duration (Simulated): {total_duration} minutes

    Policy:
    1. Score: 0.0 to 100.0. Higher is better.
    2. Warnings: List of issues found (e.g., "Too short", "Uneven lesson length", "Missing description").
    3. Verdict: "PASS" (Score > 70) | "FAIL" (Score <= 70).
    4. Language: Return a JSON object ONLY.

    Format:
    {{
        "score": 85.5,
        "warnings": ["Lesson 1 is too short (5 min) for a complex topic."],
        "verdict": "PASS"
    }}
    """
    
    try:
        response_text, error = await chat_with_ai(prompt, [], "en")
        
        if error:
            logging.error(f"Gemini Quality Analysis Error: {error}")
            return 0.0, ["AI_ERROR"], "REVIEW", str(error)

        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)

        score = float(data.get("score", 0.0))
        warnings = data.get("warnings", [])
        verdict = data.get("verdict", "REVIEW")
        
        return score, warnings, verdict, ""

    except Exception as e:
        logging.error(f"Course Quality Analysis Exception: {e}")
        return 0.0, ["EXCEPTION"], "REVIEW", str(e)


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