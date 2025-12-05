import grpc.aio
from concurrent import futures
import logging
import jwt
import httpx 
import os
import asyncio
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from google.protobuf import empty_pb2

# --- INTERNAL MODULES ---
from .api.matchmaking_service import match_users_with_gemini
from .core.grpc_auth_decorator import authenticated_grpc_method
from src.grpc_generated import learning_service_pb2 as learning_pb2
from src.grpc_generated import learning_service_pb2_grpc as learning_pb2_grpc

from .core.session import AsyncSessionLocal
from .core.cache import get_redis_client, close_redis_client
from .core.user_profile_service import get_user_profile
from .core.translator import get_translator

# --- API HANDLERS ---
from .api.speech_to_text import speech_to_text
from .api.chat_ai import chat_with_ai
# from .api.spelling_checker import check_spelling
from .api.passage_generator import generate_passage
from .api.image_generator import generate_image
from .api.text_generator import generate_text
from .api.roadmap_generator import generate_roadmap
from .api.translation_checker import check_translation
from .api.tts_generator import generate_tts
from .api.quiz_generator import generate_quiz
from .api.analytics_service import analyze_course_quality, decide_refund
from .api.review_analyzer import analyze_review
from .api.course_evaluator import evaluate_course_structure
from .api.pronunciation_checker import check_pronunciation_logic, stream_pronunciation_logic
from .api.writing_grader import grade_writing_logic

load_dotenv()
logging.basicConfig(level=logging.INFO)

