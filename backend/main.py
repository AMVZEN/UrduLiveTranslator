import os
import subprocess
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import easyocr
from google import genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global states
api_key = os.environ.get("GEMINI_API_KEY", "")
# Default model name from user request
model_name = "gemini-3-flash-preview"

# Initialize EasyOCR (CPU only)
print("Initializing EasyOCR for Urdu...")
reader = easyocr.Reader(['ur'], gpu=False)
print("EasyOCR initialized.")

class ConfigRequest(BaseModel):
    api_key: str
    model_name: str

@app.post("/config")
def update_config(config: ConfigRequest):
    global api_key, model_name
    api_key = config.api_key
    if config.model_name.strip():
        model_name = config.model_name.strip()
    return {"status": "success"}

@app.get("/config")
def get_config():
    return {"api_key": api_key, "model_name": model_name}

@app.post("/process")
def process_screenshot():
    global api_key, model_name
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key not configured. Please enter your Google Gemini API Key in the settings.")

    screenshot_path = "/tmp/urdu_translation_screenshot.png"
    
    # Run grim and slurp to capture a region
    try:
        # Get region from slurp
        slurp_output = subprocess.check_output(["slurp"], text=True).strip()
        if not slurp_output:
             raise Exception("No region selected")
        # Capture screenshot
        subprocess.check_call(["grim", "-g", slurp_output, screenshot_path])
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail="Screenshot capture was cancelled or failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Run EasyOCR
    try:
        results = reader.readtext(screenshot_path, detail=0)
        extracted_text = " ".join(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

    if not extracted_text.strip():
        return {"extracted_text": "", "translated_text": "No text detected in the selected region."}

    # Run Gemini Translation
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"Translate the following Urdu text to English. Provide ONLY the final English translation and nothing else:\n\n{extracted_text}"
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        translated_text = response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

    return {
        "extracted_text": extracted_text,
        "translated_text": translated_text
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
