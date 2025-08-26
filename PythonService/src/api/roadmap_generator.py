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
    Returns (roadmap_text, items, milestones, guidances, resources, error)
    """
    if generator is None:
        return "", [], [], [], [], "Model not loaded"

    try:
        full_prompt = f"Generate a detailed learning roadmap for {language}. Prompt: {prompt}"
        if as_user_specific:
            full_prompt += " Tailored for user-specific needs."

        generated = generator(full_prompt, max_length=400)[0]["generated_text"]

        # Demo: hardcode items & milestones (thực tế nên parse structured JSON)
        items = [
            {"title": "Basics", "description": "Learn fundamentals", "order_index": 1},
            {"title": "Intermediate", "description": "Practice with projects", "order_index": 2},
        ]
        milestones = [
            {"title": "Milestone 1", "description": "Finish basics", "order_index": 1},
            {"title": "Milestone 2", "description": "Build a project", "order_index": 2},
        ]
        guidances = ["Stay consistent", "Review weekly"]
        resources = ["Book: X", "Course: Y"]

        return generated, items, milestones, guidances, resources, None
    except Exception as e:
        logging.error(f"Roadmap generation failed: {str(e)}")
        return "", [], [], [], [], str(e)
