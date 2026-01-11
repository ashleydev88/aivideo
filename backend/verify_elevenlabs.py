import os
import requests
from dotenv import load_dotenv

# Load env from the same directory
load_dotenv()

ELEVEN_LABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "aHCytOTnUOgfGPn5n89j" # From main.py

print(f"Checking API Key: {ELEVEN_LABS_API_KEY[:4]}...{ELEVEN_LABS_API_KEY[-4:] if ELEVEN_LABS_API_KEY else 'None'}")

if not ELEVEN_LABS_API_KEY:
    print("❌ API Key not found!")
    exit(1)

text = "Hello, this is a test."
url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {"xi-api-key": ELEVEN_LABS_API_KEY, "Content-Type": "application/json"}
payload = {"text": text, "model_id": "eleven_turbo_v2"}

try:
    print("Sending request to ElevenLabs...")
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if response.status_code == 200:
        print("✅ API Success! Audio content received.")
    else:
        print(f"❌ API Failed: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Connection Error: {e}")
