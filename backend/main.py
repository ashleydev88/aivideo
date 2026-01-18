import os
import time
import uuid
import asyncio
import requests
import traceback
import tempfile
import textwrap
import subprocess # Added for Remotion Lambda
import tempfile
import textwrap

from fastapi import FastAPI, BackgroundTasks, File, UploadFile, Form, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

import replicate
from dotenv import load_dotenv
import utils.parser as parser
import json
import math
import re
import traceback

# --- MOVIEPY IMPORTS ---
# Ensure you have run: pip install "moviepy<2.0"
from moviepy.editor import AudioFileClip
import random



# 1. LOAD SECRETS
load_dotenv()



ELEVEN_LABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# --- CONFIGURATION ---
LLM_MODEL_NAME = "deepseek-ai/deepseek-v3"
VOICE_ID = "aHCytOTnUOgfGPn5n89j" 

# --- CONCURRENCY LIMITS ---
# Limits concurrent Supabase uploads to prevent socket exhaustion (Errno 35)
SUPABASE_UPLOAD_SEMAPHORE = asyncio.Semaphore(5)

# --- CONFIGURATION FLAGS ---
ENABLE_SCRIPT_VALIDATION = True  # Set to False to skip validation 

# --- STYLE PROMPTS (use {primary_color} placeholder for dynamic color injection) ---

