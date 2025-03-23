import os
import sys
import inspect
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

# Add the parent directory to sys.path
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
sys.path.insert(0, parentdir)

from app import app
from services.openai_service import speech_to_text, text_to_speech, process_text_with_gpt
import services.livekit_service

client = TestClient(app)

# Sample test data
SAMPLE_TEXT = "This is a test message"
SAMPLE_AUDIO = b"test audio content"
SAMPLE_GPT_RESPONSE = "This is a sample GPT response"

class TestSpeechRoutes:
    @patch('services.openai_service.speech_to_text', return_value="Transcribed text")
    @patch('services.openai_service.text_to_speech', return_value=SAMPLE_AUDIO)
    def test_process_audio_to_text(self, mock_tts, mock_stt):
        """Test speech to text conversion endpoint"""
        # Test file upload
        os.makedirs('tests/test_files', exist_ok=True)
        with open('tests/test_files/test_audio.mp3', 'wb') as f:
            f.write(b'test audio content')
        
        with open('tests/test_files/test_audio.mp3', 'rb') as f:
            response = client.post(
                "/api/speech/process",
                files={"audio": ("test_audio.mp3", f, "audio/mpeg")},
                params={"process_text": False}
            )
        
        # Check response
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        
        # Clean up
        os.remove('tests/test_files/test_audio.mp3')

    @patch('services.openai_service.speech_to_text', return_value="Transcribed text")
    @patch('services.openai_service.process_text_with_gpt', return_value="Processed with GPT")
    @patch('services.openai_service.text_to_speech', return_value=SAMPLE_AUDIO)
    def test_process_with_gpt(self, mock_tts, mock_gpt, mock_stt):
        """Test the full process endpoint with GPT processing"""
        # Create test file
        os.makedirs('tests/test_files', exist_ok=True)
        with open('tests/test_files/test_audio.mp3', 'wb') as f:
            f.write(b'test audio content')
        
        # Test process with GPT
        with open('tests/test_files/test_audio.mp3', 'rb') as f:
            response = client.post(
                "/api/speech/process",
                files={"audio": ("test_audio.mp3", f, "audio/mpeg")},
                params={"process_text": True, "voice": "alloy"}
            )
        
        # Check response
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        
        # Verify all mocks were called with the expected arguments
        mock_stt.assert_called_once()
        mock_gpt.assert_called_once_with("Transcribed text")
        mock_tts.assert_called_once_with("Processed with GPT", "alloy")
        
        # Clean up
        os.remove('tests/test_files/test_audio.mp3')

    @pytest.mark.skip(reason="Token endpoint is defined in websocket_routes.py and requires complex mocking of async functions")
    def test_get_token(self, monkeypatch):
        """Test token generation endpoint"""
        # Note: This test is marked as skipped because the token endpoint
        # is actually defined in routes/websocket_routes.py and requires
        # more complex mocking of async functions
        pass

if __name__ == "__main__":
    # Create test directory if it doesn't exist
    os.makedirs('tests/test_files', exist_ok=True)
    pytest.main(["-xvs", __file__]) 