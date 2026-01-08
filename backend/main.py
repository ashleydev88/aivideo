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
from anthropic import Anthropic
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

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# --- CONFIGURATION ---
VOICE_ID = "aHCytOTnUOgfGPn5n89j" 

# --- CONFIGURATION FLAGS ---
ENABLE_SCRIPT_VALIDATION = True  # Set to False to skip validation 

# --- STYLE ---
STYLE_PROMPT = (
    "A sophisticated corporate illustration in a semi-realistic, hand-drawn aesthetic. "
    "The style features distinct, expressive charcoal or ink outlines combined with soft, textured watercolor-style coloring. "
    "The palette is restrained and professional: primarily navy blues, cool greys, and crisp whites, with selective warm accents of mustard yellow and beige. "
    "Backgrounds are often simplified, airy, or fade into a white vignette. "
    "The overall look is polished yet human, evocative of high-end editorial illustrations for business technology. "
    "Scenes can depict diverse professionals, office environments, or metaphorical objects (diagrams, devices, tools) as appropriate."
)

# --- DURATION STRATEGIES ---
DURATION_STRATEGIES = {
    3: {
        "purpose": "Executive briefing - need to know NOW",
        "topic_count": "3-4 essential topics",
        "slide_range": "8-12 slides",
        "avg_slide_duration": "18-22 seconds",
        "depth_level": "Surface - what, why, critical actions only",
        "focus": "Compliance essentials, immediate actions, biggest risks",
        "slides_per_topic": "2-3 slides per topic",
        "content_priorities": ["Must-know compliance requirements", "Immediate actions required", "Biggest consequences of non-compliance"]
    },
    5: {
        "purpose": "Quick orientation - foundational understanding",
        "topic_count": "4-5 core topics",
        "slide_range": "13-18 slides",
        "avg_slide_duration": "18-24 seconds",
        "depth_level": "Foundational - what, why, basic how",
        "focus": "Core concepts, basic procedures, common scenarios",
        "slides_per_topic": "3-4 slides per topic",
        "content_priorities": ["Key policy principles", "Basic procedures", "Most common scenarios", "Where to get help"]
    },
    10: {
        "purpose": "Comprehensive training - working knowledge",
        "topic_count": "6-8 key topics",
        "slide_range": "28-35 slides",
        "avg_slide_duration": "18-25 seconds",
        "depth_level": "Applied - what, why, how, with examples",
        "focus": "Detailed procedures, multiple examples, practical application",
        "slides_per_topic": "4-5 slides per topic",
        "content_priorities": ["Complete procedures step-by-step", "Real-world examples", "Common mistakes to avoid", "Decision-making frameworks"]
    },
    15: {
        "purpose": "Deep dive - mastery level",
        "topic_count": "8-11 detailed topics",
        "slide_range": "42-52 slides",
        "avg_slide_duration": "18-28 seconds",
        "depth_level": "Comprehensive - what, why, how, when, edge cases",
        "focus": "All aspects covered, edge cases, decision trees, complex scenarios",
        "slides_per_topic": "5-6 slides per topic",
        "content_priorities": ["All procedures in detail", "Edge cases and exceptions", "Complex scenarios", "Integration with other policies", "Legal/regulatory context"]
    },
    20: {
        "purpose": "Expert certification - complete mastery",
        "topic_count": "10-13 comprehensive topics",
        "slide_range": "55-68 slides",
        "avg_slide_duration": "18-30 seconds",
        "depth_level": "Exhaustive - everything including rare situations, legal context, interconnections",
        "focus": "Exhaustive coverage, rare scenarios, legal nuances, cross-policy implications",
        "slides_per_topic": "5-7 slides per topic",
        "content_priorities": ["Exhaustive policy coverage", "Rare and complex scenarios", "Legal and regulatory details", "Cross-policy interactions", "Advanced decision-making", "Change management"]
    }
}

app = FastAPI()
client = Anthropic(api_key=ANTHROPIC_API_KEY)
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

class Topic(BaseModel):
    id: int
    title: str
    purpose: str
    key_points: list[str]
    complexity: str = "moderate" # Default
    estimated_slides: int = 3 # Default
    depth_notes: str = "" # Default

class ScriptRequest(BaseModel):
    topics: list[Topic]
    style: str
    duration: int # Minutes
    title: str = "Untitled Course"
    policy_text: str # Added for context
    learning_objective: str # Added for context

