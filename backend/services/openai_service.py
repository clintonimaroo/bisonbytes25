from openai import AsyncOpenAI
from config import Config
import io

# Create an instance of the AsyncOpenAI client
client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)

async def speech_to_text(audio_data: bytes) -> str:
    """Convert speech audio to text using OpenAI Whisper"""
    if not audio_data or len(audio_data) < 10:
        print(f"Warning: Received empty or very small audio file ({len(audio_data) if audio_data else 0} bytes)")
        return ""
    
    audio_file = io.BytesIO(audio_data)
    
    # Try to determine the correct file extension from the first few bytes
    # This is a simplified magic number check
    header = audio_data[:4]
    
    # Default to webm which is common for browser recordings
    file_extension = "webm"
    
    # Check magic numbers for common audio formats
    if header.startswith(b'RIFF'):  # WAV files start with RIFF
        file_extension = "wav"
    elif header.startswith(b'ID3') or header.startswith(b'\xFF\xFB'):  # MP3 files often start with ID3 or MPEG frame sync
        file_extension = "mp3"
    elif header.startswith(b'OggS'):  # OGG files start with "OggS"
        file_extension = "ogg"
    
    print(f"Audio format detection: file_extension={file_extension}, first bytes={header!r}")
    audio_file.name = f"speech.{file_extension}"
    
    try:
        # Log the size of the audio data
        print(f"Audio data size: {len(audio_data)} bytes")
        
        # Reset the position of the BytesIO object to ensure we read from the beginning
        audio_file.seek(0)
        
        transcript = await client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file
        )
        return transcript.text
    except Exception as e:
        print(f"Speech-to-text error: {e}")
        return ""

async def text_to_speech(text: str, voice: str = "fable") -> bytes:
    """Convert text to speech using OpenAI TTS"""
    if not text.strip():
        return b""
        
    try:
        response = await client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=voice,
            input=text,
            instructions="""
            Voice Affect: Energetic and animated; dynamic with variations in pitch and tone.
            Tone: Excited and enthusiastic, conveying an upbeat and thrilling atmosphere. 
            Pacing: Rapid delivery when describing the game or key moments to convey intensity and build excitement.
            Slightly slower during dramatic pauses to let key points sink in.
            Emotion: Intensely focused, and excited. Giving off positive energy.
            Personality: Relatable and engaging. 
            Pauses: Short, purposeful pauses after key moments.
            """
        )
        # The response is already a bytes object in the new API
        return response.content
    except Exception as e:
        print(f"Text-to-speech error: {e}")
        return b""

async def process_text_with_gpt(text: str) -> str:
    """Process text using GPT model"""
    if not text.strip():
        return ""
    
    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Keep your responses concise."},
                {"role": "user", "content": text}
            ],
            max_tokens=200
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"GPT processing error: {e}")
        return text