from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.api.translation import translate_text
import logging

app = FastAPI()

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

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