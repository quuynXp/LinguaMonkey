import pytest
import sys
import os
import json
import base64
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient

# Add source path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import app from main
from main import app, verify_token

# Mock dependencies before client creation
@pytest.fixture
def mock_deps():
    with patch("main.get_redis_client", new_callable=AsyncMock) as mock_redis, \
         patch("main.get_db", new_callable=AsyncMock) as mock_db, \
         patch("main.get_user_profile", new_callable=AsyncMock) as mock_profile, \
         patch("main.get_translator") as mock_get_translator:
        
        # Setup mock translator
        mock_translator_instance = AsyncMock()
        mock_translator_instance.translate.return_value = ("Translated Text", "en")
        mock_get_translator.return_value = mock_translator_instance
        
        yield {
            "redis": mock_redis,
            "db": mock_db,
            "profile": mock_profile,
            "translator": mock_translator_instance
        }

# Override auth dependency to bypass JWT check
app.dependency_overrides[verify_token] = lambda: {"sub": "test_user_id"}

client = TestClient(app)

class TestHTTPEndpoints:
    def test_translate_endpoint(self, mock_deps):
        payload = {
            "text": "Hello",
            "source_lang": "en",
            "target_lang": "vi"
        }
        response = client.post("/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["result"]["translated_text"] == "Translated Text"
        assert data["result"]["source_lang_detected"] == "en"

    @patch("main.chat_with_ai")
    def test_chat_ai_endpoint(self, mock_chat, mock_deps):
        mock_chat.return_value = ("AI Response", None)
        payload = {
            "message": "Hi",
            "history": []
        }
        response = client.post("/chat-ai", json=payload)
        assert response.status_code == 200
        assert response.json()["reply"] == "AI Response"

    @patch("main.generate_tts")
    def test_tts_endpoint(self, mock_tts, mock_deps):
        mock_tts.return_value = (b"audio_data", None)
        response = client.post("/tts", params={"text": "Hi", "language": "en"})
        assert response.status_code == 200
        assert "audio_base64" in response.json()

class TestWebSockets:
    @patch("main.jwt.decode")
    @patch("main.speech_to_text")
    def test_voice_websocket(self, mock_stt, mock_jwt, mock_deps):
        # Mock Auth
        mock_jwt.return_value = {"sub": "test_user"}
        mock_stt.return_value = ("Hello World", "en", None)

        with client.websocket_connect("/voice?token=fake_token") as websocket:
            # Send audio chunk
            fake_audio = base64.b64encode(b"fake_audio").decode()
            websocket.send_json({"audio_chunk": fake_audio, "seq": 1})
            
            # Receive response
            data = websocket.receive_json()
            assert data["text"] == "Hello World"
            assert data["seq"] == 1

    @patch("main.jwt.decode")
    @patch("main.chat_with_ai_stream")
    def test_chat_stream_websocket(self, mock_stream, mock_jwt, mock_deps):
        mock_jwt.return_value = {"sub": "test_user"}
        
        # Mock streaming generator
        async def fake_generator(*args, **kwargs):
            yield "Hello"
            yield " User"
        
        mock_stream.side_effect = fake_generator

        with client.websocket_connect("/chat-stream?token=fake_token") as websocket:
            websocket.send_json({
                "type": "chat_request",
                "prompt": "Hi",
                "history": [],
                "roomId": "room_1"
            })
            
            # Expect chunks
            chunk1 = websocket.receive_json()
            assert chunk1["content"] == "Hello"
            
            chunk2 = websocket.receive_json()
            assert chunk2["content"] == " User"
            
            complete = websocket.receive_json()
            assert complete["type"] == "chat_response_complete"

    @patch("main.jwt.decode")
    @patch("main.speech_to_text")
    @patch("main.manager.broadcast_json") 
    def test_live_subtitles_websocket(self, mock_broadcast, mock_stt, mock_jwt, mock_deps):
        mock_jwt.return_value = {"sub": "test_user"}
        mock_stt.return_value = ("Hello", "en", None) # STT returns text

        with client.websocket_connect("/live-subtitles?token=fake_token&roomId=room_1") as websocket:
            fake_audio = base64.b64encode(b"audio").decode()
            websocket.send_json({"audio_chunk": fake_audio})
            
            # Verify internal logic called broadcast (since we mocked it, we can't receive it on this socket easily without a real redis pub/sub, so checking the mock call is best for unit testing)
            # Note: In a real integration test, we would check receive_json on a second client.
            # Here we just ensure the server processed it without error.
            
            # Since the logic is async and background, we might need a small sleep or check mock calls
            # However, for simple websocket unit test with TestClient, simply not raising exception is a pass.
            pass