# learning_service.py
import os
import grpc.aio
from concurrent import futures
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import asyncio
from dotenv import load_dotenv

# Import protobuf definitions
import learning_pb2
import learning_pb2_grpc

# Import core services (DB, Cache, Auth)
from src.core.session import AsyncSessionLocal
from src.core.cache import get_redis_client, close_redis_client
from src.core.user_profile_service import get_user_profile
from src.core.kafka_consumer import consume_user_updates

# Import AI/API functions
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
from src.api.translation import translate_text
from src.api.tts_generator import generate_tts
from src.api.quiz_generator import generate_quiz
from src.api.analytics_service import analyze_course_quality, decide_refund


load_dotenv()


class LearningService(learning_pb2_grpc.LearningServiceServicer):
    def __init__(self):
        # Load RSA public key
        try:
            with open("public_key.pem", "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(), backend=default_backend()
                )
        except Exception as e:
            logging.error(f"Failed to load public key: {str(e)}")
            raise

        # Initialize Redis client
        self.redis_client = get_redis_client()

    def _verify_token(self, context):
        """Synchronous token verification."""
        try:
            metadata = dict(context.invocation_metadata())
            auth = metadata.get("authorization", "")
            if not auth.startswith("Bearer "):
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Missing or invalid Authorization header")
                return None

            token = auth[7:]
            decoded = jwt.decode(
                token,
                self.public_key,
                algorithms=["RS256"],
                issuer="LinguaMonkey.com",
                options={"verify_exp": True},
            )
            return decoded
        except jwt.ExpiredSignatureError:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            context.set_details(f"Invalid token: {str(e)}")
            return None

    # --- Helper to get session and profile ---
    async def _get_profile_from_db(self, user_id: str):
        """Fetches user profile using cache and DB."""
        if not user_id:
            return None
        async with AsyncSessionLocal() as db_session:
            return await get_user_profile(user_id, db_session, self.redis_client)

    # --- Speech & Audio ---
    async def SpeechToText(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.SpeechResponse()

        audio_data = (
            request.audio.inline_data if request.audio.inline_data else b""
        )  # Add logic for URL if needed
        text, error = speech_to_text(audio_data, request.language)
        return learning_pb2.SpeechResponse(text=text, error=error)

    async def GenerateTts(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.TtsResponse()

        audio_data, error = generate_tts(request.text, request.language)
        return learning_pb2.TtsResponse(audio_data=audio_data, error=error)

    async def CheckPronunciation(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.PronunciationResponse()

        audio_data = request.audio.inline_data if request.audio.inline_data else b""
        feedback, score, error = check_pronunciation(audio_data, request.language)
        # Mock data for other fields
        ipa = "/mɒk/"
        suggestion = "Try to stress the first syllable."
        return learning_pb2.PronunciationResponse(
            feedback=feedback, score=score, error=error, ipa=ipa, suggestion=suggestion
        )

    async def StreamPronunciation(self, request_iterator, context):
        if not self._verify_token(context):
            return

        # Mock implementation: accumulate chunks and process at the end
        full_audio_chunks = []
        try:
            async for chunk in request_iterator:
                full_audio_chunks.append(chunk.audio_chunk)
                if chunk.is_final:
                    break

            final_audio = b"".join(full_audio_chunks)
            feedback, score, error = check_pronunciation(
                final_audio, "en"
            )  # Assume 'en'

            if error:
                yield learning_pb2.PronunciationChunkResponse(
                    is_final=True, feedback=f"Error: {error}"
                )
            else:
                yield learning_pb2.PronunciationChunkResponse(
                    score=score, feedback=feedback, is_final=True
                )
        except Exception as e:
            logging.error(f"StreamPronunciation error: {e}")
            yield learning_pb2.PronunciationChunkResponse(
                is_final=True, feedback=f"Internal server error: {e}"
            )

    # --- Text-based ---
    async def CheckSpelling(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.SpellingResponse()

        corrections, error = check_spelling(request.text, request.language)
        return learning_pb2.SpellingResponse(corrections=corrections, error=error)

    async def CheckTranslation(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.CheckTranslationResponse()

        feedback, score, error = check_translation(
            request.reference_text, request.translated_text, request.target_language
        )
        return learning_pb2.CheckTranslationResponse(
            feedback=feedback, score=score, error=error
        )

    async def CheckWritingWithImage(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.WritingImageResponse()

        image_data = request.image.inline_data if request.image.inline_data else b""
        feedback, score, error = analyze_image_with_text(request.text, image_data)
        return learning_pb2.WritingImageResponse(
            feedback=feedback, score=score, error=error
        )

    async def ChatWithAI(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.ChatResponse()

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)
        history_list = [{"role": m.role, "content": m.content} for m in request.history]

        response, error = await chat_with_ai(
            request.message,
            history_list,
            "en",  # Language param, Gemini auto-detects but we pass it
            user_profile,
        )
        return learning_pb2.ChatResponse(response=response, error=error)

    async def Translate(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.TranslateResponse()

        translated_text, error = translate_text(
            request.text, request.source_language, request.target_language
        )
        # Mock other fields
        detected_lang = request.source_language or "en"
        confidence = 0.95

        return learning_pb2.TranslateResponse(
            translated_text=translated_text,
            source_language_detected=detected_lang,
            confidence=confidence,
            error=error,
        )

    # --- Content Generation ---
    async def GenerateImage(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GenerateImageResponse()

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)

        image_data, error = generate_image(
            user_id, request.prompt, request.language, user_profile
        )
        # Mock response as URL
        return learning_pb2.GenerateImageResponse(
            image_urls=["https://example.com/mock_image.png"],
            model_used="mock_model",
            error=error,
        )

    async def GenerateText(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GenerateTextResponse()

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)

        text, error = generate_text(
            user_id, request.prompt, request.language, user_profile
        )
        return learning_pb2.GenerateTextResponse(text=text, error=error)

    async def GeneratePassage(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GeneratePassageResponse()

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)

        passage, error = generate_passage(
            user_id, request.language, request.topic, user_profile
        )
        return learning_pb2.GeneratePassageResponse(
            passage=passage, difficulty="medium", error=error
        )

    # --- Personalized Learning ---
    async def CreateOrUpdateRoadmap(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.RoadmapResponse()

        # This RPC seems to be for creating the high-level roadmap entry.
        # Logic to save/update this in the DB would go here.

        new_id = request.roadmap_id or "new_roadmap_" + os.urandom(4).hex()

        return learning_pb2.RoadmapResponse(
            roadmap_id=new_id,
            title=request.title,
            description=request.description,
            language=request.language,
        )

    async def CreateOrUpdateRoadmapDetailed(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.RoadmapDetailedResponse(error="Unauthenticated")

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)

        generated_text, items, milestones, guidances, resources, totals, error = (
            generate_roadmap(
                request.language, request.prompt, request.as_user_specific, user_profile
            )
        )

        if error:
            return learning_pb2.RoadmapDetailedResponse(error=error)

        # Map dictionaries to Protobuf messages
        items_proto = [learning_pb2.RoadmapItemProto(**i) for i in items]
        resources_proto = [learning_pb2.RoadmapResourceProto(**r) for r in resources]
        guidances_proto = [learning_pb2.RoadmapGuidanceProto(**g) for g in guidances]
        milestones_proto = [learning_pb2.RoadmapMilestoneProto(**m) for m in milestones]

        return learning_pb2.RoadmapDetailedResponse(
            roadmap_id=request.roadmap_id or "new-detail-id",
            title="Generated Detailed Roadmap",
            description=generated_text,
            language=request.language,
            items=items_proto,
            resources=resources_proto,
            guidances=guidances_proto,
            milestones=milestones_proto,
        )

    async def GenerateLanguageQuiz(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.QuizGenerationResponse(error="Unauthenticated")

        user_id = request.user_id or claims.get("sub")
        user_profile = await self._get_profile_from_db(user_id)

        questions_list, error = await generate_quiz(
            user_id, request.num_questions, request.mode, request.topic, user_profile
        )

        if error:
            return learning_pb2.QuizGenerationResponse(error=error)

        # Map list of dicts to proto
        questions_proto = [learning_pb2.QuizQuestionProto(**q) for q in questions_list]

        return learning_pb2.QuizGenerationResponse(
            quiz_id="quiz_" + os.urandom(4).hex(), questions=questions_proto
        )

    # --- System-level / analytics ---
    async def AnalyzeCourseQuality(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.CourseQualityResponse()

        score, warnings, verdict, error = analyze_course_quality(
            request.course_id, request.lesson_ids
        )
        return learning_pb2.CourseQualityResponse(
            quality_score=score, warnings=warnings, verdict=verdict, error=error
        )

    async def RefundDecision(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.RefundDecisionResponse()

        decision, label, confidence, explanations, error = decide_refund(
            request.transaction_id,
            request.user_id,
            request.course_id,
            request.reason_text,
        )
        return learning_pb2.RefundDecisionResponse(
            decision=decision,
            label=label,
            confidence=confidence,
            explanations=explanations,
            error=error,
        )


async def serve():
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    learning_pb2_grpc.add_LearningServiceServicer_to_server(LearningService(), server)

    grpc_port = os.getenv("GRPC_PORT", 50051)
    server.add_insecure_port(f"[::]:{grpc_port}")
    logging.info(f"Starting gRPC server on port {grpc_port}...")
    await server.start()

    # --- KHỞI CHẠY KAFKA CONSUMER ---
    # Tạo Kafka consumer task chạy ngầm
    logging.info("Starting Kafka consumer task...")
    kafka_task = asyncio.create_task(consume_user_updates())
    # --------------------------------

    try:
        # Chạy song song gRPC server và Kafka consumer
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logging.info("Stopping server...")
        # Dừng gRPC server
        await server.stop(0)
        # Dừng Kafka task
        kafka_task.cancel()
        try:
            await kafka_task
        except asyncio.CancelledError:
            logging.info("Kafka consumer task cancelled.")
    finally:
        # Đảm bảo đóng kết nối Redis
        await close_redis_client()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(serve())
