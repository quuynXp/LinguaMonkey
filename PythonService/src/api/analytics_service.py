# src/api/analytics_service.py
import logging


def analyze_course_quality(course_id: str, lesson_ids: list[str]):
    """
    Mock analysis of course quality.
    In reality, this might run NLP on reviews or check lesson completion rates.
    """
    logging.info(
        f"Analyzing quality for course {course_id} "
        f"(lessons: {len(lesson_ids)})"
    )

    score = 0.85
    warnings = []
    verdict = "pass"

    if len(lesson_ids) < 5:
        warnings.append("Course has very few lessons.")
        verdict = "review_needed"
        score = 0.6

    return score, warnings, verdict, ""


def decide_refund(transaction_id: str, user_id: str, course_id: str,
                  reason_text: str):
    """
    Mock refund decision.
    In reality, this might use a classification model on 'reason_text'
    and check user's activity (e.g., 'time_spent_in_course').
    """
    logging.info(
        f"Deciding refund for tx {transaction_id} "
        f"(User: {user_id}, Course: {course_id})"
    )

    decision = "approve"
    label = "policy_violation"  # (e.g., 'user_unsatisfied', 'technical_issue')
    confidence = 0.92
    explanations = [
        (
            "Mock: User reason text 'I didn't like it' "
            "matches 'user_unsatisfied' policy."
        )
    ]

    if "technical issue" in reason_text.lower():
        label = "technical_issue"
        explanations = ["Mock: User mentioned technical issues."]

    return decision, label, confidence, explanations, ""
