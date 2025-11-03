# src/api/quiz_generator.py
import logging
import json
from src.api.chat_ai import chat_with_ai


async def generate_quiz(
    user_id: str,
    num_questions: int,
    mode: str,
    topic: str | None,
    user_profile: dict | None = None,
):
    """
    Generates a language quiz using Gemini, formatted as JSON.
    """

    # 1. Define the JSON schema we want Gemini to return
    json_schema = """
    [
      {
        "id": "q1",
        "question_text": "What is the past tense of 'go'?",
        "options": ["go", "goed", "went", "gone"],
        "correct_answer_index": 2,
        "explanation": "'went' is the irregular past tense of 'go'.",
        "difficulty": "easy",
        "skill_type": "grammar",
        "points": 10
      }
    ]
    """

    # 2. Create a detailed prompt
    prompt = f"Generate a language quiz with exactly {num_questions} questions."
    if topic:
        prompt += f" The quiz topic should be: {topic}."
    else:
        prompt += " The quiz should cover general {language} skills (grammar, vocab, phonetics)."

    if mode == "team":
        prompt += " This is a team battle quiz, so make questions fun and competitive."
    else:
        prompt += " This is a solo quiz for practice."

    if user_profile and user_profile.get("recent_messages_summary"):
        prompt += f"\n\nPERSONALIZATION: The user recently discussed: '{user_profile.get('recent_messages_summary')}'. Try to include 1-2 questions related to this context if possible."

    prompt += f"\n\nIMPORTANT: Respond *ONLY* with a valid JSON array matching this exact schema. Do not include any other text, markdown, or explanations outside of the JSON structure. \nSchema Example: {json_schema}"

    try:
        # 3. Call Gemini (using chat_with_ai with an empty history)
        # We pass the user_profile to chat_with_ai, which adds it to system_instruction
        response_text, error = await chat_with_ai(
            message=prompt, history=[], language="en", user_profile=user_profile
        )

        if error:
            return [], error

        # 4. Parse the JSON response
        # Clean up potential markdown formatting (```json ... ```)
        if response_text.strip().startswith("```json"):
            response_text = response_text.strip()[7:-3].strip()

        questions_list = json.loads(response_text)

        if not isinstance(questions_list, list) or len(questions_list) != num_questions:
            logging.warning(
                f"Gemini returned invalid JSON or wrong number of questions. Got: {questions_list}"
            )
            return (
                [],
                f"AI failed to generate valid quiz format. (Count: {len(questions_list)})",
            )

        return questions_list, ""

    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON from Gemini: {response_text}")
        return [], "AI returned invalid JSON."
    except Exception as e:
        logging.error(f"Quiz generation error: {str(e)}")
        return [], str(e)
