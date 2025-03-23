from livekit import api
from config import Config
import asyncio

def create_token(room_name: str, participant_identity: str) -> str:
    """Create a LiveKit token for room access"""
    token = api.AccessToken(
        api_key=Config.LIVEKIT_API_KEY,
        api_secret=Config.LIVEKIT_API_SECRET
    )
    
    token = token.with_identity(participant_identity) \
        .with_name(participant_identity) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name
        ))
    
    return token.to_jwt()

async def create_room_if_not_exists(room_name: str):
    """Create a LiveKit room if it doesn't exist"""
    lkapi = api.LiveKitAPI(
        url=Config.LIVEKIT_URL,
        api_key=Config.LIVEKIT_API_KEY,
        api_secret=Config.LIVEKIT_API_SECRET
    )
    
    try:
        await lkapi.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=300,  # 5 minutes
                max_participants=10
            )
        )
    except Exception:
        # Room already exists
        pass
    finally:
        await lkapi.aclose()

def create_room_if_not_exists_sync(room_name: str):
    """Synchronous wrapper for create_room_if_not_exists"""
    asyncio.run(create_room_if_not_exists(room_name))