# --- HELPERS ---
def extract_json_from_response(text_content):
    """
    Robustly extract JSON from a model response which may contain markdown code blocks or other text.
    """
    try:
        # Try direct parsing first
        return json.loads(text_content)
    except json.JSONDecodeError:
        pass

    # Clean up markdown code blocks
    cleaned_text = text_content.strip()
    if "```json" in cleaned_text:
        cleaned_text = cleaned_text.split("```json")[1].split("```")[0]
    elif "```" in cleaned_text:
        cleaned_text = cleaned_text.split("```")[1].split("```")[0]
    
    cleaned_text = cleaned_text.strip()
    
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        print(f"❌ JSON Parsing Failed. Raw content sample: {text_content[:200]}...")
        raise

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


def validate_script(script_output, context_package):
    """
    Validates script quality before proceeding to media generation.
    Returns: dict with 'approved' (bool), 'issues' (list), 'suggestions' (list)
    """
    print("   🕵️ Validating Script Quality...")
    
    validation_prompt = f"""
You are a quality assurance reviewer for e-learning content.

Review this video script and check:

1. COMPLETENESS: Does it cover the key points from the topics? (List any gaps)
2. COHERENCE: Does each slide transition logically? (Flag jarring jumps)
3. ACCURACY: Are there specific policy details, or just generic advice? (Rate 1-10)
4. IMAGE DIVERSITY: Are image prompts varied and specific? (Flag repetitive prompts)
5. DURATION: Does the math check out? (Sum of all slide durations should be within -5% to +15% of total target duration {context_package['duration']}min). note: Individual slides can range 10s-60s.

TOPICS TO COVER:
{json.dumps(context_package['topics'], indent=2)}

SCRIPT:
{json.dumps(script_output, indent=2)}

OUTPUT (JSON):
{{
  "approved": true or false,
  "completeness_score": 1-10,
  "coherence_score": 1-10,
  "accuracy_score": 1-10,
  "image_diversity_score": 1-10,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1"]
}}

Approve (true) if all scores are 7+. Otherwise set approved to false.
"""
    
    try:
        completion = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=20000,
            messages=[{"role": "user", "content": validation_prompt}]
        )
        res_text = completion.content[0].text
        return extract_json_from_response(res_text)
    except Exception as e:
        print(f"   ⚠️ Validation Error: {e}")
        # Default to approved if validation fails to run, to avoid blocking
        return {"approved": True, "issues": ["Validation mechanism failed"], "suggestions": []}


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
    
    # Select strategy based on duration (default to 5 if not found)
    strategy = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])

    prompt = (
        f"You are an expert instructional designer creating a learning path for a {request.duration}-minute video course.\n\n"
        f"CONTEXT:\n"
        f"Policy Document: {request.policy_text}\n"
        f"Video Duration: {request.duration} minutes\n\n"
        f"YOUR TASK:\n"
        f"1. Generate a compelling course title that captures the core value proposition\n"
        f"2. Identify ONE primary learning objective (what should learners be able to do after?)\n"
        f"3. Create topics following the DURATION STRATEGY FRAMEWORK below\n\n"
        f"DURATION STRATEGY FRAMEWORK:\n\n"
        f"{request.duration} MINUTE VIDEO STRATEGY:\n"
        f"{json.dumps(DURATION_STRATEGIES, indent=2)}[{request.duration}]\n\n"
        f"TOPIC SELECTION INSTRUCTIONS:\n"
        f"Using the strategy for {request.duration}-minute videos:\n"
        f"- Create {strategy['topic_count']} topics\n"
        f"- Target {strategy['slide_range']} total slides\n"
        f"- Achieve {strategy['depth_level']} depth\n"
        f"- Focus on: {strategy['focus']}\n"
        f"- Allocate approximately {strategy['slides_per_topic']} per topic\n"
        f"- Prioritize: {strategy['content_priorities']}\n\n"
        f"Each topic should:\n"
        f"- Have clear learning value appropriate to the duration tier\n"
        f"- Build logically on previous topics\n"
        f"- Contain specific key points from the policy (not generic advice)\n"
        f"- Indicate complexity level (simple/moderate/complex) to help allocate slides later\n\n"
        f"COMPLEXITY GUIDELINES:\n"
        f"- simple: Definitions, single concepts, straightforward rules (1-3 slides)\n"
        f"- moderate: Procedures with steps, concepts with examples (3-5 slides)\n"
        f"- complex: Multi-step processes, scenarios, decision trees, edge cases (5-8 slides)\n\n"
        f"OUTPUT FORMAT (JSON):\n"
        f"{{\n"
        f"  \"title\": \"Course title appropriate for {request.duration}-minute depth\",\n"
        f"  \"learning_objective\": \"After this course, you will be able to...\",\n"
        f"  \"duration\": {request.duration},\n"
        f"  \"strategy_tier\": \"{strategy['purpose']}\",\n"
        f"  \"topics\": [\n"
        f"    {{\n"
        f"      \"id\": 1,\n"
        f"      \"title\": \"Topic name\",\n"
        f"      \"purpose\": \"Why this matters in the learning journey\",\n"
        f"      \"complexity\": \"simple|moderate|complex\",\n"
        f"      \"key_points\": [\n"
        f"        \"Specific point from policy 1\",\n"
        f"        \"Specific point from policy 2\",\n"
        f"        \"Specific point from policy 3\"\n"
        f"      ],\n"
        f"      \"estimated_slides\": 3,\n"
        f"      \"depth_notes\": \"What level of detail this topic should cover for this duration\"\n"
        f"    }}\n"
        f"  ],\n"
        f"  \"total_estimated_slides\": 0\n"
        f"}}\n\n"
        f"CONSTRAINTS:\n"
        f"- First topic MUST be an engaging hook/introduction that sets context\n"
        f"- Last topic MUST be actionable summary/next steps\n"
        f"- Total estimated slides should be within {strategy['slide_range']}\n"
        f"- Topics must be specific to the policy content, not generic compliance topics\n"
        f"- Shorter durations should focus on critical/high-impact information\n"
        f"- Longer durations should cover more topics AND go deeper on each topic\n"
        f"- The 'complexity' field is CRITICAL for pacing. Be realistic.\n"
    )
    
    try:
        completion = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=20000,
            messages=[{"role": "user", "content": prompt}]
        )
        # Parse JSON from response
        res_text = completion.content[0].text
        data = extract_json_from_response(res_text)
        
        # Extract fields with safe defaults
        topics = data.get("topics", [])
        title = data.get("title", "New Course")
        learning_objective = data.get("learning_objective", "Understand the policy key points.")
        
        return {
            "title": title,
            "learning_objective": learning_objective,
            "topics": topics
        }

    except Exception as e:
        print(f"❌ Planning Error: {e}")
        # Fallback structure
        fallback_topics = [
            {"id": 1, "title": "Introduction", "purpose": "Welcome", "key_points": ["Overview"]},
            {"id": 2, "title": "Policy Highlights", "purpose": "Core content", "key_points": ["Main rule"]},
            {"id": 3, "title": "Summary", "purpose": "Wrap up", "key_points": ["Review"]}
        ]
        return {"topics": fallback_topics, "title": "Policy Overview", "learning_objective": "Understand the basics."}

