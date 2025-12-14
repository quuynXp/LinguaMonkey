# from transformers import CLIPProcessor, CLIPModel
# from PIL import Image
# import io
# import logging


# def analyze_image_with_text(text, image_data):
#     try:
#         model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
#         processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
#         image = Image.open(io.BytesIO(image_data))
#         inputs = processor(text=[text], images=image, return_tensors="pt", padding=True)
#         outputs = model(**inputs)
#         similarity = outputs.logits_per_image.softmax(dim=1)[0][0].item()
#         feedback = f"Text matches image with similarity: {similarity:.2f}"
#         return feedback, similarity, ""
#     except Exception as e:
#         logging.error(f"Image-text analysis error: {str(e)}")
#         return "", 0.0, str(e)
