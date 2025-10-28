from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import base64, json
from src.api.translation import translate_text
import logging

app = FastAPI()

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

@app.websocket("/ws/voice")
async def voice_stream(websocket: WebSocket, token: str):
    await websocket.accept()
    print("Client connected")

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            audio_chunk = base64.b64decode(msg["audio_chunk"]) if msg["audio_chunk"] else b""
            # TODO: xử lý Whisper stream, gửi kết quả về:
            await websocket.send_text(json.dumps({"seq": msg["seq"], "text": "partial transcript"}))
    except WebSocketDisconnect:
        print("Client disconnected")

@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        translated_text, error = translate_text(request.text, request.source_lang, request.target_lang)
        if error:
            raise HTTPException(status_code=500, detail=error)
        return {"translated_text": translated_text}
    except Exception as e:
        logging.error(f"REST API translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host="0.0.0.0", port=8000)