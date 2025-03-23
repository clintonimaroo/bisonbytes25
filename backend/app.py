from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from routes.websocket_routes import router as websocket_router
from routes.speech_routes import router as speech_router
from routes.scraping_routes import router as scraping_router

app = FastAPI(title="Real-time Speech-to-Speech API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(websocket_router)
app.include_router(speech_router)
app.include_router(scraping_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)