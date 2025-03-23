import pytest
import os
import io
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import inspect

# Add the parent directory to sys.path to import the service
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
sys.path.insert(0, parentdir)

from services.openai_service import speech_to_text, text_to_speech, process_text_with_gpt, client

# Check if we should run live API tests or only mocked tests
SKIP_LIVE_TESTS = os.environ.get("SKIP_OPENAI_TESTS", "False").lower() == "true"
skip_live = pytest.mark.skipif(
    SKIP_LIVE_TESTS, reason="Skipping tests that call the OpenAI API"
)

@pytest.fixture
def sample_audio_bytes():
    """Return sample audio bytes for testing."""
    # This is a very small audio file for testing
    return b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00'

@pytest.fixture
def mock_transcript_response():
    mock_response = MagicMock()
    mock_response.text = "This is a test transcript."
    return mock_response

@pytest.fixture
def mock_tts_response():
    mock_response = MagicMock()
    mock_response.content = b"test audio content"
    return mock_response

@pytest.fixture
def mock_chat_response():
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    mock_message.content = "This is a sample GPT response."
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]
    return mock_response

class TestOpenAIServiceMocked:
    """Tests for OpenAI service using mocked responses."""

    @pytest.mark.asyncio
    async def test_speech_to_text_mocked(self, sample_audio_bytes, mock_transcript_response):
        """Test speech to text conversion with mocked response."""
        mock_create = AsyncMock(return_value=mock_transcript_response)
        
        with patch.object(client.audio.transcriptions, 'create', mock_create):
            result = await speech_to_text(sample_audio_bytes)
            
            # Verify the API was called correctly
            assert mock_create.called
            args, kwargs = mock_create.call_args
            assert kwargs["model"] == "whisper-1"
            assert isinstance(kwargs["file"], io.BytesIO)
            
            # Verify the result
            assert result == "This is a test transcript."
    
    @pytest.mark.asyncio
    async def test_text_to_speech_mocked(self, mock_tts_response):
        """Test text to speech conversion with mocked response."""
        test_text = "Convert this text to speech."
        
        mock_create = AsyncMock(return_value=mock_tts_response)
        with patch.object(client.audio.speech, 'create', mock_create):
            result = await text_to_speech(test_text, voice="alloy")
            
            # Verify the API was called correctly
            assert mock_create.called
            args, kwargs = mock_create.call_args
            assert kwargs["model"] == "tts-1"
            assert kwargs["voice"] == "alloy"
            assert kwargs["input"] == test_text
            
            # Verify the result
            assert result == b"test audio content"
    
    @pytest.mark.asyncio
    async def test_process_text_with_gpt_mocked(self, mock_chat_response):
        """Test GPT text processing with mocked response."""
        test_text = "What is the capital of France?"
        
        mock_create = AsyncMock(return_value=mock_chat_response)
        with patch.object(client.chat.completions, 'create', mock_create):
            result = await process_text_with_gpt(test_text)
            
            # Verify the API was called correctly
            assert mock_create.called
            args, kwargs = mock_create.call_args
            assert kwargs["model"] == "gpt-3.5-turbo"
            assert kwargs["messages"][1]["content"] == test_text
            
            # Verify the result
            assert result == "This is a sample GPT response."

    @pytest.mark.asyncio
    async def test_empty_input_to_speech(self):
        """Test that empty input to text_to_speech returns empty bytes."""
        result = await text_to_speech("")
        assert result == b""

    @pytest.mark.asyncio
    async def test_empty_input_to_gpt(self):
        """Test that empty input to process_text_with_gpt returns empty string."""
        result = await process_text_with_gpt("")
        assert result == ""


class TestOpenAIServiceLive:
    """Tests for OpenAI service using actual API calls."""

    @pytest.mark.asyncio
    @skip_live
    async def test_speech_to_text_live(self, sample_audio_bytes):
        """Test speech to text using real API call."""
        # This test may not work with the sample bytes since they're not real audio
        # Use only when you have valid audio bytes
        result = await speech_to_text(sample_audio_bytes)
        assert isinstance(result, str)
        # We don't assert the content since it depends on the audio

    @pytest.mark.asyncio
    @skip_live
    async def test_text_to_speech_live(self):
        """Test text to speech using real API call."""
        test_text = "This is a test for the OpenAI text to speech API."
        result = await text_to_speech(test_text)
        assert isinstance(result, bytes)
        assert len(result) > 0  # The response should contain audio data

    @pytest.mark.asyncio
    @skip_live
    async def test_process_text_with_gpt_live(self):
        """Test GPT processing using real API call."""
        test_text = "What is the capital of France?"
        result = await process_text_with_gpt(test_text)
        assert isinstance(result, str)
        assert len(result) > 0  # Should return a non-empty response
        assert "Paris" in result  # The answer should contain "Paris"

if __name__ == "__main__":
    asyncio.run(pytest.main(["-xvs", __file__])) 