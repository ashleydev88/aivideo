import os
import time
import uuid
import requests
import traceback
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, BackgroundTasks, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from openai import OpenAI
from openai import OpenAI
import replicate
from dotenv import load_dotenv
import utils.parser as parser
import json
import math

# --- MOVIEPY IMPORTS ---
# Ensure you have run: pip install "moviepy<2.0"
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips

# 1. LOAD SECRETS
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# --- CONFIGURATION ---
VOICE_ID = "aHCytOTnUOgfGPn5n89j" 

# --- STYLE ---
STYLE_PROMPT = (
    "A sophisticated corporate illustration in a semi-realistic, hand-drawn aesthetic. "
    "The style features distinct, expressive charcoal or ink outlines combined with soft, textured watercolor-style coloring. "
    "The palette is restrained and professional: primarily navy blues, cool greys, and crisp whites, with selective warm accents of mustard yellow and beige. "
    "Backgrounds are often simplified, airy, or fade into a white vignette. "
    "The overall look is polished yet human, evocative of high-end editorial illustrations for business technology. "
    "Scenes can depict diverse professionals, office environments, or metaphorical objects (diagrams, devices, tools) as appropriate."
)

app = FastAPI()
client = OpenAI(api_key=OPENAI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CourseRequest(BaseModel):
    topic: str

class PlanRequest(BaseModel):
    policy_text: str
    duration: int # Minutes

class ScriptRequest(BaseModel):
    topics: list[str]
    style: str
    duration: int # Minutes
    title: str = "Untitled Course" # New field with default

# --- HELPERS ---
def upload_asset(file_content, filename, content_type):
    if not file_content: return None 
    bucket = "course-assets"
    path = f"{uuid.uuid4()}/{filename}"
    try:
        supabase.storage.from_(bucket).upload(path=path, file=file_content, file_options={"content-type": content_type})
        return supabase.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        print(f"❌ Supabase Upload Error: {e}")
        return None

def generate_audio(text):
    print(f"   🎙️ Generating audio...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": ELEVEN_LABS_API_KEY, "Content-Type": "application/json"}
    payload = {"text": text, "model_id": "eleven_turbo_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code == 200: return response.content
    except Exception as e:
        print(f"   ❌ ElevenLabs Error: {e}")
    return None

def generate_image_imagen(prompt):
    print(f"   🎨 Generating image (Imagen 4 Fast)...")
    try:
        output = replicate.run("google/imagen-4-fast", input={"prompt": prompt, "aspect_ratio": "16:9", "safety_filter_level": "block_only_high", "output_format": "jpg"})
        image_url = output.url if hasattr(output, 'url') else str(output)
        return requests.get(image_url).content
    except Exception as e:
        print(f"   ❌ Replicate/Imagen Error: {e}")
    return None

# --- ROBUST FONT MANAGER ---
def get_fonts():
    fonts_dir = tempfile.gettempdir()
    regular_path = os.path.join(fonts_dir, "Roboto-Regular-v50.ttf")
    bold_path = os.path.join(fonts_dir, "Roboto-Bold-v50.ttf")

    # Correct URLs for Apache-licensed Roboto
    # Updated URLs for Roboto v50 (Verified)
    r_url = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf" 
    b_url = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf"

    def download_font(url, path):
        # Only download if missing or empty
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            print(f"   ⬇️ Downloading Font: {os.path.basename(path)}...")
            try:
                resp = requests.get(url)
                if resp.status_code == 200:
                    with open(path, "wb") as f:
                        f.write(resp.content)
                else:
                    return False
            except Exception as e:
                print(f"   ⚠️ Font download error: {e}")
                return False
        return True

    r_ok = download_font(r_url, regular_path)
    b_ok = download_font(b_url, bold_path)

    if not r_ok or not b_ok:
        return None, None
    return regular_path, bold_path

# --- VISUAL GENERATOR (Layout Aware) ---
def render_slide_visual(image_path, text_content, layout="split"):
    # 1. Setup Canvas (1920x1080)
    canvas = Image.new('RGB', (1920, 1080), '#f8fafc') # Slate-50 background (clean white/grey)
    draw = ImageDraw.Draw(canvas)
    
    # Fonts Load
    reg_path, bold_path = get_fonts()
    try:
        if reg_path and bold_path:
            # Adjust sizes based on layout
            base_size = 50 if layout == "split" else 60
            title_size = 80 if layout == "split" else 100
            
            title_font = ImageFont.truetype(bold_path, title_size) 
            body_font = ImageFont.truetype(reg_path, base_size)
            quote_font = ImageFont.truetype(reg_path, base_size) # Could be Italic if available
        else:
            raise OSError("Fonts missing")
    except OSError:
        print("   ⚠️ Using default font (fonts failed to load).")
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        quote_font = ImageFont.load_default()

    # 2. Process Image
    if layout in ["split", "image_only"] and image_path:
        try:
            img = Image.open(image_path)
            
            if layout == "image_only":
                # Fullscreen
                img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
                canvas.paste(img, (0, 0))
                # Fall through to save at the end
                
            elif layout == "split":
                # Right Half
                ratio = 1080 / img.height
                new_size = (int(img.width * ratio), 1080)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                left = (img.width - 960) / 2
                img = img.crop((left, 0, left + 960, 1080))
                canvas.paste(img, (960, 0))
                
        except Exception as e:
            print(f"   ⚠️ Image processing warning: {e}")

    # 3. Process Text (Markdown Lite)
    # Modes: Split (Left side), Text Only (Centered)
    
    if text_content and layout != "image_only": # Double check
        text_color = "#0f172a" # Slate-900 (Dark)
        accent_color = "#2563eb" # Blue-600
        quote_color = "#475569" # Slate-600
        
        lines = text_content.split('\n')
        
        # Coordinates
        if layout == "split":
            x_margin = 120
            y_cursor = 240
            max_width = 20 # Adjusted for 80px font (approx 17-20 chars fit in 800px)
        else: # text_only
            x_margin = 200
            y_cursor = 200 # Start higher
            max_width = 28 # Adjusted for 100px font (approx 25-30 chars fit in 1500px)
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line: continue
            
            # --- Markdown Lite Parser ---
            
            # Header (#)
            if line.startswith("#"):
                clean_line = line.lstrip("#").strip()
                wrapper = textwrap.TextWrapper(width=int(max_width//1.5)) 
                header_lines = wrapper.wrap(clean_line)
                
                for h_line in header_lines:
                    draw.text((x_margin, y_cursor), h_line, font=title_font, fill=text_color)
                    y_cursor += (title_font.size * 1.2)
                
                # Underline
                y_cursor += 20
                draw.rectangle([x_margin, y_cursor, x_margin + 120, y_cursor + 8], fill=accent_color)
                y_cursor += 60
                
            # Quote (>)
            elif line.startswith(">") or line.startswith('"'):
                clean_line = line.lstrip(">").strip('"').strip()
                wrapper = textwrap.TextWrapper(width=max_width)
                wrapped = wrapper.wrap(clean_line)
                
                # Draw a bar on left
                draw.rectangle([x_margin - 30, y_cursor, x_margin - 20, y_cursor + (len(wrapped) * 70)], fill=accent_color)
                
                for w_line in wrapped:
                    draw.text((x_margin, y_cursor), w_line, font=quote_font, fill=quote_color) # Italic logic implied
                    y_cursor += (body_font.size * 1.4)
                y_cursor += 40

            # Standard Bullet / Text
            else:
                clean_line = line.replace("-", "").strip()
                wrapper = textwrap.TextWrapper(width=max_width)
                wrapped = wrapper.wrap(clean_line)
                
                # Bullet
                if line.startswith("-") and reg_path:
                    draw.text((x_margin - 40, y_cursor), "•", font=body_font, fill=accent_color)
                
                for w_line in wrapped:
                    draw.text((x_margin, y_cursor), w_line, font=body_font, fill=text_color)
                    y_cursor += (body_font.size * 1.4)
                
                y_cursor += 30

    # Save
    output_path = image_path.replace(".jpg", "_rendered.jpg")
    canvas.save(output_path)
    return output_path


# --- WORKER 1: DRAFT COURSE GENERATION ---
# --- WORKER 1: DRAFT COURSE GENERATION ---
def generate_course_assets(course_id: str, script_plan: list, style_prompt: str):
    print(f"🚀 Starting Course Gen: {course_id}")
    
    final_slides = []
    
    for i, slide in enumerate(script_plan):
        supabase.table("courses").update({"status": f"Drafting Slide {i+1} of {len(script_plan)}..."}).eq("id", course_id).execute()
        
        # 1. Audio
        audio_data = generate_audio(slide["text"])
        audio_filename = f"narration_{i}_{int(time.time())}.mp3" # Timestamp to avoid collisions
        audio_url = upload_asset(audio_data, audio_filename, "audio/mpeg")
        
        # 2. Image
        full_prompt = f"{style_prompt}. {slide['prompt']}"
        image_data = generate_image_imagen(full_prompt)
        image_filename = f"visual_{i}_{int(time.time())}.jpg"
        image_url = upload_asset(image_data, image_filename, "image/jpeg")
        
        final_slides.append({
            "id": i + 1,
            "image": image_url,
            "audio": audio_url,
            "visual_text": slide.get("visual_text", ""),
            "duration": slide.get("duration", 15000),
            "layout": slide.get("layout", "split")
        })

    supabase.table("courses").update({"slide_data": final_slides, "status": "completed"}).eq("id", course_id).execute()
    print("✅ Draft Course Completed")


# --- WORKER 2: VIDEO EXPORT (CLEAN SPLIT SCREEN) ---
def compile_video_job(course_id: str):
    print(f"🎬 Starting Compilation: {course_id}")
    try:
        res = supabase.table("courses").select("slide_data").eq("id", course_id).execute()
        if not res.data: return
        slides = res.data[0]['slide_data']

        with tempfile.TemporaryDirectory() as temp_dir:
            clips = []
            
            for i, slide in enumerate(slides):
                print(f"   ⚡ Processing Slide {i+1}...")
                
                # 1. Download Background Image
                bg_path = os.path.join(temp_dir, f"bg_{i}.jpg")
                download_ok = False
                if slide.get('image'):
                    try:
                        resp = requests.get(slide['image'])
                        if resp.status_code == 200:
                            with open(bg_path, 'wb') as f:
                                f.write(resp.content)
                            download_ok = True
                    except Exception as e:
                        print(f"   ⚠️ Image download error: {e}")
                
                if not download_ok:
                    print(f"   ⚠️ Using fallback image for Slide {i+1}")
                    Image.new('RGB', (1920, 1080), '#f8fafc').save(bg_path)
                
                # 2. Apply Custom Layout
                layout = slide.get('layout', 'split')
                # Even "image_only" goes through render_slide_visual to get the full size check/resize
                bg_path = render_slide_visual(bg_path, slide.get('visual_text'), layout)

                # 3. Download Audio
                audio_path = os.path.join(temp_dir, f"audio_{i}.mp3")
                has_audio = False
                if slide.get('audio'):
                    try:
                        resp = requests.get(slide['audio'])
                        if resp.status_code == 200:
                            with open(audio_path, 'wb') as f:
                                f.write(resp.content)
                            has_audio = True
                    except Exception as e:
                        print(f"   ⚠️ Audio download error: {e}")

                # 4. Create Video Clip
                # Simple and robust: Image + Audio
                if has_audio:
                    audio_clip = AudioFileClip(audio_path)
                    duration = audio_clip.duration
                    image_clip = ImageClip(bg_path).set_duration(duration)
                    image_clip = image_clip.set_audio(audio_clip)
                else:
                    print(f"   ⚠️ Missing audio for Slide {i+1}, using default duration.")
                    duration = slide.get('duration', 15000) / 1000.0
                    image_clip = ImageClip(bg_path).set_duration(duration)

                clips.append(image_clip)

            # 5. Concatenate & Render
            print("   🎞️ Rendering Final Video...")
            # method="compose" ensures they are stitched cleanly
            final_video = concatenate_videoclips(clips, method="compose")
            
            output_path = os.path.join(temp_dir, "final_course.mp4")
            final_video.write_videofile(
                output_path, 
                fps=24, 
                codec="libx264", 
                audio_codec="aac",
                logger=None # Keeps console cleaner
            )

            # 6. Upload
            print("   ☁️ Uploading to Supabase...")
            with open(output_path, 'rb') as f:
                video_url = upload_asset(f.read(), f"full_course_{course_id}.mp4", "video/mp4")

            supabase.table("courses").update({"video_url": video_url}).eq("id", course_id).execute()
            print(f"✅ Video Ready: {video_url}")

    except Exception as e:
        print(f"❌ Compilation Failed: {traceback.format_exc()}")

# --- ROUTES ---
@app.post("/create")
async def create_course(request: CourseRequest, background_tasks: BackgroundTasks):
    response = supabase.table("courses").insert({}).execute()
    course_id = response.data[0]['id']
    background_tasks.add_task(generate_disciplinary_course, course_id)
    return {"status": "started", "course_id": course_id}

@app.get("/status/{course_id}")
async def get_status(course_id: str):
    response = supabase.table("courses").select("*").eq("id", course_id).execute()
    data = response.data[0]
    return {"status": data.get("status", "processing"), "data": data.get("slide_data"), "video_url": data.get("video_url")}

@app.get("/history")
async def get_history():
    response = supabase.table("courses").select("id, created_at, status, name, metadata").eq("status", "completed").order("created_at", desc=True).limit(10).execute()
    return response.data

@app.post("/export-video/{course_id}")
async def export_video(course_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(compile_video_job, course_id)
    return {"status": "export_started"}

# --- NEW ENDPOINTS (DYNAMIC FLOW) ---

@app.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...)):
    print(f"📂 Uploading policy: {file.filename}")
    content = await file.read()
    text = parser.extract_text_from_file(content, file.filename)
    return {"text": text}

@app.post("/generate-plan")
async def generate_plan(request: PlanRequest):
    print("🧠 Generating Topic Plan...")
    prompt = (
        f"Review the following policy document text and create a concise learning path/topic list for a {request.duration} minute video course. "
        f"Also generate a catchy, professional title for the course. "
        f"The topics should be ordered logically from introduction to conclusion. "
        f"Prioritize the most critical information suitable for the duration. "
        f"Output a JSON object with keys: \n"
        f"- 'topics': list of strings\n"
        f"- 'title': string (max 60 chars)\n\n"
        f"Policy Text:\n{request.policy_text}" # Full document
    )
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        # Parse JSON from response
        res_text = completion.choices[0].message.content
        data = json.loads(res_text)
        topics = data.get("topics", data.get("list", [])) 
        title = data.get("title", "New Course")
        
        # Fallback if model returns just the list in root
        if not topics and isinstance(data, list):
             topics = data
             
        return {"topics": topics, "title": title}
    except Exception as e:
        print(f"❌ Planning Error: {e}")
        return {"topics": ["Introduction", "Key Policy Points", "Compliance", "Summary"], "title": "Policy Overview"} # Fallback

@app.post("/generate-script")
async def generate_script(request: ScriptRequest, background_tasks: BackgroundTasks):
    print("✍️ Generating Full Script...")
    
    # Calculate approx slide count (3 mins = 180s. 15s per slide = 12 slides)
    target_slides = request.duration * 4 
    
    prompt = (
        f"Create a detailed video course script based on these topics: {request.topics}. "
        f"The course duration is {request.duration} minutes. "
        f"Target approximately {target_slides} slides/scenes. "
        f"The tone should be professional, engaging, and clear. \n"
        f"Input Rules:\n"
        f"1. VISUAL LAYOUTS: Distribute slide layouts approximately: 70% 'split' (text left, image right), 15% 'text_only' (big centered text), 15% 'image_only' (full screen visual, no text). Choose 'text_only' for strong statements and 'image_only' for impactful visual moments.\n"
        f"2. VISUAL TEXT: Use markdown for text. Use '#' for Main Headers, quote marks '\"' or '>' for quotes, and '-' for list items.\n"
        f"3. IMAGERY: Varied subjects (minimalist people, close-ups of objects like laptops/documents, abstract flow charts, office settings). Do not just show people talking.\n\n"
        f"Output a JSON object with a key 'script' containing a list of objects. Each object must have:\n"
        f"- 'text': The spoken narration (approx 30-40 words per slide).\n"
        f"- 'visual_text': The formatted text to appear on screen (markdown supported).\n"
        f"- 'layout': One of ['split', 'text_only', 'image_only'].\n"
        f"- 'prompt': A detailed, creative image generation prompt matching the scene description. \n"
        f"- 'duration': Duration in milliseconds (approx 15000).\n"
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        res_text = completion.choices[0].message.content
        data = json.loads(res_text)
        script_plan = data.get("script", [])
        
        # Create DB Entry
        response = supabase.table("courses").insert({
            "status": "generating_script", 
            "name": request.title,
            "metadata": {"topics": request.topics, "style": request.style}
        }).execute()
        course_id = response.data[0]['id']
        
        # Determine Style Prompt
        style_prompt = STYLE_PROMPT # Default
        if request.style == "Business Illustration":
            style_prompt = STYLE_PROMPT
        # Future styles can be added here
        
        # Start Background Job
        background_tasks.add_task(generate_course_assets, course_id, script_plan, style_prompt)
        
        return {"status": "started", "course_id": course_id}
        
    except Exception as e:
        print(f"❌ Script Generation Error: {e}")
        return {"status": "error", "message": str(e)}