class LearningService(learning_pb2_grpc.LearningServiceServicer):
    def __init__(self):
        try:
            # Load Public Key for JWT Verification
            with open("public_key.pem", "rb") as f:
                self.public_key = serialization.load_pem_public_key(
                    f.read(), backend=default_backend()
                )
        except Exception as e:
            logging.error(f"Failed to load public key: {str(e)}")
            # Fallback for dev environment or panic
            self.public_key = None 
            
        self.redis_client = get_redis_client()
        # Init Hybrid Translator with Redis
        self.translator = get_translator(self.redis_client)

    def _verify_token(self, context):
        try:
            metadata = dict(context.invocation_metadata())
            auth = metadata.get("authorization", "")
            if not auth.startswith("Bearer "):
                context.set_code(grpc.StatusCode.UNAUTHENTICATED)
                context.set_details("Missing or invalid Authorization header")
                return None
            token = auth[7:]
            
            # If no public key (e.g. dev), skip signature check or handle accordingly
            if not self.public_key:
                 return jwt.decode(token, options={"verify_signature": False})

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

    async def _get_profile_from_db(self, user_id: str, db_session):
        if not user_id:
            return None
        return await get_user_profile(user_id, db_session, self.redis_client)

    @authenticated_grpc_method
    async def Translate(self, request, context, claims) -> learning_pb2.TranslateResponse:
        """
        Uses HybridTranslator (Redis LTM + Gemini)
        """
        # Call the hybrid translator
        translated_text, detected_lang = await self.translator.translate(
            text=request.text, 
            source_lang_hint=request.source_language, 
            target_lang=request.target_language
        )
        
        return learning_pb2.TranslateResponse(
            translated_text=translated_text,
            source_language_detected=detected_lang,
            confidence=1.0 if translated_text else 0.0,
            error=""
        )

    @authenticated_grpc_method
    async def EvaluateCourseVersion(self, request, context, claims) -> learning_pb2.EvaluateCourseVersionResponse:
        logging.info(f"Evaluating course: {request.course_title}")
        rating, comment, error = await evaluate_course_structure(
            request.course_title,
            request.course_description,
            request.lessons
        )
        return learning_pb2.EvaluateCourseVersionResponse(
            rating=rating,
            review_comment=comment,
            error=error
        )

    @authenticated_grpc_method
    async def GradeCertificationTest(self, request, context, claims) -> learning_pb2.GradeTestResponse:
        logging.info(f"Grading test session {request.session_id} type {request.test_type}")
        graded_answers = []
        total_score = 0
        total_possible = 0
        
        for answer in request.answers:
            graded_answer = learning_pb2.GradedAnswerProto(question_id=answer.question_id)
            points = 10.0
            total_possible += points

            try:
                if answer.type == "SPEAKING":
                    audio_data = answer.audio_content if answer.audio_content else b""
                    if not audio_data:
                        graded_answer.score = 0
                        graded_answer.is_correct = False
                        graded_answer.feedback = "No audio provided"
                    else:
                        feedback, score, error = await check_pronunciation_logic(audio_data, answer.reference_text, "en")
                        if error:
                            graded_answer.score = 0
                            graded_answer.feedback = f"Error: {error}"
                        else:
                            graded_answer.score = (score / 100.0) * points
                            graded_answer.is_correct = score > 60
                            graded_answer.feedback = feedback

                elif answer.type == "WRITING":
                    feedback, score, error = await grade_writing_logic(
                        user_text=answer.text_content,
                        prompt_text=answer.reference_text,
                        image_bytes=None,
                        language="en"
                    )
                    if error:
                        graded_answer.score = 0
                        graded_answer.feedback = "AI Grading failed"
                    else:
                        graded_answer.score = (score / 100.0) * points
                        graded_answer.is_correct = score > 60
                        graded_answer.feedback = feedback
                            
                else: 
                    graded_answer.score = 0
                    graded_answer.feedback = "Passed to AI but not AI type"

                total_score += graded_answer.score
                graded_answers.append(graded_answer)
                
            except Exception as e:
                logging.error(f"Error grading question {answer.question_id}: {e}")
                graded_answer.score = 0
                graded_answer.feedback = "System Error"
                graded_answers.append(graded_answer)

        proficiency = "A1"
        percent = (total_score / total_possible * 100) if total_possible > 0 else 0
        if percent > 90: proficiency = "C2"
        elif percent > 80: proficiency = "C1"
        elif percent > 65: proficiency = "B2"
        elif percent > 50: proficiency = "B1"
        elif percent > 35: proficiency = "A2"

        return learning_pb2.GradeTestResponse(
            session_id=request.session_id,
            final_score=total_score,
            proficiency_level=proficiency,
            graded_answers=graded_answers
        )
    
    @authenticated_grpc_method
    async def SpeechToText(self, request, context, claims) -> learning_pb2.SpeechResponse:
        audio_data = request.audio.inline_data if request.audio.inline_data else b""
        text, detected_lang, error = speech_to_text(audio_data, request.language)
        return learning_pb2.SpeechResponse(text=text, error=error)

    @authenticated_grpc_method
    async def GenerateTts(self, request, context, claims) -> learning_pb2.TtsResponse:
        audio_data, error = await generate_tts(request.text, request.language, self.redis_client)
        return learning_pb2.TtsResponse(audio_data=audio_data, error=error)

    async def CheckPronunciation(self, request, context):
        try:
            reference_text = request.reference_text 
            if not reference_text:
                return learning_pb2.PronunciationResponse(error="Missing reference text form Server")

            audio_bytes = request.audio.inline_data
            feedback, score, error = await check_pronunciation_logic(
                audio_bytes, reference_text, request.language
            )
            return learning_pb2.PronunciationResponse(
                feedback=feedback, score=score, error=error or ""
            )
        except Exception as e:
            logging.error(f"CheckPronunciation Error: {e}")
            return learning_pb2.PronunciationResponse(error=str(e))

    async def StreamPronunciation(self, request_iterator, context):
        full_audio = b""
        reference_text = ""
        async for chunk in request_iterator:
            full_audio += chunk.audio_chunk
            if chunk.reference_text:
                reference_text = chunk.reference_text
        
        if not reference_text:
             yield learning_pb2.PronunciationChunkResponse(
                is_final=True, feedback="Error: No transcript received"
            )
             return

        async for result in stream_pronunciation_logic(full_audio, reference_text):
            yield learning_pb2.PronunciationChunkResponse(
                score=float(result.get("score", 0)),
                feedback=result.get("feedback", ""),
                is_final=result.get("is_final", False),
                chunk_type=result.get("type", "chunk")
            )

    @authenticated_grpc_method
    async def FindMatch(self, request, context, claims) -> learning_pb2.FindMatchResponse:
        try:
            match_result, error = await match_users_with_gemini(
                request.current_user_id,
                request.current_user_prefs,
                request.candidates
            )
            if error or not match_result:
                return learning_pb2.FindMatchResponse(
                    match_found=False, error=error or "No match found"
                )
            return learning_pb2.FindMatchResponse(
                match_found=True,
                partner_user_id=match_result["best_match_id"],
                compatibility_score=float(match_result["score"]),
                reason=match_result["reason"]
            )
        except Exception as e:
            logging.error(f"Error during FindMatch: {e}", exc_info=True)
            return learning_pb2.FindMatchResponse(error=f"Internal error: {str(e)}")

    # @authenticated_grpc_method
    # async def CheckSpelling(self, request, context, claims) -> learning_pb2.SpellingResponse:
    #     corrections, error = check_spelling(request.text, request.language)
    #     return learning_pb2.SpellingResponse(corrections=corrections, error=error)

    @authenticated_grpc_method
    async def CheckTranslation(self, request, context, claims) -> learning_pb2.CheckTranslationResponse:
        feedback, score, error = check_translation(
            request.reference_text, request.translated_text, request.target_language
        )
        return learning_pb2.CheckTranslationResponse(
            feedback=feedback, score=score, error=error
        )

    async def CheckWritingWithImage(self, request, context):
        try:
            image_bytes = request.image.inline_data if request.image.inline_data else None
            feedback, score, error = await grade_writing_logic(
                user_text=request.user_text,
                prompt_text=request.prompt,
                image_bytes=image_bytes,
                language=request.language
            )
            return learning_pb2.WritingImageResponse(
                feedback=feedback, score=score, error=error or ""
            )
        except Exception as e:
            logging.error(f"CheckWriting Error: {e}")
            return learning_pb2.WritingImageResponse(error=str(e))

    @authenticated_grpc_method
    async def ChatWithAI(self, request, context, claims) -> learning_pb2.ChatResponse:
        user_id = request.user_id or claims.get("sub")
        history_list = [{"role": m.role, "content": m.content} for m in request.history]
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                response, error = await chat_with_ai(
                    request.message, history_list, "en", user_profile,
                )
            return learning_pb2.ChatResponse(response=response, error=error)
        except Exception as e:
            logging.error(f"Error during ChatWithAI with session: {e}", exc_info=True)
            return learning_pb2.ChatResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GenerateSeedData(self, request, context, claims) -> learning_pb2.SeedDataResponse:
        # Move import here to avoid circular imports if any
        from .api.quiz_generator import improve_quiz_data 
        logging.info(f"Generating Seed Data for topic: {request.topic}")
        
        fixed_data, text_error = await improve_quiz_data(
            request.raw_question, list(request.raw_options), request.topic
        )
        
        if text_error or not fixed_data:
            return learning_pb2.SeedDataResponse(error=text_error or "Unknown error fixing data")

        fixed_question = fixed_data.get("fixed_question", "")
        fixed_options = fixed_data.get("fixed_options", [])
        image_prompt = fixed_data.get("image_prompt", f"Illustration for: {fixed_question}")

        audio_bytes = b""
        try:
            audio_bytes, tts_error = await generate_tts(fixed_question, "vi", self.redis_client) 
            if tts_error: logging.warning(f"TTS generation failed: {tts_error}")
        except Exception as e:
            logging.error(f"TTS Exception: {e}")

        image_bytes = b""
        try:
            image_url, img_error = await generate_image("admin_seed", image_prompt, "en", None)
            if image_url and not img_error:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(image_url)
                    if resp.status_code == 200:
                        image_bytes = resp.content
                    else:
                        logging.warning(f"Failed to download generated image from {image_url}")
            else:
                 logging.warning(f"Image generation failed: {img_error}")
        except Exception as e:
             logging.error(f"Image Seed Exception: {e}")

        return learning_pb2.SeedDataResponse(
            fixed_question=fixed_question,
            fixed_options=fixed_options,
            correct_index=fixed_data.get("correct_index", 0),
            explanation=fixed_data.get("explanation", ""),
            audio_bytes=audio_bytes,
            image_bytes=image_bytes,
            image_prompt_used=image_prompt,
            error=""
        )
        
    @authenticated_grpc_method
    async def GenerateImage(self, request, context, claims) -> learning_pb2.GenerateImageResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                image_url, error = await generate_image(
                    user_id, request.prompt, request.language, user_profile
                )
            return learning_pb2.GenerateImageResponse(
                image_urls=[image_url] if image_url else [], 
                model_used="gemini-imagen",
                error=error,
            )
        except Exception as e:
            logging.error(f"Error during GenerateImage: {e}", exc_info=True)
            return learning_pb2.GenerateImageResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GenerateText(self, request, context, claims) -> learning_pb2.GenerateTextResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                text, error = await generate_text(
                    user_id, request.prompt, request.language, user_profile
                )
            return learning_pb2.GenerateTextResponse(text=text, error=error)
        except Exception as e:
            logging.error(f"Error during GenerateText: {e}", exc_info=True)
            return learning_pb2.GenerateTextResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GeneratePassage(self, request, context, claims) -> learning_pb2.GeneratePassageResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                passage, error = await generate_passage(
                    user_id, request.language, request.topic, user_profile
                )
            return learning_pb2.GeneratePassageResponse(
                passage=passage, difficulty="medium", error=error
            )
        except Exception as e:
            logging.error(f"Error during GeneratePassage: {e}", exc_info=True)
            return learning_pb2.GeneratePassageResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def CreateOrUpdateRoadmap(self, request, context, claims) -> learning_pb2.RoadmapResponse:
        new_id = request.roadmap_id or "new_roadmap_" + os.urandom(4).hex()
        return learning_pb2.RoadmapResponse(
            roadmap_id=new_id,
            title=request.title,
            description=request.description,
            language=request.language,
        )

    @authenticated_grpc_method
    async def CreateOrUpdateRoadmapDetailed(self, request, context, claims) -> learning_pb2.RoadmapDetailedResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            logging.info(f"Start generating roadmap for user: {user_id}") 
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                generated_text, items, milestones, guidances, resources, totals, error = (
                    await generate_roadmap(
                        request.language, request.prompt, request.as_user_specific, user_profile
                    )
                )

            if error: return learning_pb2.RoadmapDetailedResponse(error=error)
            
            items_proto = [learning_pb2.RoadmapItemProto(**i) for i in items]
            resources_proto = [learning_pb2.RoadmapResourceProto(**r) for r in resources]
            guidances_proto = [learning_pb2.RoadmapGuidanceProto(**g) for g in guidances]
            milestones_proto = [learning_pb2.RoadmapMilestoneProto(**m) for m in milestones]

            return learning_pb2.RoadmapDetailedResponse(
                roadmap_id=request.roadmap_id or "new-detail-id",
                title=totals.get("title", "Generated Detailed Roadmap"),
                description=totals.get("description", generated_text),
                language=request.language,
                items=items_proto,
                resources=resources_proto,
                guidances=guidances_proto,
                milestones=milestones_proto,
            )
        except Exception as e:
            logging.error(f"Error during CreateOrUpdateRoadmapDetailed: {e}", exc_info=True)
            return learning_pb2.RoadmapDetailedResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GenerateLanguageQuiz(self, request, context, claims) -> learning_pb2.QuizGenerationResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                questions_list, error = await generate_quiz(
                    user_id, request.num_questions, request.mode, request.topic, user_profile
                )
                if error: return learning_pb2.QuizGenerationResponse(error=error)
                
                questions_proto = [learning_pb2.QuizQuestionProto(**q) for q in questions_list]
                return learning_pb2.QuizGenerationResponse(
                    quiz_id="quiz_" + os.urandom(4).hex(), questions=questions_proto
                )
        except Exception as e:
            logging.error(f"Error during GenerateLanguageQuiz: {e}", exc_info=True)
            return learning_pb2.QuizGenerationResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def AnalyzeCourseQuality(self, request, context, claims) -> learning_pb2.CourseQualityResponse:
        score, warnings, verdict, error = await analyze_course_quality(
            request.course_id, request.lesson_ids
        )
        return learning_pb2.CourseQualityResponse(
            quality_score=score, warnings=warnings, verdict=verdict, error=error
        )

    @authenticated_grpc_method
    async def RefundDecision(self, request, context, claims) -> learning_pb2.RefundDecisionResponse:
        decision, label, confidence, explanations, error = await decide_refund(
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

    @authenticated_grpc_method
    async def AnalyzeReviewQuality(self, request, context, claims) -> learning_pb2.ReviewQualityResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            is_valid, sentiment, topics, suggested_action, error = await analyze_review(
                user_id=user_id,
                content_id=request.content_id,
                review_text=request.review_text,
                rating=request.rating,
                content_type=request.content_type,
            )
            if error: return learning_pb2.ReviewQualityResponse(error=error)
            return learning_pb2.ReviewQualityResponse(
                is_valid=is_valid,
                sentiment=sentiment,
                topics=topics,
                suggested_action=suggested_action,
            )
        except Exception as e:
            logging.error(f"AnalyzeReviewQuality failed: {e}")
            return learning_pb2.ReviewQualityResponse(error=f"Internal server error: {e}")

async def serve():
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    learning_pb2_grpc.add_LearningServiceServicer_to_server(LearningService(), server)

    grpc_port = os.getenv("GRPC_PORT", 50051)
    server.add_insecure_port(f"[::]:{grpc_port}")
    logging.info(f"Starting gRPC server on port {grpc_port}...")
    await server.start()

    try:
        await server.wait_for_termination()
    finally:
        await close_redis_client()

if __name__ == "__main__":
    asyncio.run(serve())