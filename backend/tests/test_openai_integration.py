"""
Integration tests for OpenAI services with realistic test data.
These tests require proper OpenAI API keys and make actual API calls.
"""

import pytest
import os
import io
import asyncio
import wave
import struct
import numpy as np
import sys
import inspect

# Add the parent directory to sys.path to import the service
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
sys.path.insert(0, parentdir)

from services.openai_service import speech_to_text, text_to_speech, process_text_with_gpt

# Check if integration tests should be run
SKIP_INTEGRATION_TESTS = os.environ.get("ENABLE_OPENAI_INTEGRATION_TESTS", "false").lower() != "true"
skip_integration = pytest.mark.skipif(
    SKIP_INTEGRATION_TESTS, 
    reason="OpenAI integration tests are disabled. Set ENABLE_OPENAI_INTEGRATION_TESTS=true to run them."
)

@pytest.fixture
def generate_audio_sample():
    """Generate a simple audio sample with spoken content."""
    def _generate(filename, duration=1.0, freq=440.0, text="Test audio."):
        """
        Generate a WAV file with a sine wave.
        
        Parameters:
        - filename: output filename
        - duration: in seconds
        - freq: sine wave frequency
        - text: documentation of what's "spoken" in this test audio
        """
        # Audio parameters
        sample_rate = 16000  # samples per second
        amplitude = 32767 / 2.0  # amplitude of the sine wave
        
        # Generate sine wave
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        audio_data = amplitude * np.sin(2 * np.pi * freq * t)
        
        # Convert to 16-bit PCM
        audio_bytes = struct.pack('h' * len(audio_data), *[int(x) for x in audio_data])
        
        # Write WAV file
        with wave.open(filename, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_bytes)
        
        # Read the file back as bytes
        with open(filename, 'rb') as f:
            return f.read()
            
    return _generate

@pytest.fixture(scope="module")
def test_audio_file(generate_audio_sample, tmp_path_factory):
    """Create a test audio file and return its path."""
    tmp_dir = tmp_path_factory.mktemp("audio")
    file_path = tmp_dir / "test_audio.wav"
    audio_bytes = generate_audio_sample(file_path)
    return audio_bytes

@pytest.mark.asyncio
class TestOpenAIIntegration:
    """Integration tests for OpenAI services that make actual API calls."""
    
    @skip_integration
    async def test_speech_to_text_integration(self):
        """Test transcribing speech to text with the real OpenAI API."""
        # This is a minimal test audio file
        sample_audio = b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
        
        # This will likely fail with a real sample since it's too short
        # But the API response structure should be valid
        result = await speech_to_text(sample_audio)
        
        # We only check the type, not content since the sample audio is invalid
        assert isinstance(result, str)
    
    @skip_integration
    async def test_text_to_speech_integration(self):
        """Test converting text to speech with the real OpenAI API."""
        test_text = "This is a test of the OpenAI text to speech integration."
        result = await text_to_speech(test_text)
        
        # Verify we got binary audio data back
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    @skip_integration
    async def test_gpt_integration_with_specific_prompt(self):
        """Test GPT with a specific prompt that should have a predictable answer."""
        test_prompt = "What is the capital of France? Answer with just the name of the city."
        result = await process_text_with_gpt(test_prompt)
        
        # The response should contain Paris (might have punctuation or other text)
        assert "Paris" in result
    
    @skip_integration
    async def test_end_to_end_audio_processing(self):
        """Test an end-to-end flow with GPT processing."""
        # First generate speech from text
        initial_text = "What's the weather like today?"
        speech_data = await text_to_speech(initial_text)
        
        # Then use speech-to-text to transcribe it
        transcribed_text = await speech_to_text(speech_data)
        
        # Then process with GPT
        gpt_response = await process_text_with_gpt(transcribed_text)
        
        # Finally convert the GPT response back to speech
        final_speech = await text_to_speech(gpt_response)
        
        # Verify all steps produced reasonable output
        assert isinstance(transcribed_text, str)
        assert len(transcribed_text) > 0
        assert isinstance(gpt_response, str)
        assert len(gpt_response) > 0
        assert isinstance(final_speech, bytes)
        assert len(final_speech) > 0

if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 