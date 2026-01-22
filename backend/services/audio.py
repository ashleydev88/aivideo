import requests
import os
import base64
from backend.config import ELEVEN_LABS_API_KEY, VOICE_ID

def generate_audio(text):
    print(f"   🎙️ Generating audio...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps"
    headers = {"xi-api-key": ELEVEN_LABS_API_KEY, "Content-Type": "application/json"}
    payload = {
        "text": text, 
        "model_id": "eleven_flash_v2_5", 
        "voice_settings": {
            "stability": 0.5, 
            "similarity_boost": 0.75,
            "speed": 0.9
        }
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code == 200: 
            data = response.json()
            # ElevenLabs returns base64 audio and alignment info in JSON for this endpoint
            audio_base64 = data.get("audio_base64")
            alignment = data.get("alignment")
            
            if audio_base64:
                return base64.b64decode(audio_base64), alignment
            else:
                print("   ❌ ElevenLabs Response missing audio_base64")
        else:
            print(f"   ❌ ElevenLabs API Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ ElevenLabs Connection Error: {e}")
    return None, None
