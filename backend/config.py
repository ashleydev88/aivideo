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

# --- INSTRUCTIONAL STRATEGIES BY COURSE PURPOSE ---
# These drive how the AI structures content and selects examples based on the course intent

INSTRUCTIONAL_STRATEGIES = {
    "onboarding": {
        "tone": "welcoming, encouraging, supportive",
        "structure": "progressive disclosure - start simple, build complexity",
        "emphasis": ["relevance to the new role", "core principles", "where to get help", "support resources"],
        "example_types": "new starter scenarios, first-time situations",
        "narrative_style": "You're joining a supportive team. Here's what you need to know to succeed.",
        "call_to_action": "Ask questions, reach out to your team, explore resources"
    },
    "compliance_training": {
        "tone": "authoritative, clear, serious but not intimidating",
        "structure": "rule-consequence-procedure - state requirement, explain why, show how to comply",
        "emphasis": ["non-negotiable requirements", "consequences of non-compliance", "reporting procedures", "correct actions"],
        "example_types": "policy violation scenarios with outcomes, correct vs incorrect actions",
        "narrative_style": "This is required. Here's why it matters and exactly what you must do.",
        "call_to_action": "Report concerns, document everything, escalate when unsure"
    },
    "leadership_development": {
        "tone": "empowering, reflective, challenging",
        "structure": "challenge-framework-application - present dilemma, provide model, practice applying",
        "emphasis": ["strategic application", "decision-making frameworks", "impact on team/organization"],
        "example_types": "leadership dilemmas, complex decision points, strategic choices",
        "narrative_style": "Great leaders aren't born—they're developed. Let's build your capabilities.",
        "call_to_action": "Reflect on your style, practice with your team, seek feedback"
    },
    "business_case": {
        "tone": "persuasive, data-driven, confident",
        "structure": "problem-solution-benefits - pain point, proposed solution, measurable outcomes",
        "emphasis": ["ROI and value", "competitive advantage", "risk mitigation", "implementation feasibility"],
        "example_types": "success metrics, before/after comparisons, value propositions",
        "narrative_style": "Here's the opportunity and exactly why we should act now.",
        "call_to_action": "Approve the investment, support the initiative, champion the change"
    },
    "custom": {
        "tone": "professional, clear, engaging",
        "structure": "flexible - adapt to content",
        "emphasis": ["key concepts", "practical application", "next steps"],
        "example_types": "relevant scenarios based on content",
        "narrative_style": "Let's explore this topic together.",
        "call_to_action": "Apply what you've learned"
    }
}

# --- AUDIENCE ADAPTATIONS ---
# These modify language level, jargon, and focus based on who is watching

AUDIENCE_ADAPTATIONS = {
    "employees": {
        "language_level": "accessible, everyday language",
        "jargon": "minimal - explain any technical terms",
        "focus": "practical application, what to do day-to-day",
        "assumed_knowledge": "general workplace awareness",
        "examples": "frontline scenarios, individual contributor situations"
    },
    "line_managers": {
        "language_level": "professional, managerial vocabulary",
        "jargon": "moderate - standard business terms acceptable",
        "focus": "team implementation, oversight responsibilities, escalation procedures",
        "assumed_knowledge": "people management basics, company structure",
        "examples": "team situations, performance conversations, delegation scenarios"
    },
    "senior_leadership": {
        "language_level": "executive, strategic vocabulary",
        "jargon": "industry-standard terminology expected",
        "focus": "strategic implications, governance, organizational impact",
        "assumed_knowledge": "business operations, market dynamics, regulatory landscape",
        "examples": "board-level decisions, cross-functional initiatives, stakeholder management"
    },
    "executives": {
        "language_level": "C-suite, investor-ready",
        "jargon": "full business fluency assumed",
        "focus": "shareholder value, competitive positioning, risk exposure",
        "assumed_knowledge": "deep business acumen, industry expertise",
        "examples": "market-moving decisions, M&A scenarios, investor communications"
    },
    "mixed": {
        "language_level": "clear and accessible, with depth for those who want it",
        "jargon": "explain on first use, then use naturally",
        "focus": "balanced - principles for all, specifics for specialists",
        "assumed_knowledge": "varied - layer content appropriately",
        "examples": "range of scenarios from individual to organizational"
    }
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

