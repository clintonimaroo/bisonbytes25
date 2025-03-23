from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from services.livekit_service import create_token, create_room_if_not_exists_sync
from services.audio_service import AudioProcessor
from models.schemas import TokenRequest, TokenResponse
import asyncio

router = APIRouter(prefix="/api/speech", tags=["speech"])

# Store active connections
active_processors = {}

@router.post("/token")
async def get_token(request: TokenRequest) -> TokenResponse:
    """Generate a LiveKit token for room access"""
    try:
        create_room_if_not_exists_sync(request.room_name)
        token = create_token(
            request.room_name, 
            request.participant_identity
        )
        return TokenResponse(token=token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/stream/{room_name}/{participant_id}")
async def websocket_endpoint(websocket: WebSocket, room_name: str, participant_id: str):
    await websocket.accept()
    
    # Create audio processor for this connection
    processor = AudioProcessor()
    connection_id = f"{room_name}:{participant_id}"
    active_processors[connection_id] = processor
    
    # Start the background processing task
    process_task = asyncio.create_task(processor.start_processing_loop(websocket))
    
    try:
        while True:
            # Receive audio chunks from client
            data = await websocket.receive_bytes()
            processor.add_audio_chunk(data)
    except WebSocketDisconnect:
        # Clean up on disconnect
        process_task.cancel()
        if connection_id in active_processors:
            del active_processors[connection_id]
    except Exception as e:
        print(f"WebSocket error: {e}")
        process_task.cancel()
        if connection_id in active_processors:
            del active_processors[connection_id]