@app.post("/generate-script")
async def generate_script(request: ScriptRequest, background_tasks: BackgroundTasks):
    print("✍️ Generating Full Script...")
    
    # Calculate approx slide count (3 slides per minute as per new rules)
    target_slides = request.duration * 3
    
    # Create Context Package
    topics_list = [t.dict() for t in request.topics]
    
    strategy = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
    
    context_package = {
        "policy_text": request.policy_text,
        "title": request.title,
        "learning_objective": request.learning_objective,
        "topics": topics_list,
        "duration": request.duration,
        "target_slides": target_slides,
        "style_guide": STYLE_PROMPT,
        "strategy_tier": strategy["purpose"]
    }
    
    # Calculate slides per topic average
    avg_slides_per_topic = math.floor(target_slides / len(topics_list)) if topics_list else 3
    
    depth_requirements = f"""
DURATION-SPECIFIC DEPTH REQUIREMENTS:

Your script is for a {context_package['duration']}-MINUTE video with strategy tier: {context_package['strategy_tier']}

FOCUS & DEPTH:
- Depth Level: {strategy['depth_level']}
- Primary Focus: {strategy['focus']}
- Content Priorities: {', '.join(strategy['content_priorities'])}

SLIDE ALLOCATION FOR {context_package['duration']} MINUTES:
- Target: {context_package['target_slides']} slides total (approx 20s each)
- Average: {avg_slides_per_topic} per topic
- Topic Count: {len(topics_list)} topics
- Use 'complexity' field in topics to weigh slide allocation (Complex = more slides).

SLIDE DURATION RULES:
Vary slide duration based on content complexity and cognitive load:

Duration Guidelines:
- 10000-14000ms (10-14s): Quick transitions, single impactful statements, topic bridges
- 15000-22000ms (15-22s): Standard teaching slides with one clear concept
- 23000-30000ms (23-30s): Explanations with examples, procedures with steps
- 31000-45000ms (31-45s): Complex scenarios, stories, multi-step processes
- 46000-60000ms (46-60s): Deep procedures (only for 15-20 min videos)

Target Average: 20 seconds per slide (3 slides per minute)

Word Count to Duration Formula:
- Speaking pace: 2.5 words per second (150 words per minute)
- 20 words = 8 seconds = 8000ms (too fast, add thinking time)
- 30 words = 12 seconds = 14000ms (add 2s thinking time)
- 45 words = 18 seconds = 20000ms (add 2s thinking time)
- 60 words = 24 seconds = 26000ms (add 2s thinking time)
- 75 words = 30 seconds = 32000ms (add 2s thinking time)
- 100 words = 40 seconds = 42000ms (add 2s thinking time)

ALWAYS add 1-3 seconds of "thinking time" beyond pure narration time to allow:
- Visual text reading
- Image processing
- Concept absorption
- Mental transition to next slide

NARRATION LENGTH GUIDELINES:
- Quick slides: 20-35 words (with thinking time = 12-16s)
- Standard slides: 40-55 words (with thinking time = 18-24s)
- Detailed slides: 60-75 words (with thinking time = 26-32s)
- Complex slides: 80-100 words (with thinking time = 35-45s)
- Very complex: 100-130 words (only for 15-20 min videos, with thinking time = 45-55s)

Pacing Strategy:
- Start with moderate pace (18-22s slides) to establish rhythm
- Vary throughout to maintain engagement
- Use quick slides (12-14s) after complex slides to give mental break
- Never put two 40+ second slides back-to-back
- Aim for 80% of slides in the 16-26 second range
"""

    base_prompt = (
        f"You are an expert video course scriptwriter creating engaging, comprehensive e-learning content.\n\n"
        f"CONTEXT:\n"
        f"- Course Title: {context_package['title']}\n"
        f"- Learning Objective: {context_package['learning_objective']}\n"
        f"- Duration: {context_package['duration']} minutes ({context_package['target_slides']} slides target)\n"
        f"- Original Policy Content: {context_package['policy_text']}\n"
        f"- Approved Topics: {json.dumps(context_package['topics'])}\n\n"
        f"VISUAL STYLE GUIDE: {context_package['style_guide']}\n\n"
        f"{depth_requirements}\n\n"
        f"YOUR TASK:\n"
        f"Create a complete video script that transforms policy content into an engaging learning experience.\n\n"
        f"CONTENT RULES:\n"
        f"1. ACCURACY: Extract specific facts, procedures, and requirements from the policy. Don't generalize.\n"
        f"2. COMPREHENSIVENESS: Cover all key points identified in topics, with sufficient depth for learner retention.\n"
        f"3. ENGAGEMENT: Use storytelling techniques - scenarios, questions, \"imagine if...\" moments.\n"
        f"4. COHERENCE: Each slide must connect to the previous one. Use transitional phrases.\n"
        f"5. SPECIFICITY: Include concrete examples, numbers, or scenarios from the policy when relevant.\n\n"
        f"NARRATION RULES (text field):\n"
        f"- Follow the NARRATION LENGTH GUIDELINES above intimately.\n"
        f"- Conversational but professional tone\n"
        f"- Use \"you\" to address learner directly\n"
        f"- Vary sentence structure (questions, statements, imperatives)\n"
        f"- First slide: Hook with a relatable problem or surprising fact\n"
        f"- Last slide: Actionable summary with next steps\n"
        f"- TIMING: You MUST format the 'duration' field in milliseconds strictly according to the SLIDE DURATION RULES based on your word count and complexity.\n"
        f"VISUAL TEXT RULES (visual_text field):\n"
        f"- Support narration, don't duplicate it\n"
        f"- Use markdown: # for headers, > for quotes, - for lists\n"
        f"- Maximum 3 bullet points or 15 words for 'split' layout\n"
        f"- text_only: One impactful statement (5-10 words)\n"
        f"- image_only: Empty string \"\"\n\n"
        f"LAYOUT DISTRIBUTION:\n"
        f"- 70% 'split': Main teaching slides (text left, image right)\n"
        f"- 15% 'text_only': Key principles, memorable quotes, strong statements\n"
        f"- 15% 'image_only': Emotional moments, scene-setters, transitions\n"
        f"- First slide should be 'split' or 'image_only' with title\n"
        f"- Last slide should be 'text_only' or 'split' with clear takeaway\n\n"
        f"IMAGE PROMPT RULES (prompt field):\n"
        f"CRITICAL: Each prompt must be detailed and contextually specific.\n\n"
        f"Template: \"Professional e-learning illustration: [SUBJECT] [ACTION/CONTEXT]. [VISUAL STYLE from guide]. [SPECIFIC DETAILS: clothing, setting, objects, composition]. [MOOD/EMOTION]. High quality, well-lit, modern corporate aesthetic.\"\n\n"
        f"Examples:\n"
        f"✅ GOOD: \"Professional e-learning illustration: Diverse team of three reviewing documents at modern conference table. Medium shot showing hands pointing at papers, laptop visible. Business casual attire, bright office with plants. Collaborative and focused mood. High quality, natural lighting, modern corporate aesthetic.\"\n\n"
        f"❌ BAD: \"People in meeting\"\n\n"
        f"- Vary subjects: Don't show the same scene twice\n"
        f"- Match emotional tone to content (concerned for risks, optimistic for benefits)\n"
        f"- Specify diversity in every human image\n"
        f"- Include environmental context (office, outdoor, home office, etc.)\n\n"
        f"DURATION CALCULATION:\n"
        f"- Use the SLIDE DURATION RULES to determine exact duration for each slide in milliseconds.\n"
        f"- Total duration must sum up to approx {context_package['duration'] * 60000}ms (within 10% margin).\n"
        f"- Validate: Sum of all slide durations = Target Total Duration.\n\n"
        f"OUTPUT FORMAT (JSON):\n"
        f"{{\n"
        f"  \"script\": [\n"
        f"    {{\n"
        f"      \"slide_number\": 1,\n"
        f"      \"text\": \"Narration text here...\",\n"
        f"      \"visual_text\": \"# Markdown text here\",\n"
        f"      \"layout\": \"split\",\n"
        f"      \"prompt\": \"Detailed image generation prompt...\",\n"
        f"      \"duration\": 15000\n"
        f"    }}\n"
        f"  ]\n"
        f"}}\n\n"
        f"FINAL CHECKLIST (validate before outputting):\n"
        f"☐ Exactly {context_package['target_slides']} slides\n"
        f"☐ Covers all topics from the learning path\n"
        f"☐ Each slide has 30-40 word narration\n"
        f"☐ Image prompts are detailed and varied\n"
        f"☐ Layout distribution approximately matches 70/15/15\n"
        f"☐ Story flows logically from hook to conclusion\n"
        f"☐ Policy-specific information is included (not generic advice)\n"
    )

    try:
        messages = [{"role": "user", "content": base_prompt}]
        script_plan = []
        max_retries = 2
        
        for attempt in range(max_retries):
            # Generate
            completion = client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=20000,
                messages=messages
            )
            res_text = completion.content[0].text
            data = extract_json_from_response(res_text)
            script_plan = data.get("script", [])
            
            # Validation
            if not ENABLE_SCRIPT_VALIDATION:
                break
                
            validation_result = validate_script(script_plan, context_package)
            
            if validation_result['approved']:
                print("   ✅ Script Validation Passed")
                break
            
            # If failed
            print(f"   ⚠️ Script Validation Failed (Attempt {attempt+1}/{max_retries})")
            print(f"      Issues: {validation_result.get('issues', [])}")
            
            if attempt < max_retries - 1:
                # Add context for retry
                messages.append({"role": "assistant", "content": res_text})
                feedback = (
                    f"CRITICAL QUALITY FEEDBACK - REVISION REQUIRED:\n"
                    f"The script above failed validation checks. Please rewrite sections or the whole script to address these issues:\n"
                    f"ISSUES: {json.dumps(validation_result.get('issues', []))}\n"
                    f"SUGGESTIONS: {json.dumps(validation_result.get('suggestions', []))}\n"
                    f"Constraint Reminder: Must be exactly {context_package['target_slides']} slides and cover all specific policy details."
                )
                messages.append({"role": "user", "content": feedback})
            else:
                print("   ⚠️ Max retries reached. Proceeding with best effort.")

        # Create DB Entry
        metadata = {
            "topics": topics_list, 
            "style": request.style
        }
        if ENABLE_SCRIPT_VALIDATION and 'validation_result' in locals():
            metadata["validation_last_result"] = validation_result

        response = supabase.table("courses").insert({
            "status": "generating_script", 
            "name": request.title,
            "metadata": metadata
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