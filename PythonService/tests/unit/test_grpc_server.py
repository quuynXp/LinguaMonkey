import unittest
import sys
import os
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

# Add source path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import generated proto (Mocking this if you haven't generated them yet)
try:
    from src.grpc_generated import learning_service_pb2 as learning_pb2
except ImportError:
    # Fail-safe mock for proto objects if files are missing during dev
    learning_pb2 = MagicMock()
    learning_pb2.GradeTestResponse = MagicMock()
    learning_pb2.GradedAnswerProto = MagicMock()
    learning_pb2.TranslateResponse = MagicMock()

from src.python_service.server import LearningService

class TestLearningServiceGRPC(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Mock dependencies in __init__
        patcher_redis = patch('src.python_service.server.get_redis_client', new_callable=AsyncMock)
        patcher_trans = patch('src.python_service.server.get_translator')
        patcher_open = patch('builtins.open', unittest.mock.mock_open(read_data=b'key'))
        patcher_serial = patch('src.python_service.server.serialization')
        
        self.mock_redis = patcher_redis.start()
        self.mock_get_trans = patcher_trans.start()
        patcher_open.start()
        patcher_serial.start()
        
        # Setup Translator Mock
        self.mock_translator_instance = AsyncMock()
        self.mock_get_trans.return_value = self.mock_translator_instance
        
        self.service = LearningService()
        
        # Cleanup
        self.addCleanup(patcher_redis.stop)
        self.addCleanup(patcher_trans.stop)
        self.addCleanup(patcher_open.stop)
        self.addCleanup(patcher_serial.stop)

        # Mock Context
        self.mock_context = MagicMock()
        self.mock_context.invocation_metadata.return_value = [('authorization', 'Bearer token')]

    @patch('src.python_service.server.jwt.decode')
    async def test_translate_grpc(self, mock_jwt):
        mock_jwt.return_value = {"sub": "user_id"}
        self.mock_translator_instance.translate.return_value = ("Xin chào", "vi")

        request = MagicMock()
        request.text = "Hello"
        request.source_language = "en"
        request.target_language = "vi"

        response = await self.service.Translate(request, self.mock_context)

        self.assertEqual(response.translated_text, "Xin chào")
        self.assertEqual(response.source_language_detected, "vi")

    @patch('src.python_service.server.check_pronunciation_logic')
    @patch('src.python_service.server.grade_writing_logic')
    @patch('src.python_service.server.jwt.decode')
    async def test_grade_certification_test(self, mock_jwt, mock_writing, mock_pronun):
        mock_jwt.return_value = {"sub": "user_id"}
        
        # Mock Logic Results
        # Pronunciation: 80 score -> 8.0 points
        mock_pronun.return_value = ("Good", 80.0, None)
        # Writing: 90 score -> 9.0 points
        mock_writing.return_value = ("Excellent", 90.0, None)

        # Build Request with 2 answers
        ans1 = MagicMock()
        ans1.type = "SPEAKING"
        ans1.question_id = "q1"
        ans1.audio_content = b"audio"
        
        ans2 = MagicMock()
        ans2.type = "WRITING"
        ans2.question_id = "q2"
        ans2.text_content = "Essay"

        request = MagicMock()
        request.session_id = "sess_123"
        request.answers = [ans1, ans2]

        response = await self.service.GradeCertificationTest(request, self.mock_context)

        # Verify Total Score: 8.0 + 9.0 = 17.0
        self.assertEqual(response.final_score, 17.0)
        self.assertEqual(len(response.graded_answers), 2)
        self.assertEqual(response.graded_answers[0].score, 8.0)

    @patch('src.python_service.server.stream_pronunciation_logic')
    async def test_stream_pronunciation(self, mock_logic):
        # Mock Generator Logic
        async def fake_generator(audio, text):
            yield {"score": 50, "feedback": "Keep going", "is_final": False}
            yield {"score": 90, "feedback": "Done", "is_final": True}
        
        mock_logic.side_effect = fake_generator

        # Mock Request Iterator
        async def request_iterator():
            yield MagicMock(audio_chunk=b"chunk1", reference_text="hello")
            yield MagicMock(audio_chunk=b"chunk2", reference_text="")

        # Collect responses
        responses = []
        async for res in self.service.StreamPronunciation(request_iterator(), self.mock_context):
            responses.append(res)

        self.assertEqual(len(responses), 2)
        self.assertEqual(responses[1].score, 90.0)
        self.assertTrue(responses[1].is_final)

    @patch('src.python_service.server.jwt.decode')
    @patch('src.python_service.server.AsyncSessionLocal')
    @patch('src.python_service.server.get_user_profile')
    @patch('src.python_service.server.generate_quiz')
    async def test_generate_language_quiz(self, mock_gen, mock_prof, mock_sess, mock_jwt):
        mock_jwt.return_value = {"sub": "user"}
        mock_sess.return_value.__aenter__.return_value = AsyncMock()
        mock_prof.return_value = {}
        
        # Mock Quiz Data
        mock_gen.return_value = ([{
            "id": "q1", "question_text": "Q1", "options": ["A"], 
            "correct_answer_index": 0, "difficulty": "easy", "points": 10
        }], None)

        request = MagicMock()
        request.user_id = "u1"
        request.num_questions = 5
        
        response = await self.service.GenerateLanguageQuiz(request, self.mock_context)
        
        self.assertTrue(response.quiz_id.startswith("quiz_"))
        self.assertEqual(len(response.questions), 1)

if __name__ == '__main__':
    unittest.main()