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
from . import learning_service_pb2 as learning_pb2
from . import learning_service_pb2_grpc as learning_pb2_grpc

# Import core services (DB, Cache, Auth)
from .core.session import AsyncSessionLocal
from .core.cache import get_redis_client, close_redis_client
from .core.user_profile_service import get_user_profile
from .core.kafka_consumer import consume_user_updates

# Import AI/API functions
# (Giữ nguyên các import AI/API)
from .api.speech_to_text import speech_to_text
from .api.chat_ai import chat_with_ai
from .api.spelling_checker import check_spelling
from .api.pronunciation_checker import check_pronunciation
from .api.image_text_analyzer import analyze_image_with_text
from .api.passage_generator import generate_passage
from .api.image_generator import generate_image
from .api.text_generator import generate_text
from .api.roadmap_generator import generate_roadmap
from .api.translation_checker import check_translation
from .api.translation import translate_text
from .api.tts_generator import generate_tts
from .api.quiz_generator import generate_quiz
from .api.analytics_service import analyze_course_quality, decide_refund


load_dotenv()


class LearningService(learning_pb2_grpc.LearningServiceServicer):
    def __init__(self):
        # (Giữ nguyên __init__ và redis_client)
        try:
            with open("public_key.pem", "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(), backend=default_backend()
                )
        except Exception as e:
            logging.error(f"Failed to load public key: {str(e)}")
            raise
        self.redis_client = get_redis_client()

    def _verify_token(self, context):
        # (Giữ nguyên _verify_token)
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
    # <<< ĐÂY LÀ HÀM ĐÃ SỬA SIGNATURE (NHẬN db_session) >>>
    async def _get_profile_from_db(self, user_id: str, db_session):
        """Fetches user profile using cache and DB."""
        if not user_id:
            return None
        # Hàm này VẪN DÙNG REDIS (self.redis_client) như bình thường
        # Nó chỉ dùng db_session khi cache miss
        return await get_user_profile(user_id, db_session, self.redis_client)

    # --- Speech & Audio ---
    # (Các hàm SpeechToText, GenerateTts, CheckPronunciation, StreamPronunciation
    # giữ nguyên VÌ CHÚNG KHÔNG GỌI _get_profile_from_db)
    async def SpeechToText(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.SpeechResponse()
        audio_data = (
            request.audio.inline_data if request.audio.inline_data else b""
        )
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
        feedback, score, error = await check_pronunciation(audio_data, request.reference_text)
        ipa = "/mɒk/"
        suggestion = "Try to stress the first syllable."
        return learning_pb2.PronunciationResponse(
            feedback=feedback, score=score, error=error, ipa=ipa, suggestion=suggestion
        )
    
    async def StreamPronunciation(self, request_iterator, context):
        # (Giữ nguyên StreamPronunciation)
        if not self._verify_token(context):
            return
        full_audio_chunks = []
        try:
            async for chunk in request_iterator:
                full_audio_chunks.append(chunk.audio_chunk)
                if chunk.is_final:
                    break
            final_audio = b"".join(full_audio_chunks)
            feedback, score, error = check_pronunciation(
                final_audio, "en"
            )
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
    # (CheckSpelling, CheckTranslation, CheckWritingWithImage giữ nguyên
    # VÌ CHÚNG KHÔNG GỌI _get_profile_from_db)
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

    # <<< SỬA ĐỔI HÀM ChatWithAI >>>
    async def ChatWithAI(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.ChatResponse()

        user_id = request.user_id or claims.get("sub")
        history_list = [{"role": m.role, "content": m.content} for m in request.history]

        try:
            # 1. Tạo session
            async with AsyncSessionLocal() as db_session:
                # 2. Lấy profile và truyền session vào
                user_profile = await self._get_profile_from_db(user_id, db_session)

                # 3. Gọi AI
                response, error = await chat_with_ai(
                    request.message,
                    history_list,
                    "en",  # Language param
                    user_profile,
                )
            return learning_pb2.ChatResponse(response=response, error=error)
        
        except Exception as e:
            logging.error(f"Error during ChatWithAI with session: {e}", exc_info=True)
            return learning_pb2.ChatResponse(error=f"Internal service error: {str(e)}")

    # (Translate giữ nguyên)
    async def Translate(self, request, context):
        if not self._verify_token(context):
            return learning_pb2.TranslateResponse()
        translated_text, error = translate_text(
            request.text, request.source_language, request.target_language
        )
        detected_lang = request.source_language or "en"
        confidence = 0.95
        return learning_pb2.TranslateResponse(
            translated_text=translated_text,
            source_language_detected=detected_lang,
            confidence=confidence,
            error=error,
        )

    # --- Content Generation ---
    # <<< SỬA ĐỔI HÀM GenerateImage >>>
    async def GenerateImage(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GenerateImageResponse()

        user_id = request.user_id or claims.get("sub")

        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                image_data, error = generate_image(
                    user_id, request.prompt, request.language, user_profile
                )
            
            return learning_pb2.GenerateImageResponse(
                image_urls=["https://example.com/mock_image.png"], # Mock
                model_used="mock_model",
                error=error,
            )
        except Exception as e:
            logging.error(f"Error during GenerateImage with session: {e}", exc_info=True)
            return learning_pb2.GenerateImageResponse(error=f"Internal service error: {str(e)}")

    # <<< SỬA ĐỔI HÀM GenerateText >>>
    async def GenerateText(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GenerateTextResponse()

        user_id = request.user_id or claims.get("sub")
        
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                text, error = generate_text(
                    user_id, request.prompt, request.language, user_profile
                )
            return learning_pb2.GenerateTextResponse(text=text, error=error)
        except Exception as e:
            logging.error(f"Error during GenerateText with session: {e}", exc_info=True)
            return learning_pb2.GenerateTextResponse(error=f"Internal service error: {str(e)}")

    # <<< SỬA ĐỔI HÀM GeneratePassage >>>
    async def GeneratePassage(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.GeneratePassageResponse()

        user_id = request.user_id or claims.get("sub")
        
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                passage, error = generate_passage(
                    user_id, request.language, request.topic, user_profile
                )
            
            return learning_pb2.GeneratePassageResponse(
                passage=passage, difficulty="medium", error=error
            )
        except Exception as e:
            logging.error(f"Error during GeneratePassage with session: {e}", exc_info=True)
            return learning_pb2.GeneratePassageResponse(error=f"Internal service error: {str(e)}")

    # --- Personalized Learning ---
    # (CreateOrUpdateRoadmap giữ nguyên)
    async def CreateOrUpdateRoadmap(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.RoadmapResponse()
        new_id = request.roadmap_id or "new_roadmap_" + os.urandom(4).hex()
        return learning_pb2.RoadmapResponse(
            roadmap_id=new_id,
            title=request.title,
            description=request.description,
            language=request.language,
        )

    # <<< SỬA ĐỔI HÀM CreateOrUpdateRoadmapDetailed >>>
    async def CreateOrUpdateRoadmapDetailed(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.RoadmapDetailedResponse(error="Unauthenticated")

        user_id = request.user_id or claims.get("sub")
        
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                generated_text, items, milestones, guidances, resources, totals, error = (
                    await generate_roadmap(
                        request.language, request.prompt, request.as_user_specific, user_profile
                    )
                )

            if error:
                return learning_pb2.RoadmapDetailedResponse(error=error)
            
            # (Phần map DTO giữ nguyên)
            title = totals.get("title", "Generated Detailed Roadmap")
            description = totals.get("description", generated_text)
            items_proto = [learning_pb2.RoadmapItemProto(**i) for i in items]
            resources_proto = [learning_pb2.RoadmapResourceProto(**r) for r in resources]
            guidances_proto = [learning_pb2.RoadmapGuidanceProto(**g) for g in guidances]
            milestones_proto = [learning_pb2.RoadmapMilestoneProto(**m) for m in milestones]

            return learning_pb2.RoadmapDetailedResponse(
                roadmap_id=request.roadmap_id or "new-detail-id",
                title=title,
                description=description,
                language=request.language,
                items=items_proto,
                resources=resources_proto,
                guidances=guidances_proto,
                milestones=milestones_proto,
            )
        except Exception as e:
            logging.error(f"Error during CreateOrUpdateRoadmapDetailed with session: {e}", exc_info=True)
            return learning_pb2.RoadmapDetailedResponse(error=f"Internal service error: {str(e)}")

    # <<< HÀM GenerateLanguageQuiz (Đã sửa từ lần trước) >>>
    async def GenerateLanguageQuiz(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.QuizGenerationResponse(error="Unauthenticated")

        user_id = request.user_id or claims.get("sub")
        try:
            # Tạo session một lần duy nhất ở đầu handler
            async with AsyncSessionLocal() as db_session:
                # 1. Lấy user_profile dùng session đã tạo
                user_profile = await self._get_profile_from_db(user_id, db_session)
                
                # 2. Gọi generate_quiz
                questions_list, error = await generate_quiz(
                    user_id, request.num_questions, request.mode, request.topic, user_profile
                )
                
                if error:
                    return learning_pb2.QuizGenerationResponse(error=error)

                questions_proto = [learning_pb2.QuizQuestionProto(**q) for q in questions_list]

                return learning_pb2.QuizGenerationResponse(
                    quiz_id="quiz_" + os.urandom(4).hex(), questions=questions_proto
                )

        except Exception as e:
            # Bắt tất cả các lỗi (bao gồm cả lỗi SQLAlchemy)
            logging.error(f"Error during GenerateLanguageQuiz with session: {e}", exc_info=True)
            return learning_pb2.QuizGenerationResponse(error=f"Internal service error: {str(e)}")

    # --- System-level / analytics ---
    # (Các hàm AnalyzeCourseQuality, RefundDecision, AnalyzeReviewQuality giữ nguyên
    # VÌ CHÚNG KHÔNG GỌI _get_profile_from_db)
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

    async def AnalyzeReviewQuality(self, request, context):
        claims = self._verify_token(context)
        if not claims:
            return learning_pb2.ReviewQualityResponse(error="Unauthenticated")
        user_id = request.user_id or claims.get("sub")
        try:
            is_valid, sentiment, topics, suggested_action, error = await analyze_review(
                user_id=user_id,
                content_id=request.content_id,
                review_text=request.review_text,
                rating=request.rating,
                content_type=request.content_type,
            )
            if error:
                return learning_pb2.ReviewQualityResponse(error=error)
            return learning_pb2.ReviewQualityResponse(
                is_valid=is_valid,
                sentiment=sentiment,
                topics=topics,
                suggested_action=suggested_action,
            )
        except Exception as e:
            logging.error(f"AnalyzeReviewQuality failed unexpectedly: {e}")
            return learning_pb2.ReviewQualityResponse(error=f"Internal server error: {e}")

# (Hàm serve() và __main__ giữ nguyên)
async def serve():
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    learning_pb2_grpc.add_LearningServiceServicer_to_server(LearningService(), server)

    grpc_port = os.getenv("GRPC_PORT", 50051)
    server.add_insecure_port(f"[::]:{grpc_port}")
    logging.info(f"Starting gRPC server on port {grpc_port}...")
    await server.start()

    logging.info("Starting Kafka consumer task...")
    kafka_task = asyncio.create_task(consume_user_updates())

    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logging.info("Stopping server...")
        await server.stop(0)
        kafka_task.cancel()
        try:
            await kafka_task
        except asyncio.CancelledError:
            logging.info("Kafka consumer task cancelled.")
    finally:
        await close_redis_client()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(serve())