MINIMALIST_PROMPT = (
    "A clean, modern flat vector art style inspired by high-end tech SaaS interfaces. "
    "The aesthetic relies on geometric abstraction, ample negative space, and razor-sharp precision to convey clarity. "
    "The palette is strictly monochromatic or duotone (shades of {primary_color} and slate) with high-contrast elements for readability. "
    "Backgrounds are solid, muted colours or subtle geometric patterns that do not distract. "
    "The overall look is functional, efficient, and corporate-modern, similar to 'Corporate Memphis' but more restrained and less abstract. "
    "Scenes should focus on metaphorical representations of concepts—using icons, charts, and simplified shapes—rather than detailed character studies. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)


PHOTO_REALISTIC_PROMPT = (
    "A high-resolution, cinematic stock photography aesthetic with a focus on authenticity and modern office realism. "
    "The style utilizes soft, natural lighting (simulated window light) and shallow depth of field (bokeh) to isolate the subject from the background. "
    "The palette is true-to-life but with a subtle {primary_color} colour-grade for a cohesive 'editorial' look. "
    "Backgrounds should be blurred modern workspaces, glass walls, or generic corporate environments. "
    "The overall look is trustworthy, serious, and high-production value. "
    "Scenes should depict diverse professionals in candid, 'in-action' moments rather than stiff poses, or close-ups of relevant objects (laptops, safety gear, documents) on desks. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)


WATERCOLOUR_PROMPT = (
    "A sophisticated corporate illustration in a semi-realistic, hand-drawn aesthetic. "
    "The style features distinct, expressive charcoal or ink outlines combined with soft, "
    "textured watercolour-style colouring. "
    "The palette is restrained and professional: primarily navy blues, cool greys, and crisp "
    "whites, with selective warm accents of {primary_color}, mustard yellow and beige. "
    "Backgrounds are often simplified, airy, or fade into a white vignette. "
    "The overall look is polished yet human, evocative of high-end editorial illustrations for "
    "business technology. "
    "Scenes should prioritize relevant objects, tools over human subjects where possible, "
    "though diverse professionals and office environments can be used when a human "
    "element is essential. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)

# Style mapping with prompt template, default accent hex, and color name
STYLE_MAPPING = {
    "Minimalist Vector": {
        "prompt": MINIMALIST_PROMPT,
        "default_accent": "#14b8a6",
        "default_color_name": "teal"
    },
    "Photo Realistic": {
        "prompt": PHOTO_REALISTIC_PROMPT,
        "default_accent": "#3b82f6",
        "default_color_name": "blue"
    },
    "Sophisticated Watercolour": {
        "prompt": WATERCOLOUR_PROMPT,
        "default_accent": "#0ea5e9",
        "default_color_name": "sky blue"
    },
}

# --- DURATION STRATEGIES ---
DURATION_STRATEGIES = {
    # DEV ONLY - 1 minute option for quick testing
    1: {
        "purpose": "DEV ONLY - Quick testing with minimal API calls",
        "topic_count": "1-2 topics maximum",
        "slide_range": "2-4 slides",
        "avg_slide_duration": "15-20 seconds",
        "depth_level": "Surface - bare essentials only",
        "focus": "Quick test of generation pipeline",
        "slides_per_topic": "1-2 slides per topic",
        "content_priorities": ["Single key point", "Minimal API usage"]
    },
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

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
# Service role client for admin operations (bypasses RLS)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else supabase

def get_user_id_from_token(authorization: str = None) -> str:
    """
    Extract user_id from Supabase JWT token.
    Returns the user's UUID or raises HTTPException if invalid.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        # Use Supabase to verify the token and get user
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return str(user_response.user.id)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

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
    country: str = "USA" # Default to USA

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
    country: str = "USA" # Default to USA
    user_id: str  # Required: User's UUID for storage paths
    accent_color: str = None  # Optional: User-selected accent color hex (e.g., "#14b8a6")
    color_name: str = None  # Optional: Color name for style prompt (e.g., "teal")

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



def extract_policy_essence(policy_text: str) -> str:
    """
    Pre-processes long policy documents by stripping boilerplate content.
    Only runs for documents > 10,000 characters to avoid unnecessary API calls.
    Uses DeepSeek V3 (via Replicate) for fast, cost-effective processing.
    
    PRESERVES: All rules, procedures, requirements, deadlines, consequences.
    REMOVES: Table of contents, headers, footers, revision history, generic definitions.
    
    Returns: Condensed policy text with substantive content only.
    """
    # Skip for short policies - they don't need pre-processing
    if len(policy_text) < 10000:
        print(f"   📄 Policy is {len(policy_text)} chars - skipping pre-processing")
        return policy_text
    
    print(f"   🔧 Pre-processing long policy ({len(policy_text)} chars) with DeepSeek V3 (Replicate)...")
    
    prompt = """You are a Policy Document Specialist. Your task is to extract ONLY the substantive policy content.

REMOVE (do not include):
- Table of contents and indices
- Document headers, footers, page numbers
- Revision history and version notes
- Definitions of common/obvious terms (e.g., "Employee means a person employed by...")
- Generic legal disclaimers and boilerplate
- Redundant restatements of the same rule

PRESERVE (keep exact wording):
- All specific rules and requirements
- Procedures and step-by-step processes
- Deadlines, timeframes, and numerical thresholds
- Consequences and penalties
- Roles and responsibilities
- Examples and scenarios mentioned
- Definitions of policy-specific terms

CRITICAL: Do NOT summarize or paraphrase. Keep the exact original wording of all requirements.

OUTPUT: The condensed policy with only substantive content. No commentary."""

    try:
        messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"INPUT DOCUMENT ({len(policy_text)} characters):\n{policy_text}"}
            ]
            
        result = replicate_chat_completion(
            messages=messages,
            max_tokens=16000,
            temperature=0.3
        )
        
        condensed_length = len(result)
        reduction = ((len(policy_text) - condensed_length) / len(policy_text)) * 100
        print(f"   ✅ Pre-processed: {len(policy_text)} → {condensed_length} chars ({reduction:.1f}% reduction)")
        return result
    except Exception as e:
        print(f"   ⚠️ Pre-processing failed: {e}. Using original text.")
        return policy_text

def handle_failure(course_id: str, user_id: str, error: Exception, metadata: dict = None):
    """
    Moves a failed course record to the course_failures table and deletes it from courses.
    """
    print(f"🔥 Handling Failure for {course_id}: {error}")
    
    # 1. Attempt to Log Failure
    try:
        supabase_admin.table("course_failures").insert({
            "original_course_id": course_id,
            "user_id": user_id,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
            "metadata": metadata
        }).execute()
        print(f"   📝 Logged failure to audit table.")
    except Exception as e:
        print(f"   ⚠️  Failed to log failure: {e}")

    # 2. Attempt to Clean Up Course (CRITICAL)
    try:
        # Delete from courses
        supabase_admin.table("courses").delete().eq("id", course_id).execute()
        print(f"   🗑️  Deleted failed course {course_id}.")
    except Exception as e:
         print(f"   ❌ CRITICAL: Failed to delete course {course_id}: {e}")

def upload_asset(file_content, filename, content_type, user_id: str, max_retries: int = 3):
    """Upload asset to Supabase storage with user_id folder prefix for RLS.
    
    Returns the storage path (not a signed URL) for on-demand URL generation.
    Format: {user_id}/{filename}
    
    Includes retry logic for transient network errors (e.g., EAGAIN/Errno 35).
    """
    if not file_content: return None 
    bucket = "course-assets"
    # Use user_id as folder prefix for RLS policy compatibility
    path = f"{user_id}/{filename}"
    
    for attempt in range(max_retries):
        try:
            # Use admin client to bypass RLS for backend uploads
            supabase_admin.storage.from_(bucket).upload(path=path, file=file_content, file_options={"content-type": content_type})
            # Return the storage path instead of signed URL
            # Fresh signed URLs will be generated on-demand via /get-signed-url endpoint
            return path
        except Exception as e:
            error_str = str(e)
            # Check for transient errors that are worth retrying
            is_transient = "Resource temporarily unavailable" in error_str or \
                          "Errno 35" in error_str or \
                          "EAGAIN" in error_str or \
                          "Connection" in error_str
            
            if is_transient and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 0.5  # 0.5s, 1s, 1.5s backoff
                print(f"   ⚠️ Supabase Upload Error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"❌ Supabase Upload Error: {e}")
                return None
    
    return None

async def upload_asset_throttled(file_content, filename, content_type, user_id: str, max_retries: int = 3):
    """Async wrapper for upload_asset with semaphore-based throttling.
    
    Limits concurrent Supabase uploads to prevent socket exhaustion (Errno 35).
    Uses SUPABASE_UPLOAD_SEMAPHORE to control concurrency.
    """
    async with SUPABASE_UPLOAD_SEMAPHORE:
        return await asyncio.to_thread(upload_asset, file_content, filename, content_type, user_id, max_retries)

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
                import base64
                return base64.b64decode(audio_base64), alignment
            else:
                print("   ❌ ElevenLabs Response missing audio_base64")
        else:
            print(f"   ❌ ElevenLabs API Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ ElevenLabs Connection Error: {e}")
    return None, None

def replicate_chat_completion(messages, max_tokens=2048, temperature=0.7):
    # Convert messages list to single prompt string
    prompt = ""
    for msg in messages:
        role = msg["role"].capitalize()
        content = msg["content"]
        prompt += f"{role}: {content}\n\n"
    prompt += "Assistant: "

    print(f"   🤖 Calling DeepSeek V3 via Replicate...")
    try:
        output = replicate.run(
            "deepseek-ai/deepseek-v3",
            input={
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        # Replicate usually returns an iterator or list of strings
        if isinstance(output, list) or hasattr(output, '__iter__'):
            return "".join(output)
        return str(output)
    except Exception as e:
        print(f"   ❌ Replicate DeepSeek Error: {e}")
        raise e

def generate_image_replicate(prompt):
    print(f"   ⚡ Generating image (SDXL Lightning)...")
    try:
        # Using bytedance/sdxl-lightning-4step for speed and cost
        output = replicate.run(
            "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
            input={
                "prompt": prompt,
                "width": 1280, 
                "height": 720,
                "scheduler": "K_EULER",
                "num_inference_steps": 4,
                "negative_prompt": "text, watermark, ugly, blurry, low quality"
            }
        )
        # Replicate usually returns a list of outputs for this model, or a single string url
        if isinstance(output, list) and len(output) > 0:
            image_url = output[0]
        else:
            image_url = output if hasattr(output, 'url') else str(output)
            
        return requests.get(image_url).content
    except Exception as e:
        print(f"   ❌ Replicate/SDXL Error: {e}")
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
def render_slide_visual(image_path, text_content, layout="split", accent_color="#14b8a6"):
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
            bold_body_font = ImageFont.truetype(bold_path, base_size) # New: For inline bolding
            quote_font = ImageFont.truetype(reg_path, base_size) # Could be Italic if available
        else:
            raise OSError("Fonts missing")
    except OSError:
        print("   ⚠️ Using default font (fonts failed to load).")
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        bold_body_font = ImageFont.load_default()
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
        # accent_color is now passed as parameter (default: teal-500)
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
                
                # Measure header width to determine underline length
                max_header_width = 0
                for h_line in header_lines:
                    # Use textbbox for reliable measurement (returns left, top, right, bottom)
                    bbox = draw.textbbox((0, 0), h_line, font=title_font)
                    line_width = bbox[2] - bbox[0]  # right - left
                    max_header_width = max(max_header_width, line_width)
                
                # Draw header text
                for h_line in header_lines:
                    draw.text((x_margin, y_cursor), h_line, font=title_font, fill=text_color)
                    y_cursor += (title_font.size * 1.2)
                
                # Underline - match header width with 20px padding
                y_cursor += 20
                underline_width = max_header_width + 20
                draw.rectangle([x_margin, y_cursor, x_margin + underline_width, y_cursor + 8], fill=accent_color)
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
                # Calculate pixel width limit
                if layout == "split":
                    # Text area: 0 to 960
                    # Margin 120. Right padding 80 -> 960 - 120 - 80 = 760
                    max_width_px = 760 
                else: 
                     # text_only: 1920 width
                    max_width_px = 1920 - x_margin - 200

                clean_line = line.replace("-", "").strip()
                
                # Bullet
                if line.startswith("-") and reg_path:
                    draw.text((x_margin - 40, y_cursor), "•", font=body_font, fill=accent_color)
                
                # Draw with markdown support
                y_cursor = draw_markdown_text(
                    draw, x_margin, y_cursor, clean_line, max_width_px, body_font, bold_body_font, text_color
                )
                
                y_cursor += 30

    # Save
    output_path = image_path.replace(".jpg", "_rendered.jpg")
    canvas.save(output_path)
    return output_path

def draw_markdown_text(draw, x_start, y_start, text, max_width_px, font_reg, font_bold, fill_color):
    """
    Draws text with support for **bold** markdown, handling wrapping based on pixel width.
    Returns the next y-coordinate.
    """
    line_height = font_reg.size * 1.4
    
    # 1. Parse Tokens: list of (word_str, is_bold)
    # Split by bold markers
    parts = re.split(r'(\*\*.*?\*\*)', text)
    tokens = [] 
    
    for part in parts:
        is_bold = part.startswith("**") and part.endswith("**")
        clean_part = part[2:-2] if is_bold else part
        
        # Split by space to get words, keeping spaces for reconstruction
        # We start by splitting by space
        words = clean_part.split(' ')
        for i, w in enumerate(words):
            if i < len(words) - 1:
                token_text = w + " "
            else:
                token_text = w
            
            if token_text:
                tokens.append((token_text, is_bold))
    
    # 2. Draw Tokens with Wrapping
    curr_x = x_start
    curr_y = y_start
    
    for word, is_bold in tokens:
        font = font_bold if is_bold else font_reg
        w_len = draw.textlength(word, font=font)
        
        # Check wrap
        if curr_x + w_len > x_start + max_width_px:
            # New Line
            curr_x = x_start
            curr_y += line_height
            word_clean = word.lstrip() # Remove leading space on new line
            w_len = draw.textlength(word_clean, font=font)
            draw.text((curr_x, curr_y), word_clean, font=font, fill=fill_color)
            curr_x += w_len
        else:
            draw.text((curr_x, curr_y), word, font=font, fill=fill_color)
            curr_x += w_len
            
    return curr_y + line_height


# --- KINETIC TEXT RENDERING SYSTEM ---

class PipelineManager:
    """
    Orchestrates the granular AI agents for the V2 workflow.
    """
    def __init__(self, client=None):
        self.client = client

    def assign_visual_types(self, script_data: list) -> list:
        """
        Visual Director Agent: Decides the visual format for each slide.
        Returns the script_data with an added 'visual_type' and 'visual_metadata' field.
        """
        print("   🎬 Visual Director: Assigning formats...")
        
        # Prepare context for the LLM
        slides_context = []
        for idx, slide in enumerate(script_data):
            slides_context.append({
                "id": idx + 1,  # Use 1-based index since slides don't have 'id' field
                "text": slide.get("text", "")[:100] + "...", # Truncate for token efficiency
                "visual_note": slide.get("visual_text", "")
            })

        prompt = f"""
You are a World-Class Instructional Designer and Video Director.
Your task is to assign the optimal VISUAL FORMAT for each slide to maximize learning retention and engagement.

AVAILABLE FORMATS:
1. "hybrid" (Image + Kinetic Text): 
   - BEST FOR: Complex concepts needing a metaphor + definition.
   - Layout: Image on Right, Kinetic Text on Left.
   - Use when you need to anchor a visual metaphor while explaining a key term.

2. "image" (Image Only):
   - BEST FOR: Storytelling, emotional impact, scene-setting, or strong visual metaphors.
   - Layout: Full screen image.
   - Use when the narration is descriptive and the visual needs to take center stage.

3. "chart" (Data/Process Visualization):
   - BEST FOR: Processes, steps, comparisons, lists, statistics, or flow.
   - Layout: Clean, professional animated chart/diagram types.
   - Use whenever the text implies structure (First, Second; vs; increasing/decreasing).

4. "kinetic_text" (Text Only):
   - BEST FOR: Short powerful quotes, definitions, or critical takeaways.
   - Layout: Large, animated typography.
   - Use for emphasis or when no visual metaphor is strong enough.

RULES:
- "Process" language ("steps", "stages", "flow") MUST be a "chart".
- lists of 3+ items should be a "chart" (List view).
- Emotional/Scenario content works best as "image".
- Key definitions work best as "hybrid" or "kinetic_text".
- Use "kinetic_text" for strong, short statements (quotes, warnings, key facts).
- NEVER assign "chart" to two consecutive slides - if content needs chart, use "hybrid" or "kinetic_text" for adjacent slides.
- DIVERSIFY: Avoid using the same format for more than 2 slides in a row.

INPUT SLIDES:
{json.dumps(slides_context, indent=2)}

OUTPUT (JSON):
[
  {{ "id": 1, "type": "image", "reason": "Opening scene setting" }},
  {{ "id": 2, "type": "hybrid", "reason": "Defining the core concept" }}
]
"""
        try:
            res_text = replicate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000
            )
            print(f"   📋 Visual Director Raw Response: {res_text[:500]}...")
            directives = extract_json_from_response(res_text)
            print(f"   📋 Visual Director Parsed Directives: {json.dumps(directives, indent=2)}")
            
            # Map directives back to script_data
            directive_map = {d["id"]: d for d in directives}
            
            enriched_script = []
            type_counts = {"image": 0, "hybrid": 0, "kinetic_text": 0, "chart": 0}
            for idx, slide in enumerate(script_data):
                slide_id = idx + 1  # Use 1-based index to match AI response
                d = directive_map.get(slide_id, {"type": "image"})
                slide["visual_type"] = d.get("type", "image")
                slide["visual_reason"] = d.get("reason", "")
                enriched_script.append(slide)
                # Track type distribution
                vtype = slide["visual_type"]
                type_counts[vtype] = type_counts.get(vtype, 0) + 1
                print(f"   🎬 Slide {slide_id}: visual_type={vtype}, reason={slide['visual_reason'][:50] if slide['visual_reason'] else 'N/A'}")
            
            print(f"   📊 Visual Type Distribution: {type_counts}")
            return enriched_script

        except Exception as e:
            print(f"   ⚠️ Visual Director Failed: {e}")
            # Fallback
            for slide in script_data:
                slide["visual_type"] = "image"
            return script_data

    def generate_chart_data(self, slide_text: str, visual_note: str) -> dict:
        """
        Chart Generator Agent: Extracts structured data for Recharts/Remotion.
        """
        print("     📊 Generating Chart Data...")
        prompt = f"""
You are a Data Visualization Specialist designing a slide for a high-end corporate video.
Extract structured data from the narration to build a professional, animated chart or diagram.

CONTEXT:
Narration: {slide_text}
Visual Note: {visual_note}

TASK:
Return a JSON object that perfectly represents this content visually.

AVAILABLE CHART TYPES:
- "process": Sequential steps (1 -> 2 -> 3).
- "list": Unordered items or bullet points.
- "grid": A 2x2 or 3x2 grid of related concepts.
- "comparison": Side-by-side vs. comparison.
- "statistic": A big key number with a label (best for 1-2 items).
- "pyramid": Hierarchical structures (base -> peak).
- "cycle": Circular or repeating processes.

OUTPUT (JSON):
{{
  "title": "Short, punchy title",
  "type": "process|list|grid|comparison|statistic|pyramid|cycle",
  "items": [
    {{ 
      "label": "Step/Item Name", 
      "description": "Short description (max 8 words)",
      "icon": "box|user|zap|shield|trending-up|activity|target|layers|refresh-cw", 
      "color_intent": "primary|secondary|accent|danger|success|warning"
    }}
  ]
}}

CRITICAL:
- Keep text labels SHORT (1-5 words) for clean UI.
- Max 6 items for readability.
- Choose icons from the list provided that best match the item.
- Use color_intent to signal meaning (e.g., 'danger' for risks, 'success' for benefits).
"""
        try:
            res_text = replicate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000
            )
            print(f"     📊 Chart Generator Raw: {res_text[:300]}...")
            chart_data = extract_json_from_response(res_text)
            print(f"     📊 Chart Data Parsed: type={chart_data.get('type')}, title={chart_data.get('title')}, items={len(chart_data.get('items', []))}")
            return chart_data
        except Exception as e:
             print(f"     ⚠️ Chart Gen Failed: {e}")
             return None

    def generate_kinetic_text(self, narration: str, word_timestamps: list, visual_type: str, slide_duration_ms: int) -> list:
        """
        Kinetic Text Agent: Generates timed on-screen text moments.
        Returns a list of kinetic_events with timing anchored to trigger words.
        
        Args:
            narration: The full narration text for the slide
            word_timestamps: List of {"word": str, "start_ms": int, "end_ms": int}
            visual_type: The slide's visual type (hybrid, kinetic_text, image, chart)
            slide_duration_ms: Total slide duration in milliseconds
        
        Returns:
            List of kinetic_event dicts with text, trigger_word, start_ms, style
        """
        print("     ✍️ Generating Kinetic Text...")
        
        # Determine content type guidance based on visual_type
        if visual_type == "kinetic_text":
            content_guidance = "This is a TEXT-ONLY slide. Generate 1-3 powerful statements that capture the core message. Use larger, impactful phrases."
            max_events = 3
        elif visual_type == "hybrid":
            content_guidance = "This is a SPLIT slide (text + image). Generate 1-2 bullet points or a short header that complements the image. Keep text concise."
            max_events = 2
        elif visual_type == "chart":
            content_guidance = "This is a CHART slide. Generate 0-1 supporting text only if the chart needs context. Usually no text needed."
            max_events = 1
        else:  # image or other
            content_guidance = "This is an IMAGE slide. Generate 0-1 text overlays only if essential. Usually no text needed."
            max_events = 1
        
        # Build word list for context
        word_list = [w["word"] for w in word_timestamps]
        
        prompt = f"""You are a Kinetic Typography Director for corporate e-learning videos.

TASK: Generate on-screen text moments that highlight the MOST MEMORABLE takeaways from this slide's narration.

SLIDE CONTEXT:
{content_guidance}

NARRATION:
"{narration}"

AVAILABLE WORDS (use these exact words as trigger_word):
{', '.join(word_list[:50])}

RULES:
1. Extract KEY TERMS only, never full sentences from the narration
2. Each text must anchor to a specific TRIGGER WORD (exact word from narration above)
3. Think: "What would someone screenshot to remember?"
4. Text should be SHORT (max 5-7 words) and PUNCHY
5. Maximum {max_events} events for this slide type
6. Return empty array if no text is needed

TEXT STYLES:
- "header": Large title text (e.g., "Lock Your Screen")
- "bullet": Bullet point item (e.g., "• Report within 24 hours")
- "emphasis": Bold statement (e.g., "EVERY. SINGLE. TIME.")
- "stat": Large number with label (e.g., "24hr Reporting Window")

OUTPUT FORMAT (JSON):
{{
  "kinetic_events": [
    {{
      "text": "Short impactful text",
      "trigger_word": "exact_word_from_narration",
      "style": "header|bullet|emphasis|stat"
    }}
  ]
}}

CRITICAL: 
- trigger_word MUST be an EXACT word from the narration
- Return empty array {{"kinetic_events": []}} if this slide doesn't need text
"""
        try:
            res_text = replicate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000
            )
            print(f"     ✍️ Kinetic Text Raw: {res_text[:300]}...")
            result = extract_json_from_response(res_text)
            events = result.get("kinetic_events", [])
            
            # Post-process: Add timing from word_timestamps
            word_map = {w["word"].lower(): w for w in word_timestamps}
            # Also try with punctuation stripped
            word_map_clean = {w["word"].lower().strip(".,!?;:\"'()[]"): w for w in word_timestamps}
            
            processed_events = []
            for event in events:
                trigger = event.get("trigger_word", "").lower()
                # Try exact match first, then cleaned match
                word_data = word_map.get(trigger) or word_map_clean.get(trigger.strip(".,!?;:\"'()[]"))
                
                if word_data:
                    event["start_ms"] = word_data["start_ms"]
                    processed_events.append(event)
                    print(f"     ✍️ Event: '{event['text']}' @ {event['start_ms']}ms (trigger: {trigger})")
                else:
                    # Fallback: appear at 500ms
                    event["start_ms"] = 500
                    processed_events.append(event)
                    print(f"     ⚠️ Trigger word '{trigger}' not found, defaulting to 500ms")
            
            return processed_events
            
        except Exception as e:
            print(f"     ⚠️ Kinetic Text Gen Failed: {e}")
            return []


def parse_alignment_to_words(alignment: dict) -> list:
    """
    Converts ElevenLabs alignment data (character-level) to word-level timestamps.
    
    Args:
        alignment: Dict with 'characters', 'character_start_times_seconds', 'character_end_times_seconds'
    
    Returns:
        List of {"word": str, "start_ms": int, "end_ms": int}
    """
    if not alignment or not alignment.get("characters"):
        return []
    
    characters = alignment.get("characters", [])
    start_times = alignment.get("character_start_times_seconds", [])
    end_times = alignment.get("character_end_times_seconds", [])
    
    words = []
    current_word = ""
    word_start = -1
    
    for i, char in enumerate(characters):
        t_start = start_times[i] if i < len(start_times) else 0
        t_end = end_times[i] if i < len(end_times) else 0
        
        if word_start == -1:
            word_start = t_start
        
        if char == " ":
            if current_word:
                words.append({
                    "word": current_word,
                    "start_ms": int(word_start * 1000),
                    "end_ms": int(t_end * 1000)
                })
                current_word = ""
                word_start = -1
        else:
            current_word += char
    
    # Capture last word
    if current_word and len(end_times) > 0:
        words.append({
            "word": current_word,
            "start_ms": int(word_start * 1000),
            "end_ms": int(end_times[-1] * 1000)
        })
    
    return words


def validate_script(script_output, context_package):
    """
    Validates script quality before proceeding to media generation.
    Includes fact-checking against the original policy to catch hallucinations.
    Returns: dict with 'approved' (bool), 'issues' (list), 'ungrounded_claims' (list), 'suggestions' (list)
    """
    print("   🕵️ Validating Script Quality (with fact-checking)...")
    
    # Use original policy for fact-checking (truncate to stay within token limits)
    policy_excerpt = context_package.get('original_policy_text', context_package.get('policy_text', ''))[:8000]
    
    validation_prompt = f"""
You are a quality assurance reviewer for e-learning content with expertise in policy compliance.

Review this video script and perform the following checks:

1. COMPLETENESS: Does it cover the key points from the topics? (List any gaps)
2. COHERENCE: Does each slide transition logically? (Flag jarring jumps)
3. ACCURACY: Are there specific policy details, or just generic advice? (Rate 1-10)
4. IMAGE DIVERSITY: Are image prompts varied and specific? (Flag repetitive prompts)
5. DURATION: Does the math check out? (Sum of all slide durations should be within -5% to +15% of total target duration {context_package['duration']}min). note: Individual slides can range 10s-60s.

6. FACT-CHECK (CRITICAL): For each factual claim in the script, verify it against the source policy:
   - Extract specific claims (numbers, deadlines, procedures, requirements, definitions)
   - Check if each claim is grounded in the original policy text below
   - Flag any claim that appears hallucinated, exaggerated, or incorrectly stated
   - Be especially vigilant about: numbers, timeframes, percentages, specific procedures

ORIGINAL POLICY (source of truth for fact-checking):
{policy_excerpt}

TOPICS TO COVER:
{json.dumps(context_package['topics'], indent=2)}

SCRIPT TO VALIDATE:
{json.dumps(script_output, indent=2)}

OUTPUT (JSON):
{{
  "approved": true or false,
  "completeness_score": 1-10,
  "coherence_score": 1-10,
  "accuracy_score": 1-10,
  "image_diversity_score": 1-10,
  "fact_check_score": 1-10,
  "issues": ["issue 1", "issue 2"],
  "ungrounded_claims": [
    {{"slide": 1, "claim": "quoted claim from script", "issue": "what's wrong or not found in policy"}}
  ],
  "suggestions": ["suggestion 1"]
}}

APPROVAL CRITERIA:
- Approve (true) if all scores are 7+ AND fact_check_score is 8+
- If fact_check_score < 8, you MUST populate ungrounded_claims with specific examples
- Otherwise set approved to false
"""
    
    try:
        res_text = replicate_chat_completion(
            messages=[{"role": "user", "content": validation_prompt}],
            max_tokens=20000
        )
        result = extract_json_from_response(res_text)
        
        # Log fact-check results
        fact_score = result.get('fact_check_score', 'N/A')
        ungrounded = result.get('ungrounded_claims', [])
        print(f"   📊 Fact-check score: {fact_score}/10, Ungrounded claims: {len(ungrounded)}")
        if ungrounded:
            for claim in ungrounded[:3]:  # Log first 3
                print(f"      ⚠️ Slide {claim.get('slide')}: {claim.get('issue', 'Unknown issue')[:50]}...")
        
        return result
    except Exception as e:
        print(f"   ⚠️ Validation Error: {e}")
        # Default to approved if validation fails to run, to avoid blocking
        return {"approved": True, "issues": ["Validation mechanism failed"], "ungrounded_claims": [], "suggestions": []}


# --- WORKER 1: DRAFT COURSE GENERATION ---

def inject_bookend_slides(script_plan: list, course_title: str) -> list:
    """
    Injects a welcome slide at the beginning and a thank you slide at the end of the script.
    
    Welcome slide: Shows course title, narrator says "Welcome to [title] training"
    Thank you slide: Shows "Thank you for watching" for 2+ seconds
    """
    print("   📚 Injecting welcome and thank you slides...")
    
    # Welcome slide (first)
    welcome_slide = {
        "text": f"Welcome to the {course_title} training.",
        "visual_text": f"Welcome to {course_title}",  # Full message for on-screen display
        "prompt": "",  # No image generation - uses title card layout
        "visual_type": "title_card",  # Special type for static title
        "layout": "title",
        "duration_hint": 4000  # ~4 seconds for welcome
    }
    
    # Thank you slide (last)
    thanks_slide = {
        "text": "Thank you for watching.",
        "visual_text": "Thank you for watching",
        "prompt": "",
        "visual_type": "title_card",
        "layout": "title",
        "duration_hint": 3000  # 3 seconds (min 2s requirement met)
    }
    
    # Inject: [welcome] + [all content slides] + [thanks]
    result = [welcome_slide] + script_plan + [thanks_slide]
    print(f"   ✅ Injected bookends: {len(script_plan)} content slides → {len(result)} total slides")
    return result

async def generate_course_assets(course_id: str, script_plan: list, style_prompt: str, user_id: str, accent_color: str = "#14b8a6"):
    print(f"🚀 Starting Course Gen: {course_id} for user: {user_id}")
    
    # Update status and progress phase to media generation
    supabase_admin.table("courses").update({
        "status": "generating_media",
        "progress_phase": "media",
        "progress_current_step": 0
    }).eq("id", course_id).execute()
    
    # Semaphore to limit concurrent API requests (ElevenLabs/Replicate)
    api_semaphore = asyncio.Semaphore(5)

    async def process_slide_parallel(i, slide, temp_dir):
        async with api_semaphore:
            print(f"   🎬 Processing slide {i+1}...")
            # Update progress for each slide
            # Note: Since this is parallel, progress updates might be slightly out of order in the UI, 
            # but that's acceptable for the performance gain.
            supabase_admin.table("courses").update({
                "status": f"Drafting Slide {i+1} of {len(script_plan)}...",
                "progress_current_step": i + 1,
                "progress_total_steps": len(script_plan) # Ensure total matches actual slides (including bookends)
            }).eq("id", course_id).execute()

            # 1. Parallel Audio and Visual Generation
            # We use asyncio.to_thread for synchronous blocking calls
            
            async def get_audio():
                audio_data, alignment = await asyncio.to_thread(generate_audio, slide["text"])
                if audio_data is None:
                    raise Exception(f"Audio generation failed for slide {i+1}")
                return audio_data, alignment

            async def get_visual():
                visual_type = slide.get("visual_type", "image")
                image_url = None
                chart_data = None
                
                if visual_type == "title_card":
                    pass # Handled in post-processing
                elif visual_type == "chart":
                    pipeline = PipelineManager()
                    chart_data = await asyncio.to_thread(pipeline.generate_chart_data, slide["text"], slide.get("visual_text", ""))
                    if not chart_data:
                        visual_type = "kinetic_text"
                elif visual_type in ["image", "hybrid"]:
                    full_prompt = f"{style_prompt}. {slide['prompt']}"
                    image_data = await asyncio.to_thread(generate_image_replicate, full_prompt)
                    if image_data is None:
                        visual_type = "kinetic_text"
                    else:
                        image_filename = f"visual_{i}_{int(time.time())}.jpg"
                        image_url = await upload_asset_throttled(image_data, image_filename, "image/jpeg", user_id)
                
                return visual_type, image_url, chart_data

            # Fire both simultaneously
            (audio_data, alignment), (visual_type, image_url, chart_data) = await asyncio.gather(
                get_audio(),
                get_visual()
            )

            # 2. Post-processing (Duration calculation, uploads, kinetic text)
            # Duration Calculation
            duration_ms = slide.get("duration", 15000)
            try:
                temp_audio_path = os.path.join(temp_dir, f"temp_audio_{i}.mp3")
                with open(temp_audio_path, "wb") as f:
                    f.write(audio_data)
                
                # AudioFileClip is blocking, use to_thread if needed, but here it's fast enough or we can thread it
                def get_duration(path):
                    clip = AudioFileClip(path)
                    d = int((clip.duration * 1000) + 1500)
                    clip.close()
                    return d
                
                duration_ms = await asyncio.to_thread(get_duration, temp_audio_path)
            except Exception as e:
                print(f"   ⚠️ Duration Calc Error slide {i+1}: {e}")

            if visual_type == "title_card":
                hint_ms = slide.get("duration_hint", 3000)
                if duration_ms < hint_ms:
                    duration_ms = hint_ms

            # Upload Audio
            audio_filename = f"narration_{i}_{int(time.time())}.mp3"
            audio_url = await upload_asset_throttled(audio_data, audio_filename, "audio/mpeg", user_id)

            # Kinetic Text
            word_timestamps = parse_alignment_to_words(alignment)
            kinetic_events = []
            if visual_type != "title_card":
                pipeline = PipelineManager()
                kinetic_events = await asyncio.to_thread(
                    pipeline.generate_kinetic_text,
                    narration=slide.get("text", ""),
                    word_timestamps=word_timestamps,
                    visual_type=visual_type,
                    slide_duration_ms=duration_ms
                )

            return {
                "id": i + 1,
                "image": image_url,
                "audio": audio_url,
                "timestamps": alignment,
                "text": slide.get("text", ""),
                "visual_text": slide.get("visual_text", ""),
                "duration": duration_ms,
                "layout": slide.get("layout", "split"),
                "accent_color": accent_color,
                "visual_type": visual_type,
                "chart_data": chart_data,
                "kinetic_events": kinetic_events
            }

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Launch all slide processing tasks
            tasks = [process_slide_parallel(i, slide, temp_dir) for i, slide in enumerate(script_plan)]
            final_slides = await asyncio.gather(*tasks)
            
            # Sort slides by ID to ensure original order
            final_slides.sort(key=lambda x: x["id"])

        supabase_admin.table("courses").update({
            "slide_data": final_slides, 
            "status": "Assets ready, starting video compilation...",
            "progress_phase": "compiling"
        }).eq("id", course_id).execute()
        print("✅ Asset Generation Completed, starting video compilation...")
        
        # Auto-trigger video compilation with AWAIT
        await trigger_remotion_render(course_id, user_id)

    except Exception as e:
        handle_failure(course_id, user_id, e, {"stage": "generate_course_assets", "style": style_prompt})



def get_asset_url(path_or_url, validity=600):
    """
    Helper to resolve a path or URL. 
    If it's a storage path (no scheme), generates a signed URL.
    Validity defaults to 10 mins (600s), but can be extended for rendering jobs.
    """
    if not path_or_url: return None
    if path_or_url.startswith("http"): return path_or_url
    
    try:
        # Generate signed URL 
        res = supabase_admin.storage.from_("course-assets").create_signed_url(path_or_url, validity)
        print(f"   🔐 Sign URL response type: {type(res)}, keys: {res.keys() if isinstance(res, dict) else 'N/A'}")
        
        # Handle dict response (standard in recent SDKs)
        if isinstance(res, dict) and "signedURL" in res:
            signed_url = res["signedURL"]
        elif isinstance(res, dict) and "signed_url" in res:
            signed_url = res["signed_url"]  # Alternative key format
        else:
            signed_url = str(res)
        
        # Verify token is present
        if "token=" in signed_url:
            print(f"   ✅ Signed URL has token: {signed_url[:80]}...{signed_url[-30:]}")
        else:
            print(f"   ⚠️ WARNING: Signed URL missing token! URL: {signed_url}")
            
        return signed_url
    except Exception as e:
        print(f"⚠️ Failed to sign URL for {path_or_url}: {e}")
        traceback.print_exc()
        return path_or_url

# --- WORKER 2: VIDEO EXPORT (CLEAN SPLIT SCREEN) ---


async def trigger_remotion_render(course_id: str, user_id: str):
    """
    Triggers the AWS Lambda Remotion render via CLI subprocess (Async).
    Uses asyncio.create_subprocess_exec to stream output without blocking the event loop.
    """
    print(f"🎬 Starting Remotion Lambda Render: {course_id}")
    
    # Update DB - doing this synchronously is fine as it's quick, or strictly should be cached/threaded
    # but supabase_admin currently is likely the sync client. We'll run it directly.
    try:
        supabase_admin.table("courses").update({
            "status": "Rendering with AWS Lambda...",
            "progress_phase": "compiling",
            "progress_current_step": 0,
            "progress_total_steps": 100
        }).eq("id", course_id).execute()
    except Exception as e:
        print(f"   ⚠️ DB Update Error: {e}")

    try:
        # 1. Fetch Data
        res = supabase_admin.table("courses").select("slide_data, accent_color").eq("id", course_id).execute()
        if not res.data: return
        course_data = res.data[0]
        slides = course_data.get('slide_data', [])
        accent_color = course_data.get('accent_color', '#14b8a6')

        # 1.5 Pre-sign URLs for Remotion Lambda (Needs public access)
        print("   🔑 Signing assets for Lambda...")
        for slide in slides:
            # Sign Audio (1 hour validity)
            if slide.get("audio") and not slide["audio"].startswith("http"):
                 slide["audio"] = get_asset_url(slide["audio"], 3600)
            
            # Sign Image (1 hour validity)
            if slide.get("image") and not slide["image"].startswith("http"):
                 slide["image"] = get_asset_url(slide["image"], 3600)

        # 2. Prepare Payload
        payload = {
            "slide_data": slides,
            "accent_color": accent_color
        }
        
        # Diagnostic: Log payload details
        total_duration_ms = sum(s.get('duration', 0) for s in slides)
        print(f"   📊 Payload: {len(slides)} slides, total duration: {total_duration_ms}ms ({total_duration_ms/1000:.1f}s)")
        
        # 3. Define Paths & Constants
        SERVE_URL = "https://remotionlambda-euwest2-wxjopockvc.s3.eu-west-2.amazonaws.com/sites/video-renderer/index.html"
        COMPOSITION_ID = "Main"
        current_dir = os.path.dirname(os.path.abspath(__file__))
        remotion_dir = os.path.join(os.path.dirname(current_dir), "remotion-renderer")
        
        # 4. Construct Command
        output_path = tempfile.mktemp(suffix=".mp4")
        
        # Ensure PATH includes node pointers (Mac specific fix)
        env = os.environ.copy()
        env["PATH"] = f"{env.get('PATH', '')}:/usr/local/bin:/opt/homebrew/bin"
        FUNCTION_NAME = "remotion-render-4-0-405-mem3008mb-disk4096mb-240sec"
        
        # Write props to temp file (synchronous I/O is acceptable here for small file)
        props_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        props_json = json.dumps(payload)
        props_file.write(props_json)
        props_file.close()
        
        cmd_args = [
            "npx", "remotion", "lambda", "render",
            SERVE_URL,
            COMPOSITION_ID,
            "--function-name", FUNCTION_NAME,
            "--props", props_file.name,
            "--output", output_path,
            "--log", "verbose",
            "--yes",
            "--frames-per-lambda", "600"
        ]
        
        print(f"   🚀 Running command: {' '.join(cmd_args[:6])}...")
        
        # 5. Execute Subprocess ASYNC
        process = await asyncio.create_subprocess_exec(
            *cmd_args,
            cwd=remotion_dir,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )

        # 6. Monitor Output for Progress
        last_progress_update = 0
        s3_url = None
        
        progress_pattern = re.compile(r"Rendering.*?(\d+)\s*/\s*(\d+)")
        s3_pattern = re.compile(r'https://s3[^"\s]+\.mp4')

        while True:
            line_bytes = await process.stdout.readline()
            if not line_bytes:
                break
            
            line = line_bytes.decode('utf-8').strip()
            if not line: continue

            # Check for S3 URL (look for "found" or just the URL? Be strict to avoid input URLs)
            # Remotion CLI typically outputs: "Cloud rendering complete: <url>"
            # But the regex matches any URL. We'll assume the LAST S3 URL seen is the output, 
            # OR we try to match the specific "Cloud rendering complete" or "Output:" context if possible.
            # For now, let's just log ALL matches and perform a stricter check or use the last one.
            s3_match = s3_pattern.search(line)
            if s3_match:
                # Only trust it if it doesn't look like an input asset (usually short signed urls are weird, 
                # but Remotion inputs are pre-signed).
                # The output URL is usually clean.
                potential_url = s3_match.group(0)
                print(f"   🔗 Found S3 URL in logs: {potential_url}")
                s3_url = potential_url # Update candidate (last one wins)

            # Check for Progress
            if "Rendering" in line:
                match = progress_pattern.search(line)
                if match:
                    current = int(match.group(1))
                    total = int(match.group(2))
                    if total > 0:
                        percent = int((current / total) * 100)
                        
                        if percent >= last_progress_update + 5:
                            last_progress_update = percent
                            print(f"   ⏳ Render Progress: {percent}% ({current}/{total})")
                            try:
                                supabase_admin.table("courses").update({
                                    "progress_current_step": percent
                                }).eq("id", course_id).execute()
                            except Exception as e:
                                print(f"   ⚠️ Failed to update progress: {e}")

        # Wait for completion
        return_code = await process.wait()
        
        if return_code != 0:
            raise Exception(f"Remotion CLI failed with code {return_code}")

        # 7. Download Result from S3
        if not s3_url:
             raise Exception("Could not find S3 URL in CLI output")
        
        print(f"   ⬇️ Downloading video from S3...")
        # Use httpx for async download if possible, else requests in thread
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(s3_url, timeout=120)
            if resp.status_code != 200:
                raise Exception(f"Failed to download from S3: HTTP {resp.status_code}")
            file_content = resp.content
            
        print("   ☁️  Uploading Final Video to Supabase...")
        # upload_asset is synchronous? If so, run it in thread.
        # Assuming upload_asset is sync for now based on previous code.
        video_url = await asyncio.to_thread(upload_asset, file_content, f"course_v2_{course_id}.mp4", "video/mp4", user_id)
        
        # 8. Complete
        supabase_admin.table("courses").update({
            "video_url": video_url,
            "status": "completed",
            "progress_current_step": 100
        }).eq("id", course_id).execute()
        print(f"✅ Remotion Video Ready: {video_url}")

    except Exception as e:
        print(f"❌ Remotion Trigger Error: {e}")
        # handle_failure is sync? run in thread? it's likely fine to run sync if it just updates DB.
        handle_failure(course_id, user_id, e, {"stage": "remotion_render"})

# --- ROUTES ---
@app.post("/create")
async def create_course(request: CourseRequest, background_tasks: BackgroundTasks):
    response = supabase.table("courses").insert({}).execute()
    course_id = response.data[0]['id']
    background_tasks.add_task(generate_disciplinary_course, course_id)
    return {"status": "started", "course_id": course_id}

@app.get("/status/{course_id}")
async def get_status(course_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase_admin.table("courses").select("*").eq("id", course_id).eq("user_id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    data = response.data[0]
    return {
        "status": data.get("status", "processing"), 
        "data": data.get("slide_data"), 
        "video_url": data.get("video_url"),
        "progress_phase": data.get("progress_phase"),
        "progress_current_step": data.get("progress_current_step"),
        "progress_total_steps": data.get("progress_total_steps")
    }

@app.post("/get-signed-url")
async def get_signed_url(request: Request, authorization: str = Header(None)):
    """
    Generate a fresh signed URL for a storage asset.
    
    This endpoint validates that the user owns the asset (path starts with their user_id)
    and returns a short-lived signed URL (15 minutes) for secure access.
    
    This ensures:
    - Users have unlimited access to their own content (fresh URLs on demand)
    - Shared URLs expire quickly and can't be used by others
    """
    user_id = get_user_id_from_token(authorization)
    
    body = await request.json()
    path = body.get("path")
    
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    # Handle legacy full signed URLs - extract the storage path
    if path.startswith("http"):
        # Legacy URL format: https://<project>.supabase.co/storage/v1/object/sign/course-assets/<user_id>/<filename>?token=...
        # We need to extract: <user_id>/<filename>
        try:
            # Find "course-assets/" in the URL and extract everything after it until "?"
            if "/course-assets/" in path:
                # Extract path after "course-assets/"
                after_bucket = path.split("/course-assets/")[1]
                # Remove query string (token)
                extracted_path = after_bucket.split("?")[0]
                path = extracted_path
                print(f"   🔄 Extracted path from legacy URL: {path}")
            else:
                raise HTTPException(status_code=400, detail="Invalid legacy URL format")
        except Exception as e:
            print(f"   ❌ Failed to parse legacy URL: {e}")
            raise HTTPException(status_code=400, detail="Could not parse legacy URL")
    
    # Security: Validate user owns this asset (path must start with their user_id)
    if not path.startswith(f"{user_id}/"):
        raise HTTPException(status_code=403, detail="Access denied to this asset")
    
    try:
        bucket = "course-assets"
        # Generate a fresh signed URL with 15-minute expiry (900 seconds)
        signed_url_response = supabase_admin.storage.from_(bucket).create_signed_url(path, 900)
        signed_url = signed_url_response.get("signedURL")
        
        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to generate signed URL")
        
        return {"signed_url": signed_url, "expires_in": 900}
    except Exception as e:
        print(f"❌ Signed URL Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate signed URL")

@app.get("/history")
async def get_history(authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase_admin.table("courses").select("id, created_at, status, name, metadata").eq("status", "completed").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
    return response.data

@app.post("/export-video/{course_id}")
async def export_video(
    course_id: str, 
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    user_id = get_user_id_from_token(authorization)
    background_tasks.add_task(trigger_remotion_render, course_id, user_id)
    return {"status": "export_started"}

@app.get("/subscription")
async def get_subscription(authorization: str = Header(None)):
    """
    Get the subscription level for the current user.
    """
    user_id = get_user_id_from_token(authorization)
    response = supabase.table("profiles").select("subscription_level").eq("id", user_id).single().execute()
    
    if not response.data:
        # Fallback if profile doesn't exist yet (should be created by trigger, but just in case)
        return {"subscription_level": "free"}
        
    return response.data


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
    
    # Pre-process long policies to remove boilerplate (uses DeepSeek V3)
    # This runs transparently - user doesn't need to know
    processed_policy = extract_policy_essence(request.policy_text)

    # Determine Jurisdiction/Language Context
    jurisdiction_prompt = ""
    if request.country.upper() == "UK":
        jurisdiction_prompt = (
            "JURISDICTION & LANGUAGE GUIDE:\n"
            "- LANGUAGE: Use British English (colour, organisations, programme, behaviour).\n"
            "- LEGAL RELIABILITY: Reference UK laws where applicable (e.g., Equality Act 2010, GDPR, Health and Safety at Work Act 1974).\n"
            "- TONE: Professional, slightly more formal but accessible."
        )
    else:
        jurisdiction_prompt = (
            "JURISDICTION & LANGUAGE GUIDE:\n"
            "- LANGUAGE: Use American English (color, organizations, program, behavior).\n"
            "- LEGAL RELIABILITY: Reference US laws where applicable (e.g., Title VII, ADA, OSHA, CCPA/GDPR where relevant).\n"
            "- TONE: Professional, direct and action-oriented."
        )

    prompt = (
    f"You are an expert instructional designer specializing in engaging, scenario-based video learning courses.\n\n"
    f"CONTEXT:\n"
    f"Policy Document: {processed_policy}\n"
    f"Video Duration: {request.duration} minutes\n"
    f"Target Country/Region: {request.country}\n"
    f"Format: Video Script Outline\n\n"
    f"{jurisdiction_prompt}\n\n"
    f"YOUR TASK:\n"
    f"1. Generate a compelling course title that captures the core value proposition (avoiding dry legal names)\n"
    f"2. Identify ONE primary learning objective (focus on behavioral change, e.g., 'recognize and report' vs 'understand the law')\n"
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
    f"CRITICAL INSTRUCTION FOR VIDEO SUITABILITY:\n"
    f"- Avoid mentioning specific software names; use more generic terms like 'all platforms' or 'video conferencing tool'.\n"
    f"- Do not just list rules. Structure topics around *applying* the rules.\n"
    f"- Transform 'lists of prohibited behaviors' into 'Scenario Recognition' topics.\n"
    f"- Ensure the tone favors Culture & Safety over Bureaucracy & Compliance.\n"
    f"- Prioritize 'Gray Areas' (e.g., Impact vs Intent) over black-and-white definitions.\n\n"
    f"Each topic should:\n"
    f"- Have clear learning value appropriate to the duration tier\n"
    f"- Build logically on previous topics\n"
    f"- Contain specific key points from the policy reframed as actionable advice or narrative hooks\n"
    f"- Indicate complexity level (simple/moderate/complex) to help allocate slides later\n\n"
    f"COMPLEXITY GUIDELINES:\n"
    f"- simple: Definitions, single concepts, straightforward rules (1-3 slides)\n"
    f"- moderate: Concepts illustrated with examples, standard procedures (3-5 slides)\n"
    f"- complex: Multi-step reporting processes, nuanced scenarios (like 'Impact vs Intent'), gray-area decision making (5-8 slides)\n\n"
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
    f"        \"Scenario hook or Key Concept 1\",\n"
    f"        \"Actionable takeaway 2\",\n"
    f"        \"Specific policy reference 3\"\n"
    f"      ],\n"
    f"      \"estimated_slides\": 3,\n"
    f"      \"depth_notes\": \"What level of detail this topic should cover for this duration\"\n"
    f"    }}\n"
    f"  ],\n"
    f"  \"total_estimated_slides\": 0\n"
    f"}}\n\n"
    f"CONSTRAINTS:\n"
    f"- RELIABILITY CHECK: Detect the jurisdiction from the text (e.g., UK Equality Act vs US Title VII) and ensure all topics align with that specific legal framework.\n"
    f"- First topic MUST be an engaging hook/introduction that sets context\n"
    f"- Last topic MUST be actionable summary/next steps\n"
    f"- Total estimated slides should be within {strategy['slide_range']}\n"
    f"- Topics must be specific to the policy content, not generic compliance topics\n"
    f"- Shorter durations should focus on critical/high-impact information\n"
    f"- Longer durations should cover more topics AND go deeper on each topic\n"
    f"- The 'complexity' field is CRITICAL for pacing. Be realistic.\n"
)
    
    try:
        res_text = replicate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=20000
        )
        # Parse JSON from response
        data = extract_json_from_response(res_text)
        
        # Extract fields with safe defaults
        topics = data.get("topics", [])
        title = data.get("title", "New Course")
        learning_objective = data.get("learning_objective", "Understand the policy key points.")
        
        return {
            "title": title,
            "learning_objective": learning_objective,
            "topics": topics,
            "processed_policy": processed_policy  # Return pre-processed text for script generation
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
async def generate_script(request: ScriptRequest, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    print("✍️ Generating Full Script...")

    # Validate User
    user_id = get_user_id_from_token(authorization)
    if user_id != request.user_id:
        raise HTTPException(status_code=403, detail="User ID mismatch")
    
    # Calculate approx slide count (3 slides per minute as per new rules)
    target_slides = request.duration * 3
    
    # Create Context Package
    topics_list = [t.dict() for t in request.topics]
    
    strategy = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
    
    # NOTE: Pre-processing is done in generate-plan endpoint
    # The policy_text from frontend is already condensed
    
    context_package = {
        "policy_text": request.policy_text,  # Already pre-processed from generate-plan
        "original_policy_text": request.policy_text,  # Same as policy_text now (already condensed)
        "title": request.title,
        "learning_objective": request.learning_objective,
        "topics": topics_list,
        "duration": request.duration,
        "target_slides": target_slides,
        "style_guide": STYLE_MAPPING.get(request.style, {"prompt": MINIMALIST_PROMPT})["prompt"],
        "strategy_tier": strategy["purpose"],
        "country": request.country
    }
    
    # Determine Jurisdiction/Language Context for Script
    jurisdiction_prompt = ""
    if request.country.upper() == "UK":
        jurisdiction_prompt = (
            "JURISDICTION & LANGUAGE RULES:\n"
            "- STRICTLY use British English spelling and terminology (e.g., 'colour', 'lift', 'flat', 'mobile').\n"
            "- Reference UK specific legal frameworks (Equality Act, HSE guidelines) if laws are mentioned.\n"
        )
    else:
        jurisdiction_prompt = (
            "JURISDICTION & LANGUAGE RULES:\n"
            "- STRICTLY use American English spelling and terminology (e.g., 'color', 'elevator', 'apartment', 'cell phone').\n"
            "- Reference US specific legal frameworks (Title VII, OSHA) if laws are mentioned.\n"
        )
    
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
        f"{jurisdiction_prompt}\n\n"
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
        f"- Avoid specific software names; use generic terms like 'all platforms' or 'the software'.\n"
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
        f"1. SUBJECT FOCUS: Prioritize relevant objects, diagrams, and conceptual visuals over human subjects. Use humans only when essential for context.\n"
        f"2. TEXT RENDERING: NEVER include text, letters, or numbers within images. The image should be entirely wordless. Focus on visual metaphors and symbols instead of labels or signs.\n\n"
        f"Template: \"Professional e-learning illustration: [SUBJECT] [ACTION/CONTEXT]. [VISUAL STYLE from guide]. [SPECIFIC DETAILS: clothing, setting, objects, composition]. [MOOD/EMOTION]. High quality, well-lit, modern corporate aesthetic.\"\n\n"
        f"Examples:\n"
        f"✅ OBJECT FOCUS: \"Professional e-learning illustration: A modern laptop displaying a generic 'Security Notification' shield icon. No text on screen. Soft glow from the screen, desk accessories like a coffee mug and notebook in the background. Minimalist office setting. Alert and focused mood. High quality, natural lighting, modern corporate aesthetic. No text or lettering.\"\n"
        f"✅ DIAGRAM FOCUS: \"Professional e-learning illustration: A conceptual 3D isometric flowchart showing data moving securely between three generic nodes. No labels or text. Clean lines, glowing blue connection paths. Airy white background. Organized and technical mood. High quality, crisp details, modern corporate aesthetic. Wordless composition.\"\n"
        f"✅ HUMAN FOCUS (use sparingly): \"Professional e-learning illustration: Diverse team of three reviewing documents at modern conference table. Medium shot showing hands pointing at papers, laptop visible. No readable text on papers or screen. Business casual attire, bright office with plants. Collaborative and focused mood. High quality, natural lighting, modern corporate aesthetic. Entirely wordless.\"\n\n"
        f"❌ BAD: \"People in meeting\"\n\n"
        f"- Vary subjects: Use a mix of objects, diagrams, and environments.\n"
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
        f"☐ Image prompts are detailed, varied, and STRICTLY wordless (no text)\n"
        f"☐ Layout distribution approximately matches 70/15/15\n"
        f"☐ Story flows logically from hook to conclusion\n"
        f"☐ Policy-specific information is included (not generic advice)\n"
    )

    # Create DB Entry EARLY so we can update status throughout the process
    metadata = {
        "topics": topics_list, 
        "style": request.style
    }
    
    try:
        response = supabase_admin.table("courses").insert({
            "status": "generating_script",  # Pre-processing already done in generate-plan
            "name": request.title,
            "metadata": metadata,
            "user_id": request.user_id,
            "accent_color": request.accent_color # Save preferenec
        }).execute()
        course_id = response.data[0]['id']
    except Exception as e:
        print(f"❌ DB Insert Error: {e}")
        return {"status": "error", "message": str(e)}
    
    # Start background task immediately - return early so frontend can poll
    background_tasks.add_task(
        generate_script_and_assets, 
        course_id, 
        base_prompt, 
        context_package, 
        request, 
        metadata
    )
    
    return {"status": "started", "course_id": course_id, "validation_enabled": ENABLE_SCRIPT_VALIDATION}


async def generate_script_and_assets(course_id: str, base_prompt: str, context_package: dict, request: ScriptRequest, metadata: dict):
    """
    Background task that handles script generation, validation, and triggers media generation.
    This runs asynchronously so the frontend can poll for status updates.
    """
    try:
        # Initialize progress tracking
        supabase_admin.table("courses").update({
            "progress_phase": "script",
            "progress_current_step": 0,
            "progress_total_steps": 0
        }).eq("id", course_id).execute()
        
        # NOTE: Pre-processing is now done in generate-plan endpoint
        # The policy_text in context_package is already condensed
        
        messages = [{"role": "user", "content": base_prompt}]
        script_plan = []
        max_retries = 2
        
        for attempt in range(max_retries):
            # Generate Script
            res_text = replicate_chat_completion(
                messages=messages,
                max_tokens=20000
            )
            data = extract_json_from_response(res_text)
            script_plan = data.get("script", [])
            
            # Update total steps now that we know the slide count
            total_slides = len(script_plan)
            supabase_admin.table("courses").update({
                "progress_total_steps": total_slides
            }).eq("id", course_id).execute()
            
            # Skip validation if disabled
            if not ENABLE_SCRIPT_VALIDATION:
                break
            
            # Update status and phase to validating
            supabase_admin.table("courses").update({
                "status": "validating",
                "progress_phase": "validation"
            }).eq("id", course_id).execute()
            
            validation_result = validate_script(script_plan, context_package)
            
            if validation_result['approved']:
                print("   ✅ Script Validation Passed")
                break
            
            # If failed, update status back to generating for retry
            print(f"   ⚠️ Script Validation Failed (Attempt {attempt+1}/{max_retries})")
            print(f"      Issues: {validation_result.get('issues', [])}")
            
            if attempt < max_retries - 1:
                supabase_admin.table("courses").update({"status": "generating_script"}).eq("id", course_id).execute()
                # Add context for retry
                messages.append({"role": "assistant", "content": res_text})
                # Include ungrounded claims in feedback for targeted revision
                ungrounded = validation_result.get('ungrounded_claims', [])
                ungrounded_feedback = ""
                if ungrounded:
                    ungrounded_feedback = f"\nUNGROUNDED/HALLUCINATED CLAIMS (MUST FIX): {json.dumps(ungrounded)}\n"
                
                feedback = (
                    f"CRITICAL QUALITY FEEDBACK - REVISION REQUIRED:\n"
                    f"The script above failed validation checks. Please rewrite sections or the whole script to address these issues:\n"
                    f"ISSUES: {json.dumps(validation_result.get('issues', []))}\n"
                    f"{ungrounded_feedback}"
                    f"SUGGESTIONS: {json.dumps(validation_result.get('suggestions', []))}\n"
                    f"Constraint Reminder: Must be exactly {context_package['target_slides']} slides and cover all specific policy details.\n"
                    f"CRITICAL: All claims MUST be verifiable from the original policy. Do not invent statistics, deadlines, or procedures."
                )
                messages.append({"role": "user", "content": feedback})
            else:
                print("   ⚠️ Max retries reached. Proceeding with best effort.")

        # Update metadata with validation result if available
        if ENABLE_SCRIPT_VALIDATION and 'validation_result' in locals():
            metadata["validation_last_result"] = validation_result
            supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()

        # --- PIPELINE STEP 2: VISUAL DIRECTOR ---
        # Enrich the script with visual types (Chart vs Image vs Hybrid)
        pipeline = PipelineManager()
        script_plan = pipeline.assign_visual_types(script_plan)

        # Determine Style Prompt and Accent Color
        style_config = STYLE_MAPPING.get(request.style, {
            "prompt": MINIMALIST_PROMPT,
            "default_accent": "#14b8a6",
            "default_color_name": "teal"
        })
        
        # Use user-selected color if provided, otherwise use style default
        accent_color = request.accent_color or style_config["default_accent"]
        color_name = request.color_name or style_config["default_color_name"]
        
        # Inject color into style prompt
        style_prompt = style_config["prompt"].format(primary_color=color_name)
        
        # --- PIPELINE STEP 3: INJECT BOOKEND SLIDES ---
        # Add welcome and thank you slides (after visual types to avoid AI touching them)
        script_plan = inject_bookend_slides(script_plan, request.title)
        
        # Run media generation directly (not as a separate background task since we're already in one)
        await generate_course_assets(course_id, script_plan, style_prompt, request.user_id, accent_color)
        
    except Exception as e:
        print(f"❌ Script Generation Error: {e}")
        handle_failure(course_id, request.user_id, e, metadata)

@app.delete("/course/{course_id}")
async def delete_course(course_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    
    # Verify ownership
    # Use admin client to verify because RLS policies might hide the record from the anon client
    # checking the user_id manually ensures security.
    res = supabase_admin.table("courses").select("user_id").eq("id", course_id).execute()
    
    if not res.data or res.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")

    # Delete
    supabase_admin.table("courses").delete().eq("id", course_id).execute()
    return {"status": "deleted"}