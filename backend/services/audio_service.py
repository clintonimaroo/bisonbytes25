import asyncio
import io
import time
from services import openai_service

class AudioProcessor:
    def __init__(self, silence_threshold=0.1, silence_duration=1.0):
        self.buffer = bytearray()
        self.last_active_time = time.time()
        self.silence_threshold = silence_threshold
        self.silence_duration = silence_duration
        self.is_processing = False
        self.voice = "alloy"
        self.process_queue = asyncio.Queue()
        
    def add_audio_chunk(self, chunk):
        """Add new audio chunk to the buffer"""
        self.buffer.extend(chunk)
        self.last_active_time = time.time()
        
    def is_silence_detected(self):
        """Detect if there has been silence for enough time to process audio"""
        if len(self.buffer) == 0:
            return False
            
        current_time = time.time()
        return (current_time - self.last_active_time) > self.silence_duration
        
    async def process_audio(self):
        """Process the current audio buffer and return speech"""
        if len(self.buffer) == 0 or self.is_processing:
            return None
            
        self.is_processing = True
        
        try:
            audio_data = bytes(self.buffer)
            self.buffer = bytearray()  # Clear the buffer
            
            # Speech to text
            text = await openai_service.speech_to_text(audio_data)
            
            if not text:
                self.is_processing = False
                return None
                
            # Text to speech
            audio_response = await openai_service.text_to_speech(text, self.voice)
            
            self.is_processing = False
            return audio_response
        except Exception as e:
            print(f"Error processing audio: {e}")
            self.is_processing = False
            return None
            
    async def start_processing_loop(self, websocket):
        """Continuous processing loop for real-time audio"""
        while True:
            try:
                if self.is_silence_detected() and not self.is_processing:
                    audio_response = await self.process_audio()
                    if audio_response:
                        await websocket.send_bytes(audio_response)
                        
                await asyncio.sleep(0.1)  # Small delay to prevent CPU hogging
            except Exception as e:
                print(f"Processing loop error: {e}")
                await asyncio.sleep(1)  # Longer delay on error