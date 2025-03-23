from pydantic import BaseModel
from typing import Optional

class SpeechRequest(BaseModel):
    audio_data: bytes
    process_text: bool = False
    room_name: str
    participant_identity: str
    voice: str = "alloy"

class TokenRequest(BaseModel):
    room_name: str
    participant_identity: str
    
class TokenResponse(BaseModel):
    token: str