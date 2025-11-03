# src/api/roadmap_generator.py
from transformers import pipeline
import logging

try:
    # Use a smaller, faster model for demonstration if gpt2 is slow
    generator = pipeline("text-generation", model="distilgpt2")
except Exception as e:
    logging.error(f"Failed to load roadmap generator model: {str(e)}")
    generator = None


def generate_roadmap(
    language: str, prompt: str, as_user_specific: bool, user_profile: dict | None = None
):
    """
    Generate a learning roadmap.
    Returns (roadmap_text, items, milestones, guidances, resources, totals, error)
    """
    if generator is None:
        return (
            "",
            [],
            [],
            [],
            [],
            {"totalItems": 0, "completedItems": 0, "estimatedCompletionTime": 0},
            "Model not loaded",
        )

    try:
        full_prompt = (
            f"Generate a detailed learning roadmap for {language}. Prompt: {prompt}"
        )
        if as_user_specific:
            full_prompt += " Tailored for user-specific needs."
            if user_profile and user_profile.get("recent_messages_summary"):
                full_prompt += (
                    f" User context: {user_profile.get('recent_messages_summary')}."
                )

        # Generate the main description text
        generated = generator(full_prompt, max_length=200)[0]["generated_text"]

        # --- Demo fake data that matches the Protobuf structure ---

        items = [
            {
                "item_id": "item_1",
                "title": "Basics: Alphabet & Pronunciation",
                "description": "Learn fundamentals",
                "order_index": 1,
                "estimated_time": 2,
                "type": "LESSON",
                "level": 1,
                "category": "PHONETICS",
                "difficulty": "easy",
                "exp_reward": 10,
                "content_id": "content_abc",
            },
            {
                "item_id": "item_2",
                "title": "Intermediate: Past Tense",
                "description": "Practice with projects",
                "order_index": 2,
                "estimated_time": 3,
                "type": "PRACTICE",
                "level": 2,
                "category": "GRAMMAR",
                "difficulty": "medium",
                "exp_reward": 20,
                "content_id": "content_past",
            },
        ]

        milestones = [
            {
                "milestone_id": "ms_1",
                "title": "Milestone 1: Finish Basics",
                "description": "Complete all Level 1 lessons",
                "order_index": 1,
                "level": 1,
                "requirements": ["item_1"],
                "rewards": ["+50 XP"],
            },
            {
                "milestone_id": "ms_2",
                "title": "Milestone 2: Build a Project",
                "description": "Use past tense in a short story",
                "order_index": 2,
                "level": 2,
                "requirements": ["item_2"],
                "rewards": ["+100 XP"],
            },
        ]

        guidances = [
            {
                "guidance_id": "guide_1",
                "item_id": "item_1",
                "stage": 1,
                "title": "Consistency is Key",
                "description": "Practice 15 minutes every day.",
                "tips": ["Use flashcards", "Listen to audio"],
                "estimated_time": 0,
                "order_index": 1,
            }
        ]

        resources = [
            {
                "resource_id": "res_1",
                "item_id": "item_1",
                "type": "BOOK",
                "title": "Book: {language} for Dummies",
                "description": "Reference book",
                "url": "https://example.com/book",
                "content_id": "",
                "duration": 0,
            },
            {
                "resource_id": "res_2",
                "item_id": "item_2",
                "type": "COURSE",
                "title": "Course: {language} Grammar",
                "description": "Online video course",
                "url": "https://example.com/course",
                "content_id": "",
                "duration": 120,
            },
        ]

        # Totals (as defined in the original file)
        total_items = len(items)
        completed_items = 0
        estimated_completion_time = sum(i.get("estimated_time", 1) for i in items)

        totals = {
            "totalItems": total_items,
            "completedItems": completed_items,
            "estimatedCompletionTime": estimated_completion_time,
        }

        return generated, items, milestones, guidances, resources, totals, None
    except Exception as e:
        logging.error(f"Roadmap generation failed: {str(e)}")
        return (
            "",
            [],
            [],
            [],
            [],
            {"totalItems": 0, "completedItems": 0, "estimatedCompletionTime": 0},
            str(e),
        )
