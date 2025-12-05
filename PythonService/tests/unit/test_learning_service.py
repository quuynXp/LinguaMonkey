import unittest
import sys
import os
import asyncio
import grpc
from unittest.mock import MagicMock, patch, AsyncMock
from google.protobuf.json_format import MessageToDict

# Ensure src is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.grpc_generated import learning_service_pb2 as learning_pb2
from src.python_service.server import LearningService

class TestLearningService(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Mock dependencies loaded in __init__
        self.mock_redis = AsyncMock()
        self.mock_translator = AsyncMock()
        
        patcher_open = patch('builtins.open', unittest.mock.mock_open(read_data=b'public_key'))
        patcher_serialization = patch('src.python_service.server.serialization')
        patcher_redis = patch('src.python_service.server.get_redis_client', return_value=self.mock_redis)
        patcher_get_translator = patch('src.python_service.server.get_translator', return_value=self.mock_translator)
        
        self.mock_open = patcher_open.start()
        self.mock_serialization = patcher_serialization.start()
        self.mock_get_redis = patcher_redis.start()
        self.mock_get_translator = patcher_get_translator.start()
        
        self.addCleanup(patcher_open.stop)
        self.addCleanup(patcher_serialization.stop)
        self.addCleanup(patcher_redis.stop)
        self.addCleanup(patcher_get_translator.stop)

        self.service = LearningService()
        
        # Mock Context for gRPC calls
        self.mock_context = MagicMock()
        self.mock_context.invocation_metadata.return_value = [
            ('authorization', 'Bearer valid.test.token')
        ]
        
        # Patch JWT decode to bypass auth decorator logic for all tests
        self.jwt_patcher = patch('src.python_service.server.jwt.decode')
        self.mock_jwt_decode = self.jwt_patcher.start()
        self.mock_jwt_decode.return_value = {"sub": "test_user_id"}
        self.addCleanup(self.jwt_patcher.stop)

    @patch('src.python_service.server.speech_to_text')
    async def test_speech_to_text(self, mock_stt):
        mock_stt.return_value = ("Hello World", "en", None)
        
        request = learning_pb2.SpeechRequest(
            audio=learning_pb2.MediaRef(inline_data=b"audio_bytes"),
            language="en"
        )
        
        response = await self.service.SpeechToText(request, self.mock_context)
        
        self.assertEqual(response.text, "Hello World")
        self.assertEqual(response.error, "")
        mock_stt.assert_called_once()

    @patch('src.python_service.server.generate_tts')
    async def test_generate_tts(self, mock_tts):
        mock_tts.return_value = (b"output_audio", None)
        
        request = learning_pb2.TtsRequest(text="Hello", language="en")
        
        response = await self.service.GenerateTts(request, self.mock_context)
        
        self.assertEqual(response.audio_data, b"output_audio")
        self.assertEqual(response.error, "")
        mock_tts.assert_called_with("Hello", "en", self.mock_redis)

    @patch('src.python_service.server.AsyncSessionLocal')
    @patch('src.python_service.server.get_user_profile')
    @patch('src.python_service.server.chat_with_ai')
    async def test_chat_with_ai(self, mock_chat, mock_get_profile, mock_session):
        # Setup DB Mock
        mock_db = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_db
        
        mock_get_profile.return_value = {"name": "Test User"}
        mock_chat.return_value = ("AI Response", None)
        
        history = [learning_pb2.ChatMessage(role="user", content="Hi")]
        request = learning_pb2.ChatRequest(
            user_id="test_user_id",
            message="How are you?",
            history=history
        )
        
        response = await self.service.ChatWithAI(request, self.mock_context)
        
        self.assertEqual(response.response, "AI Response")
        self.assertEqual(response.error, "")
        mock_chat.assert_awaited_once()

    @patch('src.python_service.server.check_pronunciation_logic')
    async def test_check_pronunciation(self, mock_check):
        mock_check.return_value = ("Good job", 85.5, None)
        
        request = learning_pb2.PronunciationRequest(
            audio=learning_pb2.MediaRef(inline_data=b"audio"),
            language="en",
            reference_text="apple"
        )
        
        response = await self.service.CheckPronunciation(request, self.mock_context)
        
        self.assertEqual(response.score, 85.5)
        self.assertEqual(response.feedback, "Good job")
        mock_check.assert_awaited_with(b"audio", "apple", "en")

    @patch('src.python_service.server.evaluate_course_structure')
    async def test_evaluate_course_version(self, mock_evaluate):
        mock_evaluate.return_value = (4.5, "Good structure", None)
        
        lessons = [learning_pb2.LessonMetadata(lesson_title="Intro", lesson_type="VIDEO")]
        request = learning_pb2.EvaluateCourseVersionRequest(
            course_title="Python 101",
            course_description="Basic Python",
            lessons=lessons
        )
        
        response = await self.service.EvaluateCourseVersion(request, self.mock_context)
        
        self.assertEqual(response.rating, 4.5)
        self.assertEqual(response.review_comment, "Good structure")
        mock_evaluate.assert_awaited_once()

    @patch('src.python_service.server.match_users_with_gemini')
    async def test_find_match(self, mock_match):
        mock_match.return_value = ({
            "best_match_id": "user_456",
            "score": 90.0,
            "reason": "Common interests"
        }, None)
        
        request = learning_pb2.FindMatchRequest(
            current_user_id="user_123",
            current_user_prefs=learning_pb2.CallPreferences(learning_language="en"),
            candidates=[learning_pb2.MatchCandidate(user_id="user_456")]
        )
        
        response = await self.service.FindMatch(request, self.mock_context)
        
        self.assertTrue(response.match_found)
        self.assertEqual(response.partner_user_id, "user_456")
        self.assertEqual(response.compatibility_score, 90.0)

    @patch('src.python_service.server.httpx.AsyncClient')
    @patch('src.python_service.server.generate_image')
    @patch('src.python_service.server.generate_tts')
    async def test_generate_seed_data(self, mock_tts, mock_img, mock_httpx):
        # Note: GenerateSeedData does a delayed import for improve_quiz_data
        # We need to patch where it is defined, assuming standard structure
        with patch('src.python_service.api.quiz_generator.improve_quiz_data') as mock_improve:
            mock_improve.return_value = ({
                "fixed_question": "Fixed Q",
                "fixed_options": ["A", "B", "C", "D"],
                "correct_index": 0,
                "explanation": "Exp",
                "image_prompt": "Prompt"
            }, None)
            
            mock_tts.return_value = (b"audio", None)
            mock_img.return_value = ("http://image.url", None)
            
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.content = b"image_bytes"
            mock_httpx.return_value.__aenter__.return_value.get.return_value = mock_resp
            
            request = learning_pb2.SeedDataRequest(
                raw_question="Raw",
                raw_options=["1", "2"],
                topic="Test"
            )
            
            response = await self.service.GenerateSeedData(request, self.mock_context)
            
            self.assertEqual(response.fixed_question, "Fixed Q")
            self.assertEqual(response.audio_bytes, b"audio")
            self.assertEqual(response.image_bytes, b"image_bytes")

    @patch('src.python_service.server.grade_writing_logic')
    @patch('src.python_service.server.check_pronunciation_logic')
    async def test_grade_certification_test(self, mock_pronounce, mock_writing):
        # Mock logic results
        mock_pronounce.return_value = ("Good speaking", 80.0, None)
        mock_writing.return_value = ("Good writing", 90.0, None)
        
        answers = [
            learning_pb2.TestAnswerProto(
                question_id="q1",
                type="SPEAKING",
                audio_content=b"audio",
                reference_text="hello"
            ),
            learning_pb2.TestAnswerProto(
                question_id="q2",
                type="WRITING",
                text_content="essay",
                reference_text="topic"
            )
        ]
        
        request = learning_pb2.GradeTestRequest(
            session_id="sess_1",
            test_type="proficiency",
            answers=answers
        )
        
        response = await self.service.GradeCertificationTest(request, self.mock_context)
        
        # Calculation: 
        # Speaking: 80% of 10 points = 8.0
        # Writing: 90% of 10 points = 9.0
        # Total: 17.0 / 20.0 = 85%
        
        self.assertEqual(response.session_id, "sess_1")
        self.assertEqual(response.final_score, 17.0)
        self.assertEqual(response.proficiency_level, "C1") # > 80%
        self.assertEqual(len(response.graded_answers), 2)
        self.assertEqual(response.graded_answers[0].score, 8.0)

    async def test_check_translation(self):
        # Use mocked translator from setUp (mock_check_translation is separate func in code)
        with patch('src.python_service.server.check_translation') as mock_check:
            mock_check.return_value = ("Correct", 1.0, None)
            
            request = learning_pb2.CheckTranslationRequest(
                reference_text="Hello",
                translated_text="Xin chào",
                target_language="vi"
            )
            
            response = await self.service.CheckTranslation(request, self.mock_context)
            
            self.assertEqual(response.feedback, "Correct")
            self.assertEqual(response.score, 1.0)

    @patch('src.python_service.server.generate_quiz')
    @patch('src.python_service.server.AsyncSessionLocal')
    @patch('src.python_service.server.get_user_profile')
    async def test_generate_language_quiz(self, mock_profile, mock_session, mock_gen_quiz):
        mock_profile.return_value = {}
        mock_session.return_value.__aenter__.return_value = AsyncMock()
        
        mock_gen_quiz.return_value = ([{
            "id": "1",
            "question_text": "Q1",
            "options": ["A", "B"],
            "correct_answer_index": 0,
            "difficulty": "easy",
            "points": 10
        }], None)
        
        request = learning_pb2.QuizGenerationRequest(
            user_id="u1", num_questions=5, mode="grammar", topic="verbs"
        )
        
        response = await self.service.GenerateLanguageQuiz(request, self.mock_context)
        
        self.assertTrue(response.quiz_id.startswith("quiz_"))
        self.assertEqual(len(response.questions), 1)
        self.assertEqual(response.questions[0].question_text, "Q1")

    @patch('src.python_service.server.analyze_review')
    async def test_analyze_review_quality(self, mock_analyze):
        mock_analyze.return_value = (True, "POSITIVE", ["quality"], "approve", None)
        
        request = learning_pb2.ReviewQualityRequest(
            user_id="u1", content_id="c1", review_text="Great!", rating=5.0
        )
        
        response = await self.service.AnalyzeReviewQuality(request, self.mock_context)
        
        self.assertTrue(response.is_valid)
        self.assertEqual(response.sentiment, "POSITIVE")
        self.assertEqual(response.suggested_action, "approve")

if __name__ == '__main__':
    unittest.main()