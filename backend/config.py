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
LLM_MODEL_NAME = "google/gemini-3-pro"  # Primary Script Generator
TOPIC_GENERATOR_MODEL = "google/gemini-3-pro"
VISUAL_DIRECTOR_MODEL = "google/gemini-3-pro"
HYBRID_GENERATOR_MODEL = "google/gemini-3-flash"
KINETIC_GENERATOR_MODEL = "google/gemini-3-flash"
IMAGE_PROMPT_GENERATOR_MODEL = "google/gemini-3-flash"
VOICE_ID = "aHCytOTnUOgfGPn5n89j" 
ENABLE_SCRIPT_VALIDATION = True

from backend.prompts import (
    STYLE_MAPPING, 
    PEDAGOGY_INSTRUCTIONS, 
    LEARNING_ARCS,
    HYBRID_GENERATOR_PROMPT,
    KINETIC_GENERATOR_PROMPT,
    IMAGE_PROMPT_GENERATOR_PROMPT,
    MINIMALIST_PROMPT
)

# Frameworks that change based on the course goal (Duration Strategy)
# Frameworks are now imported from prompts.py

# --- DURATION STRATEGIES ---
DURATION_STRATEGIES = {
    # DEV ONLY - 1 minute option for quick testing
    1: {
        "pedagogical_goal": "Technical Verification",
        "structure_guide": "Intro -> single point -> Outro",
        "prompt_constraint": "Keep it extremely brief.",
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
        "pedagogical_goal": "Awareness & Immediate Compliance",
        "structure_guide": "The 'Warning Shot' -> The Rule -> The Action",
        "prompt_constraint": "Do not include history or background. Start immediately with the 'Why'. Limit to one core learning objective.",
        "purpose": "Micro-Burst - Executive briefing",
        "topic_count": "1-2 essential topics",
        "slide_range": "8-12 slides",
        "avg_slide_duration": "18-22 seconds",
        "depth_level": "Surface - what, why, critical actions only",
        "focus": "Compliance essentials, immediate actions, biggest risks",
        "slides_per_topic": "2-3 slides per topic",
        "content_priorities": ["Must-know compliance requirements", "Immediate actions required", "Biggest consequences of non-compliance"]
    },
    5: {
        "pedagogical_goal": "Skill Application",
        "structure_guide": "Context -> Step-by-Step Walkthrough -> Common Pitfalls",
        "prompt_constraint": "Focus on chronology. Use 'First, Then, Finally' signposting. Allocate 30% of words to 'Common Pitfalls'.",
        "purpose": "Procedural Flow - Foundational understanding",
        "topic_count": "3-4 core topics",
        "slide_range": "13-18 slides",
        "avg_slide_duration": "18-24 seconds",
        "depth_level": "Foundational - what, why, basic how",
        "focus": "Core concepts, basic procedures, common scenarios",
        "slides_per_topic": "3-4 slides per topic",
        "content_priorities": ["Key policy principles", "Basic procedures", "Most common scenarios", "Where to get help"]
    },
    10: {
        "pedagogical_goal": "Judgment & Nuance",
        "structure_guide": "Principle -> Realistic Scenario (Story) -> Analysis of Scenario -> Recap",
        "prompt_constraint": "Generate a fictional workplace scenario involving two characters (Manager and Employee) to illustrate the gray areas of this policy.",
        "purpose": "Scenario Analyst - Applied knowledge",
        "topic_count": "5-6 key topics",
        "slide_range": "28-35 slides",
        "avg_slide_duration": "18-25 seconds",
        "depth_level": "Applied - what, why, how, with examples",
        "focus": "Detailed procedures, multiple examples, practical application",
        "slides_per_topic": "4-5 slides per topic",
        "content_priorities": ["Complete procedures step-by-step", "Real-world examples", "Common mistakes to avoid", "Decision-making frameworks"]
    },
    15: {
        "pedagogical_goal": "Deep Understanding & Synthesis",
        "structure_guide": "Intro -> Module 1 (Concepts) -> Module 2 (Process) -> Module 3 (Enforcement) -> Summary",
        "prompt_constraint": "Ensure clear separation between modules. Summarize key takeaways at the end of each module.",
        "purpose": "Modular Masterclass - Mastery level",
        "topic_count": "8-10 detailed topics",
        "slide_range": "42-52 slides",
        "avg_slide_duration": "18-28 seconds",
        "depth_level": "Comprehensive - what, why, how, when, edge cases",
        "focus": "All aspects covered, edge cases, decision trees, complex scenarios",
        "slides_per_topic": "5-6 slides per topic",
        "content_priorities": ["All procedures in detail", "Edge cases and exceptions", "Complex scenarios", "Integration with other policies", "Legal/regulatory context"]
    },
    20: {
        "pedagogical_goal": "Complete Mastery",
        "structure_guide": "Comprehensive deep dive into all aspects",
        "prompt_constraint": "Exhaustive coverage required.",
        "purpose": "Expert certification",
        "topic_count": "10-13 comprehensive topics",
        "slide_range": "55-68 slides",
        "avg_slide_duration": "18-30 seconds",
        "depth_level": "Exhaustive - everything including rare situations, legal context, interconnections",
        "focus": "Exhaustive coverage, rare scenarios, legal nuances, cross-policy implications",
        "slides_per_topic": "5-7 slides per topic",
        "content_priorities": ["Exhaustive policy coverage", "Rare and complex scenarios", "Legal and regulatory details", "Cross-policy interactions", "Advanced decision-making", "Change management"]
    }
}

