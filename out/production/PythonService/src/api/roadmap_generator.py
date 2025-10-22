from transformers import pipeline
import logging

try:
    generator = pipeline("text-generation", model="gpt2")
except Exception as e:
    logging.error(f"Failed to load roadmap generator model: {str(e)}")
    generator = None


def generate_roadmap(language: str, prompt: str, as_user_specific: bool):
    """
    Generate a learning roadmap.
    Returns (roadmap_text, items, milestones, guidances, resources, totals, error)
    """
    if generator is None:
        return "", [], [], [], [], {"totalItems": 0, "completedItems": 0, "estimatedCompletionTime": 0}, "Model not loaded"

    try:
        full_prompt = f"Generate a detailed learning roadmap for {language}. Prompt: {prompt}"
        if as_user_specific:
            full_prompt += " Tailored for user-specific needs."

        generated = generator(full_prompt, max_length=400)[0]["generated_text"]

        # Demo fake data
        items = [
            {"title": "Basics", "description": "Learn fundamentals", "order_index": 1, "estimated_time": 2},
            {"title": "Intermediate", "description": "Practice with projects", "order_index": 2, "estimated_time": 3},
        ]
        milestones = [
            {"title": "Milestone 1", "description": "Finish basics", "order_index": 1},
            {"title": "Milestone 2", "description": "Build a project", "order_index": 2},
        ]
        guidances = ["Stay consistent", "Review weekly"]
        resources = ["Book: X", "Course: Y"]

        total_items = len(items)
        completed_items = 0  # mới tạo roadmap thì mặc định 0
        # estimatedCompletionTime: cộng estimated_time của từng item
        estimated_completion_time = sum(i.get("estimated_time", 1) for i in items)

        totals = {
            "totalItems": total_items,
            "completedItems": completed_items,
            "estimatedCompletionTime": estimated_completion_time
        }

        return generated, items, milestones, guidances, resources, totals, None
    except Exception as e:
        logging.error(f"Roadmap generation failed: {str(e)}")
        return "", [], [], [], [], {"totalItems": 0, "completedItems": 0, "estimatedCompletionTime": 0}, str(e)
