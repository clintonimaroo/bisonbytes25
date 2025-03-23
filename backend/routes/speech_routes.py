from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from models.schemas import TokenRequest, TokenResponse, SpeechRequest
# Temporarily comment out livekit_service
from services import openai_service
# from services import openai_service, livekit_service
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/api/speech", tags=["speech"])

# Temporarily disable token endpoint
"""
@router.post("/token")
async def get_token(request: TokenRequest) -> TokenResponse:
    # Generate a LiveKit token for room access
    try:
        # Use the synchronous wrapper
        livekit_service.create_room_if_not_exists_sync(request.room_name)
        token = livekit_service.create_token(
            request.room_name, 
            request.participant_identity
        )
        return TokenResponse(token=token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""

@router.post("/process")
async def process_speech(
    audio: UploadFile = File(...),
    room_name: str = None,
    participant_identity: str = None,
    process_text: bool = False,
    voice: str = "alloy"
):
    """
    Process speech: audio → text → (optional processing) → speech
    Returns audio that can be streamed to the client
    """
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Speech to text
        text = await openai_service.speech_to_text(audio_data)
        
        # Optional text processing
        if process_text:
            text = await openai_service.process_text_with_gpt(text)
        
        # Text to speech
        audio_response = await openai_service.text_to_speech(text, voice)
        
        # Return audio as streamable response
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gpt")
async def process_with_gpt(request: dict):
    """Process text with GPT and return the response"""
    try:
        text = request.get("text") or request.get("prompt")
        if not text:
            raise HTTPException(status_code=400, detail="Text or prompt is required")
        
        response = await openai_service.process_text_with_gpt(text)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
async def text_to_speech(request: dict):
    """Convert text to speech"""
    try:
        text = request.get("text")
        voice = request.get("voice", "alloy")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        audio_response = await openai_service.text_to_speech(text, voice)
        
        return StreamingResponse(
            io.BytesIO(audio_response),
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_speech(file: UploadFile = File(...)):
    """Transcribe speech to text"""
    try:
        # Log the file info
        print(f"Received file: {file.filename}, content-type: {file.content_type}")
        
        # Ensure the filename has a supported extension
        original_filename = file.filename
        file_extension = original_filename.split('.')[-1].lower() if '.' in original_filename else None
        
        supported_extensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
        
        # Handle codecs in content type
        content_type = file.content_type or ""
        if "opus" in content_type and file_extension == "opus":
            print("Converting opus extension to webm for better compatibility")
            file_extension = "webm"
        
        # Read the audio data
        audio_data = await file.read()
        
        if not audio_data or len(audio_data) < 10:
            print(f"Warning: Received empty audio file (size: {len(audio_data) if audio_data else 0} bytes)")
            raise HTTPException(status_code=400, detail="Empty or invalid audio file")
            
        # Transcribe the audio
        text = await openai_service.speech_to_text(audio_data)
        
        if not text:
            print(f"Warning: No transcription result (audio size: {len(audio_data)} bytes)")
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try speaking more clearly.")
            
        print(f"Successfully transcribed audio: '{text}'")
        return {"text": text}
    except HTTPException as e:
        # Re-raise HTTP exceptions with their original status codes
        print(f"HTTP Exception in transcribe_speech: {e.status_code}: {e.detail}")
        raise
    except Exception as e:
        print(f"Error in transcribe_speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))