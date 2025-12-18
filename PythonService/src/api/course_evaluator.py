import google.generativeai as genai
import logging
import json
import os
from .chat_ai import chat_with_ai

async def evaluate_course_structure(title: str, description: str, lessons: list) -> tuple[float, str, str]:
    """
    Evaluates a course version using Gemini.
    Returns: (rating, review_comment, error)
    """
    
    lesson_summary = "\n".join([
        f"- {l.lesson_title} (Type: {l.lesson_type}, Duration: {l.duration_seconds}s)" 
        for l in lessons
    ])

    prompt = f"""
    You are 'Sensei AI', a strict but fair administrator for an online language learning platform.
    Your job is to review a new course version before it is fully promoted.

    Course Title: "{title}"
    Course Description: "{description}"
    
    Lesson Structure:
    {lesson_summary}

    Task:
    1. Analyze if the lessons listed actually match the promise of the title and description.
    2. Check for 'thin content' (e.g., very few lessons for a broad title).
    3. Assign a Rating from 1.0 to 5.0 (decimals allowed).
    4. Write a concise, constructive review (2-3 sentences) addressing the creator.

    Output Format (JSON only):
    {{
        "rating": 4.5,
        "comment": "The course structure looks solid..."
    }}
    """

    try:
        response_text, error = await chat_with_ai(prompt, [], "en")
        
        if error:
            return 0.0, "", error

        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        
        rating = float(data.get("rating", 3.0))
        comment = data.get("comment", "Review completed by system.")
        
        return rating, comment, ""

    except Exception as e:
        logging.error(f"Error in evaluate_course_structure: {e}")
        return 0.0, "", f"AI Analysis failed: {str(e)}"