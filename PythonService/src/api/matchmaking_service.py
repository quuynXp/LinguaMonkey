import logging
import json
import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content

MATCHMAKING_MODEL = "gemini-2.5-flash"

async def match_users_with_gemini(current_user_id, current_prefs, candidates):
    """
    Dùng Gemini để so khớp current_user với danh sách candidates.
    """
    if not candidates:
        return None, "No candidates available"

    user_profile = {
        "id": current_user_id,
        "native": current_prefs.native_language,
        "learning": current_prefs.learning_language,
        "interests": list(current_prefs.interests),
        "age_group": current_prefs.age_range,
        "gender": current_prefs.gender
    }

    candidates_list = []
    for cand in candidates:
        if cand.user_id == current_user_id:
            continue
            
        candidates_list.append({
            "id": cand.user_id,
            "native": cand.preferences.native_language,
            "learning": cand.preferences.learning_language,
            "interests": list(cand.preferences.interests),
            "age_group": cand.preferences.age_range,
            "gender": cand.preferences.gender
        })

    if not candidates_list:
        return None, "No valid candidates after filtering"

    prompt = f"""
    Role: You are an expert Matchmaker for a language exchange app.
    
    Task: Find the best match for "Current User" from the "Candidates" list.
    
    Matching Rules:
    1. Language: Ideally, one's native is the other's learning (complementary).
    2. Interests: More overlapping interests = higher score.
    3. Score: Calculate a compatibility score (0-100).
    4. Threshold: If the best score is below 60, return null.
    
    Data:
    Current User: {json.dumps(user_profile)}
    Candidates: {json.dumps(candidates_list)}
    
    Output Format (JSON only, no markdown):
    {{
        "best_match_id": "string_uuid_or_null",
        "score": integer,
        "reason": "short explanation"
    }}
    """

    try:
        model = genai.GenerativeModel(MATCHMAKING_MODEL)
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_text = response.text.strip()
        logging.info(f"AI Match Result: {result_text}")
        
        match_result = json.loads(result_text)
        
        if match_result.get("best_match_id"):
            return match_result, None
        else:
            return None, "No suitable match found by AI"

    except Exception as e:
        logging.error(f"Gemini Matchmaking Error: {str(e)}")
        return None, str(e)