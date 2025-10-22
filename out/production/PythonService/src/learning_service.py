import os
from dotenv import load_dotenv
import grpc
from concurrent import futures
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import learning_service_pb2
import learning_service_pb2_grpc
from src.api.speech_to_text import speech_to_text
from src.api.chat_ai import chat_with_ai
from src.api.spelling_checker import check_spelling
from src.api.pronunciation_checker import check_pronunciation
from src.api.image_text_analyzer import analyze_image_with_text
from src.api.passage_generator import generate_passage
from src.api.image_generator import generate_image
from src.api.text_generator import generate_text
from src.api.roadmap_generator import generate_roadmap
from src.api.translation_checker import check_translation
load_dotenv()

class LearningService(learning_service_pb2_grpc.LearningServiceServicer):
    def __init__(self):
        # Load RSA public key
        try:
            with open("public_key.pem", "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(),
                    backend=default_backend()
                )
        except Exception as e:
            logging.error(f"Failed to load public key: {str(e)}")
            raise

    def _verify_token(self, context):
        try:
            metadata = dict(context.invocation_metadata())
            auth = metadata.get('authorization', '')
            if not auth.startswith('Bearer '):
                return False, "Missing or invalid Authorization header"

            token = auth[7:]
            decoded = jwt.decode(
                token,
                self.public_key,
                algorithms=["RS256"],
                issuer="LinguaMonkey.com",
                options={"verify_exp": True}
            )
            return True, decoded
        except jwt.ExpiredSignatureError:
            return False, "Token expired"
        except jwt.InvalidTokenError as e:
            return False, f"Invalid token: {str(e)}"

    def SpeechToText(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.SpeechResponse()

        text, error = speech_to_text(request.audio_data, request.language)
        return learning_service_pb2.SpeechResponse(text=text, error=error)

    def ChatWithAI(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.ChatResponse()

        response, error = chat_with_ai(request.message, request.history, request.language)
        return learning_service_pb2.ChatResponse(response=response, error=error)

    def CheckSpelling(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.SpellingResponse()

        corrections, error = check_spelling(request.text, request.language)
        return learning_service_pb2.SpellingResponse(corrections=corrections, error=error)

    def CheckPronunciation(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.PronunciationResponse()

        feedback, score, error = check_pronunciation(request.audio_data, request.language)
        return learning_service_pb2.PronunciationResponse(
            feedback=feedback, score=score, error=error
        )

    def CheckWritingWithImage(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.WritingImageResponse()

        feedback, score, error = analyze_image_with_text(request.text, request.image_data)
        return learning_service_pb2.WritingImageResponse(
            feedback=feedback, score=score, error=error
        )

    def GeneratePassage(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.GeneratePassageResponse()

        passage, error = generate_passage(request.user_id, request.language)
        return learning_service_pb2.GeneratePassageResponse(passage=passage, error=error)

    def GenerateImage(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.GenerateImageResponse()

        image_data, error = generate_image(request.user_id, request.language)
        return learning_service_pb2.GenerateImageResponse(image_data=image_data, error=error)

    def GenerateText(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.GenerateTextResponse()

        text, error = generate_text(request.user_id, request.language)
        return learning_service_pb2.GenerateTextResponse(text=text, error=error)

    def CreateOrUpdateRoadmapDetailed(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.CreateOrUpdateRoadmapResponse()

        roadmap_text, items, milestones, guidances, resources, error = generate_roadmap(
            request.language, request.prompt, request.as_user_specific
        )

        if error:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(error)
            return learning_service_pb2.CreateOrUpdateRoadmapResponse()

        return learning_service_pb2.CreateOrUpdateRoadmapResponse(
            roadmap_id=request.roadmap_id if request.roadmap_id else "new-id",
            title=request.title or "Generated Roadmap",
            description=roadmap_text,
            language=request.language,
            items=[
                learning_service_pb2.RoadmapItemProto(
                    title=i["title"], description=i["description"], order_index=i["order_index"]
                ) for i in items
            ],
            milestones=[
                learning_service_pb2.MilestoneProto(
                    title=m["title"], description=m["description"], order_index=m["order_index"]
                ) for m in milestones
            ],
            guidances=guidances,
            resources=resources
        )


    def CheckTranslation(self, request, context):
        is_valid, result = self._verify_token(context)
        if not is_valid:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(result)
            return learning_service_pb2.CheckTranslationResponse()

        feedback, score, error = check_translation(request.reference_text, request.translated_text, request.target_language)
        return learning_service_pb2.CheckTranslationResponse(feedback=feedback, score=score, error=error)



def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    learning_service_pb2_grpc.add_LearningServiceServicer_to_server(LearningService(), server)
    server.add_insecure_port('[::]:50051')
    logging.info("Server starting on port 50051...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()