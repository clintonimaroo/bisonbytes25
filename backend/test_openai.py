import asyncio
import argparse
import sys
import os
import wave
import numpy as np
import struct
from services.openai_service import speech_to_text, text_to_speech, process_text_with_gpt

async def test_gpt(text):
    """Test the GPT integration with a simple prompt."""
    print(f"Testing GPT with prompt: '{text}'")
    response = await process_text_with_gpt(text)
    print("\nGPT Response:")
    print("-" * 50)
    print(response)
    print("-" * 50)
    return response

async def test_text_to_speech(text, output_file="output.mp3"):
    """Test the text-to-speech functionality."""
    print(f"Converting text to speech: '{text}'")
    audio_bytes = await text_to_speech(text)
    
    # Save the audio to a file
    with open(output_file, "wb") as f:
        f.write(audio_bytes)
    
    print(f"Audio saved to {output_file} ({len(audio_bytes)} bytes)")
    return audio_bytes

async def test_speech_to_text(audio_file):
    """Test the speech-to-text functionality."""
    print(f"Converting speech to text from: {audio_file}")
    
    # Read the audio file
    with open(audio_file, "rb") as f:
        audio_data = f.read()
    
    text = await speech_to_text(audio_data)
    print("\nTranscribed Text:")
    print("-" * 50)
    print(text)
    print("-" * 50)
    return text

def generate_test_audio(filename="test_audio.wav", duration=3.0, freq=440.0):
    """Generate a test audio file with a simple sine wave."""
    print(f"Generating test audio file: {filename}")
    
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
    
    print(f"Generated test audio file: {filename}")
    return filename

async def test_all():
    """Run all tests in sequence."""
    # 1. Test GPT
    gpt_response = await test_gpt("What is the current time in New York?")
    print("\n")
    
    # 2. Test Text-to-Speech
    tts_output = "tts_output.mp3"
    await test_text_to_speech("This is a test of the OpenAI text-to-speech API integration.", tts_output)
    print("\n")
    
    # 3. Generate test audio and test Speech-to-Text
    # Note: This will likely not produce meaningful transcription since it's just a sine wave
    test_audio = generate_test_audio()
    await test_speech_to_text(test_audio)
    
    print("\nAll tests completed!")

async def main():
    parser = argparse.ArgumentParser(description="Test OpenAI integration")
    parser.add_argument("--gpt", help="Test GPT with the provided prompt")
    parser.add_argument("--tts", help="Test text-to-speech with the provided text")
    parser.add_argument("--tts-output", default="tts_output.mp3", help="Output file for text-to-speech test")
    parser.add_argument("--stt", help="Test speech-to-text with the provided audio file")
    parser.add_argument("--generate-audio", action="store_true", help="Generate a test audio file")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    if args.gpt:
        await test_gpt(args.gpt)
    elif args.tts:
        await test_text_to_speech(args.tts, args.tts_output)
    elif args.stt:
        await test_speech_to_text(args.stt)
    elif args.generate_audio:
        generate_test_audio()
    elif args.all:
        await test_all()
    else:
        print("No option specified. Use --help to see available options.")
        await test_all()

if __name__ == "__main__":
    asyncio.run(main()) 