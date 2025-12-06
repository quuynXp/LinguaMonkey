# src/learning_service.py
import os
import grpc.aio
from concurrent import futures
import logging
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import asyncio
from dotenv import load_dotenv
from .api.matchmaking_service import match_users_with_gemini

from .core.grpc_auth_decorator import authenticated_grpc_method

from src.grpc_generated import learning_service_pb2 as learning_pb2
from src.grpc_generated import learning_service_pb2_grpc as learning_pb2_grpc

from .core.session import AsyncSessionLocal
from .core.cache import get_redis_client, close_redis_client
from .core.user_profile_service import get_user_profile

from .api.speech_to_text import speech_to_text
from .api.chat_ai import chat_with_ai
# from .api.spelling_checker import check_spelling
# from .api.pronunciation_checker import check_pronunciation
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
from .api.review_analyzer import analyze_review
from .api.course_evaluator import evaluate_course_structure
from .api.pronunciation_checker import check_pronunciation_logic, stream_pronunciation_logic
from .api.writing_grader import grade_writing_logic
from .core.translator import get_translator

load_dotenv()


class LearningService(learning_pb2_grpc.LearningServiceServicer):
    def __init__(self):
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

    async def _get_profile_from_db(self, user_id: str, db_session):
        if not user_id:
            return None
        return await get_user_profile(user_id, db_session, self.redis_client)


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
            points = 10.0 # Standardize points per question for now
            total_possible += points

            try:
                if answer.type == "SPEAKING":
                    audio_data = answer.audio_content if answer.audio_content else b""
                    if not audio_data:
                        graded_answer.score = 0
                        graded_answer.is_correct = False
                        graded_answer.feedback = "No audio provided"
                    else:
                        # Use existing pronunciation module
                        feedback, score, error = await check_pronunciation(audio_data, answer.reference_text)
                        if error:
                            graded_answer.score = 0
                            graded_answer.feedback = f"Error: {error}"
                        else:
                            # Standardize 0-100 score to points
                            graded_answer.score = (score / 100.0) * points
                            graded_answer.is_correct = score > 60
                            graded_answer.feedback = feedback

                elif answer.type == "WRITING":
                    prompt = f"Grade this writing for a {request.test_type} exam. Topic/Prompt: '{answer.reference_text}'. Student Answer: '{answer.text_content}'. Provide a score out of 100 and brief feedback."
                    response_text, error = await chat_with_ai(prompt, [], "en")
                    
                    if error:
                        graded_answer.score = 0
                        graded_answer.feedback = "AI Grading failed"
                    else:
                    #   Simple heuristics to parse score (In production, use structured JSON output)
                        import re
                        score_match = re.search(r'\b(\d{1,3})/100', response_text)
                        ai_score = float(score_match.group(1)) if score_match else 70.0 # Fallback
                            
                        graded_answer.score = (ai_score / 100.0) * points
                        graded_answer.is_correct = ai_score > 60
                        graded_answer.feedback = response_text
                            
                else: 
                    # Choice questions should ideally be graded by Java, but if passed here, assume incorrect or skip
                    graded_answer.score = 0
                    graded_answer.feedback = "Passed to AI but not AI type"

                total_score += graded_answer.score
                graded_answers.append(graded_answer)
                
            except Exception as e:
                logging.error(f"Error grading question {answer.question_id}: {e}")
                graded_answer.score = 0
                graded_answer.feedback = "System Error"
                graded_answers.append(graded_answer)

        proficiency = "A1" # Calculate based on score logic
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
        audio_data = (
            request.audio.inline_data if request.audio.inline_data else b""
        )
        text, error = speech_to_text(audio_data, request.language)
        return learning_pb2.SpeechResponse(text=text, error=error)

    @authenticated_grpc_method
    async def GenerateTts(self, request, context, claims) -> learning_pb2.TtsResponse:
        audio_data, error = generate_tts(request.text, request.language)
        return learning_pb2.TtsResponse(audio_data=audio_data, error=error)

    # --- SPEAKING ---
    async def CheckPronunciation(self, request, context):
        """
        Non-streaming Check: Nhận Audio + Transcript chuẩn từ Java
        """
        try:
            # Lấy transcript chuẩn từ request gRPC (đã update proto)
            reference_text = request.reference_text 
            if not reference_text:
                return learning_pb2.PronunciationResponse(error="Missing reference text form Server")

            audio_bytes = request.audio.inline_data
            
            # Gọi logic (bên file pronunciation_checker.py)
            feedback, score, error = await check_pronunciation_logic(
                audio_bytes, 
                reference_text, 
                request.language
            )
            
            return learning_pb2.PronunciationResponse(
                feedback=feedback,
                score=score,
                error=error or ""
            )
        except Exception as e:
            logging.error(f"CheckPronunciation Error: {e}")
            return learning_pb2.PronunciationResponse(error=str(e))

    async def StreamPronunciation(self, request_iterator, context):
        """
        Streaming Check: Nhận Audio stream + Transcript (gửi ở chunk đầu)
        """
        full_audio = b""
        reference_text = ""
        
        # Gom chunks (Demo simple buffering, prod nên stream pipe)
        async for chunk in request_iterator:
            full_audio += chunk.audio_chunk
            # Java gửi reference_text ở chunk đầu tiên
            if chunk.reference_text:
                reference_text = chunk.reference_text
        
        if not reference_text:
             yield learning_pb2.PronunciationChunkResponse(
                is_final=True, feedback="Error: No transcript received"
            )
             return

        # Gọi logic xử lý
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
                    match_found=False,
                    error=error or "No match found"
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

    # @authenticated_grpc_method
    # async def CheckTranslation(self, request, context, claims) -> learning_pb2.CheckTranslationResponse:
    #     feedback, score, error = check_translation(
    #         request.reference_text, request.translated_text, request.target_language
    #     )
    #     return learning_pb2.CheckTranslationResponse(
    #         feedback=feedback, score=score, error=error
    #     )

    # --- WRITING ---

    async def CheckWritingAssessment(self, request, context):
        try:
            media_bytes = request.media.inline_data if request.media.inline_data else None
            media_url = request.media.url
            
            feedback, score, error = await grade_writing_logic(
                user_text=request.user_text,
                prompt_text=request.prompt,
                media_bytes=media_bytes,
                media_url=media_url,     # Truyền vào logic
                mime_type=request.media_type,
                language=request.language
            )
            
            return learning_pb2.WritingAssessmentResponse(
                feedback=feedback,
                score=score,
                error=error or ""
            )
        except Exception as e:
            logging.error(f"CheckWritingAssessment Error: {e}")
            return learning_pb2.WritingAssessmentResponse(error=str(e))


    async def CheckWritingWithImage(self, request, context):
        try:
            image_bytes = request.image.inline_data if request.image.inline_data else None
            
            # Using the NEW logic in writing_grader.py
            feedback, score, error = await grade_writing_logic(
                user_text=request.user_text,
                prompt_text=request.prompt,
                image_bytes=image_bytes,
                language=request.language
            )
            
            return learning_pb2.WritingImageResponse(
                feedback=feedback,
                score=score,
                error=error or ""
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
                    request.message,
                    history_list,
                    "en",
                    user_profile,
                )
            return learning_pb2.ChatResponse(response=response, error=error)
        except Exception as e:
            logging.error(f"Error during ChatWithAI with session: {e}", exc_info=True)
            return learning_pb2.ChatResponse(error=f"Internal service error: {str(e)}")


    @authenticated_grpc_method
    async def GenerateSeedData(self, request, context, claims) -> learning_pb2.SeedDataResponse:
        logging.info(f"Generating Seed Data for topic: {request.topic}")
        
        # 1. Fix/Generate Text Data using Gemini
        fixed_data, text_error = await improve_quiz_data(
            request.raw_question, 
            list(request.raw_options), 
            request.topic
        )
        
        if text_error or not fixed_data:
            return learning_pb2.SeedDataResponse(error=text_error or "Unknown error fixing data")

        fixed_question = fixed_data.get("fixed_question", "")
        fixed_options = fixed_data.get("fixed_options", [])
        image_prompt = fixed_data.get("image_prompt", f"Illustration for: {fixed_question}")

        # 2. Generate Audio (TTS) for the Question
        audio_bytes = b""
        try:
            # Reusing existing tts logic
            audio_bytes, tts_error = await generate_tts(fixed_question, "vi") 
            if tts_error:
                logging.warning(f"TTS generation failed for seed data: {tts_error}")
        except Exception as e:
            logging.error(f"TTS Exception: {e}")

        # 3. Generate Image
        image_bytes = b""
        try:
            # Generate Image returns a URL usually. We need to download it to return bytes to Java.
            image_url, img_error = await generate_image("admin_seed", image_prompt, "en", None)
            
            if image_url and not img_error:
                async with aiohttp.ClientSession() as session:
                    async with session.get(image_url) as resp:
                        if resp.status == 200:
                            image_bytes = await resp.read()
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
    async def Translate(self, request, context, claims) -> learning_pb2.TranslateResponse:
        translated_text, detected_lang = await self.translator.translate(
            request.text, 
            request.source_language, 
            request.target_language
        )
        
        return learning_pb2.TranslateResponse(
            translated_text=translated_text,
            source_language_detected=detected_lang, # Return actual detected lang
            confidence=1.0 if translated_text else 0.0,
            error=""
        )

    @authenticated_grpc_method
    async def GenerateImage(self, request, context, claims) -> learning_pb2.GenerateImageResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                # Assuming generate_image returns a URL string in the first return value
                image_url, error = generate_image(
                    user_id, request.prompt, request.language, user_profile
                )
            
            return learning_pb2.GenerateImageResponse(
                image_urls=[image_url] if image_url else [], 
                model_used="gemini-imagen",
                error=error,
            )
        except Exception as e:
            logging.error(f"Error during GenerateImage with session: {e}", exc_info=True)
            return learning_pb2.GenerateImageResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GenerateText(self, request, context, claims) -> learning_pb2.GenerateTextResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
                # Now awaiting the async Gemini call
                text, error = await generate_text(
                    user_id, request.prompt, request.language, user_profile
                )
            return learning_pb2.GenerateTextResponse(text=text, error=error)
        except Exception as e:
            logging.error(f"Error during GenerateText with session: {e}", exc_info=True)
            return learning_pb2.GenerateTextResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def GeneratePassage(self, request, context, claims) -> learning_pb2.GeneratePassageResponse:
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

            if error:
                return learning_pb2.RoadmapDetailedResponse(error=error)
            
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

    @authenticated_grpc_method
    async def GenerateLanguageQuiz(self, request, context, claims) -> learning_pb2.QuizGenerationResponse:
        user_id = request.user_id or claims.get("sub")
        try:
            async with AsyncSessionLocal() as db_session:
                user_profile = await self._get_profile_from_db(user_id, db_session)
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
            logging.error(f"Error during GenerateLanguageQuiz with session: {e}", exc_info=True)
            return learning_pb2.QuizGenerationResponse(error=f"Internal service error: {str(e)}")

    @authenticated_grpc_method
    async def AnalyzeCourseQuality(self, request, context, claims) -> learning_pb2.CourseQualityResponse:
        score, warnings, verdict, error = analyze_course_quality(
            request.course_id, request.lesson_ids
        )
        return learning_pb2.CourseQualityResponse(
            quality_score=score, warnings=warnings, verdict=verdict, error=error
        )

    @authenticated_grpc_method
    async def RefundDecision(self, request, context, claims) -> learning_pb2.RefundDecisionResponse:
        caller_role = claims.get("role", "USER")
        caller_sub = claims.get("sub", "")

        logging.info(f"RefundDecision called by: {caller_sub} (Role: {caller_role})")
        
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
            
            is_toxic = "TOXIC" in sentiment.upper() or "HATE" in sentiment.upper() or "OFFENSIVE" in sentiment.upper()

            if error:
                return learning_pb2.ReviewQualityResponse(error=error)
                
            return learning_pb2.ReviewQualityResponse(
                is_valid=is_valid,
                is_toxic=is_toxic,
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
    # except KeyboardInterrupt:
    #     logging.info("Stopping server...")
    #     await server.stop(0)
    finally:
        await close_redis_client()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(serve())