# --- AUDIENCE STRATEGIES ---
# Unified configuration for the 3 audience types
# Each audience carries tone, structure, and extraction hints

AUDIENCE_STRATEGIES = {
    "new_hires": {
        "display_name": "New Hires",
        "tone": "welcoming, encouraging, supportive",
        "structure": "progressive disclosure - start simple, build familiarity",
        "emphasis": ["relevance to new role", "core principles", "where to get help", "support resources"],
        "example_types": "first-time scenarios, common new starter questions",
        "narrative_style": "Welcome to the team. Here's what you need to know to get started.",
        "call_to_action": "Ask questions, reach out to your manager, explore resources",
        "language_level": "accessible, jargon-free, encouraging",
        "focus_areas": [
            "what this means for you as a new starter",
            "basic procedures to follow",
            "who to contact for help",
            "key terms and definitions explained simply",
            "timelines and expectations",
            "support and resources available"
        ],
        "extraction_prompt": "Focus on what a new employee needs to know on day one. Extract foundational concepts, key contacts, and simple procedures. Keep it welcoming and not overwhelming."
    },
    "all_employees": {
        "display_name": "All Employees",
        "tone": "clear, authoritative, professional but approachable",
        "structure": "rule-consequence-action - state requirement, explain why, show how to comply",
        "emphasis": ["mandatory requirements", "consequences of non-compliance", "correct actions", "reporting procedures"],
        "example_types": "common scenarios, policy violations with outcomes, correct vs incorrect actions",
        "narrative_style": "This is what you need to know and do. Here's why it matters.",
        "call_to_action": "Follow the process, report concerns, document everything",
        "language_level": "accessible with key terms explained",
        "focus_areas": [
            "your rights and responsibilities",
            "step-by-step procedures to follow",
            "how to report issues or concerns",
            "what to expect during processes",
            "timelines and deadlines",
            "consequences of non-compliance"
        ],
        "extraction_prompt": "Focus on what every employee must know and do. Extract mandatory requirements, procedures, rights, and consequences. Keep it clear and actionable."
    },
    "leadership": {
        "display_name": "Leadership",
        "tone": "empowering, strategic, challenging",
        "structure": "challenge-framework-application - present dilemma, provide model, practice applying",
        "emphasis": ["decision-making authority", "team implementation", "escalation procedures", "oversight responsibilities"],
        "example_types": "leadership dilemmas, complex decisions, edge cases, team scenarios",
        "narrative_style": "As a leader, here's how you implement, enforce, and make decisions.",
        "call_to_action": "Lead by example, coach your team, escalate when appropriate",
        "language_level": "professional, managerial vocabulary",
        "focus_areas": [
            "your responsibilities as a manager/leader",
            "how to conduct procedures and conversations",
            "decision-making authority and limits",
            "when and how to escalate",
            "documentation requirements",
            "team communication",
            "handling exceptions and edge cases"
        ],
        "extraction_prompt": "Focus on what managers and leaders need to implement and enforce this policy. Extract procedural responsibilities, decision frameworks, escalation paths, and team management guidance."
    }
}

AUDIENCE_LEGACY_MAP = {
    "General": "all_employees",
    "Managers": "leadership",
    "New Hires": "new_hires",
    "Executive": "leadership",
    # Pass-throughs
    "all_employees": "all_employees",
    "leadership": "leadership",
    "new_hires": "new_hires"
}

# --- UPLOAD LIMITS ---
# Constraints for document uploads during intake

UPLOAD_LIMITS = {
    "max_files": 5,
    "max_file_size_mb": 10,
    "max_total_size_mb": 25,
    "allowed_extensions": [".pdf", ".docx", ".txt"],
    "max_text_chars": 100000  # ~40-50 pages of text
}

