import os
from dotenv import load_dotenv

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
ENABLE_SCRIPT_VALIDATION = True

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
