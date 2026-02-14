import asyncio
import json
import hashlib
import math
import time
import tempfile
import os
from io import BytesIO
from PIL import Image
from moviepy.editor import AudioFileClip

from backend.config import (
    DURATION_STRATEGIES,
    STYLE_MAPPING,
    MINIMALIST_PROMPT,
    ENABLE_SCRIPT_VALIDATION,
    TOPIC_GENERATOR_MODEL,
    PEDAGOGY_INSTRUCTIONS,
    LEARNING_ARCS,
    LLM_MODEL_NAME,
    HYBRID_GENERATOR_MODEL,
    KINETIC_GENERATOR_MODEL,
    HYBRID_GENERATOR_PROMPT,
    KINETIC_GENERATOR_PROMPT,
    IMAGE_PROMPT_GENERATOR_MODEL,
    IMAGE_PROMPT_GENERATOR_PROMPT_SINGLE,
    BATCH_IMAGE_PROMPT_GENERATOR_PROMPT
)
from backend.db import supabase_admin
from backend.services.ai import anthropic_chat_completion, generate_image_replicate, extract_policy_essence
from backend.services.pipeline import PipelineManager, validate_script
from backend.services.audio import generate_audio
from backend.services.storage import upload_asset_throttled, handle_failure, get_asset_url
from backend.services.sqs_producer import send_render_job_async
from backend.services.slide_data import normalize_slides, sign_slide_assets_inplace
from backend.services.timing import build_slide_timing_plan
from backend.utils.helpers import extract_json_from_response, parse_alignment_to_words
from backend.schemas import ScriptRequest
from backend.services.logic_extraction import logic_extractor

# Helpers / Shared Logic

def convert_bytes_to_webp(image_bytes: bytes) -> bytes:
    """
    Converts image bytes (JPEG/PNG) to WebP format.
    """
    try:
        img = Image.open(BytesIO(image_bytes))
        output = BytesIO()
        img.save(output, format="WEBP", quality=85, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"⚠️ WebP Conversion Failed: {e}")
        return image_bytes


def is_assessment_slide(slide: dict) -> bool:
    return bool(slide.get("is_assessment") or slide.get("assessment_data"))


def normalize_assessment_data(raw: dict | None) -> dict:
    data = raw or {}
    options = data.get("options")
    if not isinstance(options, list) or len(options) < 2:
        options = ["Option A", "Option B"]

    correct_index = data.get("correct_index", 0)
    if not isinstance(correct_index, int):
        try:
            correct_index = int(correct_index)
        except Exception:
            correct_index = 0
    if correct_index < 0 or correct_index > len(options) - 1:
        correct_index = 0

    points = data.get("points", 1)
    if not isinstance(points, int):
        try:
            points = int(points)
        except Exception:
            points = 1
    if points < 1:
        points = 1

    return {
        "question": str(data.get("question", "Quick check")),
        "options": [str(o) for o in options],
        "correct_index": correct_index,
        "explanation": str(data.get("explanation", "")),
        "points": points,
    }


def build_render_slides_and_assessment_cues(slides: list[dict]) -> tuple[list[dict], list[dict]]:
    render_slides: list[dict] = []
    assessment_cues: list[dict] = []
    elapsed_ms = 0

    for idx, slide in enumerate(slides or []):
        if is_assessment_slide(slide):
            assessment_cues.append({
                "slide_number": idx + 1,
                "at_ms": max(0, int(elapsed_ms)),
                "assessment_data": normalize_assessment_data(slide.get("assessment_data")),
            })
            continue

        render_slides.append(slide)
        duration_ms = slide.get("duration", 0)
        try:
            duration_ms = int(duration_ms)
        except Exception:
            duration_ms = 0
        elapsed_ms += max(0, duration_ms)

    return render_slides, assessment_cues


def build_assessment_entries(slides: list[dict]) -> list[dict]:
    entries: list[dict] = []
    for idx, slide in enumerate(slides or []):
        if is_assessment_slide(slide) and slide.get("assessment_data"):
            entries.append({
                "slide_number": idx + 1,
                "assessment_data": normalize_assessment_data(slide.get("assessment_data")),
            })
    return entries



async def generate_draft_visuals(course_id: str, script_plan: list, style_prompt: str, user_id: str, seed: int = None, protagonist: str = ""):
    """
    Phase 1 Generation: Generates Images and Charts ONLY.
    Runs before user review so they can see the visuals in the slide editor.
    """
    print(f"🎨 Generating Draft Visuals for {course_id}...")
    supabase_admin.table("courses").update({"status": "drafting_visuals"}).eq("id", course_id).execute()
    
    api_semaphore = asyncio.Semaphore(4)

    async def process_visual_parallel(i, slide):
        async with api_semaphore:
            # Persist existing assets if re-running
            if slide.get("image") and slide["image"].startswith("http"):
                 return slide
            
            visual_type = slide.get("visual_type", "image")
            image_url = slide.get("image")
            chart_data = slide.get("chart_data")
            layout_data = slide.get("layout_data", {})
            
            # Generate Chart Data (Logic Extraction)
            if visual_type == "chart" and not chart_data:
                try:
                    text_context = f"{slide.get('slide_title', '')}\n{slide['text']}"
                    graph_model = await logic_extractor.extract_from_text(text_context)
                    chart_data = graph_model.model_dump()
                except Exception as e:
                     print(f"⚠️ Logic Extraction Failed: {e}")
                     visual_type = "kinetic_text" # Fallback
            
            # Generate Image for standard layouts (image, hybrid)
            if visual_type in ["image", "hybrid"] and not image_url:
                full_prompt = f"{style_prompt}. {slide['prompt']}"
                if protagonist:
                    full_prompt += f" Featuring {protagonist}."
                image_data = await asyncio.to_thread(generate_image_replicate, full_prompt, seed)
                
                if image_data:
                    # Convert to WebP
                    image_data = await asyncio.to_thread(convert_bytes_to_webp, image_data)
                    
                    image_filename = f"visual_{i}_{int(time.time())}.webp"
                    image_url = await upload_asset_throttled(image_data, image_filename, "image/webp", user_id, course_id=course_id, max_retries=5)
                else:
                    visual_type = "kinetic_text" # Fallback
            
            # Generate Background Image for contextual_overlay
            if visual_type == "contextual_overlay" and not image_url:
                # Use background_prompt from layout_data if available, otherwise use slide prompt
                bg_prompt = layout_data.get("background_prompt", slide.get("prompt", ""))
                if bg_prompt:
                    full_prompt = f"{style_prompt}. {bg_prompt}. Cinematic, atmospheric, suitable as a background."
                    image_data = await asyncio.to_thread(generate_image_replicate, full_prompt, seed)
                    
                    if image_data:
                        image_data = await asyncio.to_thread(convert_bytes_to_webp, image_data)
                        image_filename = f"overlay_bg_{i}_{int(time.time())}.webp"
                        image_url = await upload_asset_throttled(image_data, image_filename, "image/webp", user_id, course_id=course_id, max_retries=5)
                    else:
                        print(f"⚠️ Contextual overlay image failed, falling back to kinetic_text")
                        visual_type = "kinetic_text"
            
            # comparison_split: Typography-focused by default, but can generate contrast images if prompts provided
            if visual_type == "comparison_split" and not image_url:
                left_prompt = layout_data.get("left_prompt")
                right_prompt = layout_data.get("right_prompt")
                
                # Only generate images if explicit prompts are provided
                if left_prompt and right_prompt:
                    # Generate left (negative) image
                    left_full_prompt = f"{style_prompt}. {left_prompt}. Subtle red or warning tone."
                    if protagonist:
                         left_full_prompt += f" Featuring {protagonist}."
                    left_image_data = await asyncio.to_thread(generate_image_replicate, left_full_prompt, seed)
                    
                    # Generate right (positive) image
                    right_full_prompt = f"{style_prompt}. {right_prompt}. Subtle green or success tone."
                    if protagonist:
                        right_full_prompt += f" Featuring {protagonist}."
                    right_image_data = await asyncio.to_thread(generate_image_replicate, right_full_prompt, seed)
                    
                    if left_image_data and right_image_data:
                        left_image_data = await asyncio.to_thread(convert_bytes_to_webp, left_image_data)
                        right_image_data = await asyncio.to_thread(convert_bytes_to_webp, right_image_data)
                        
                        left_filename = f"compare_left_{i}_{int(time.time())}.webp"
                        right_filename = f"compare_right_{i}_{int(time.time())}.webp"
                        
                        left_url = await upload_asset_throttled(left_image_data, left_filename, "image/webp", user_id, course_id=course_id, max_retries=5)
                        right_url = await upload_asset_throttled(right_image_data, right_filename, "image/webp", user_id, course_id=course_id, max_retries=5)
                        
                        # Store both in layout_data
                        layout_data["left_image"] = left_url
                        layout_data["right_image"] = right_url
                        slide["layout_data"] = layout_data
                # If no image prompts, the renderer will use typography only
            
            # document_anchor and key_stat_breakout are typography-focused, no image generation needed
            # Just ensure layout_data is properly set
            
            # Update Slide
            slide["image"] = image_url
            slide["chart_data"] = chart_data
            if chart_data and chart_data.get("title"):
                 slide["visual_text"] = chart_data["title"]
            slide["visual_type"] = visual_type
            return slide

    try:
        tasks = [process_visual_parallel(i, slide) for i, slide in enumerate(script_plan)]
        updated_slides = await asyncio.gather(*tasks)
        return updated_slides
    except Exception as e:
        print(f"❌ Visual Draft Error: {e}")
        return script_plan


async def generate_topics_task(
    course_id: str, 
    policy_text: str, 
    duration: int, 
    country: str, 
    user_provided_title: str = None,
    target_audience: str = "all_employees",
    discovery_context: dict = None
):
    """
    Background worker to generate topics and update DB.
    Uses a SOURCE-FIRST approach: extract topics from document, then adapt for audience.
    When no documents provided, uses discovery context (topic, learning_outcomes, additional_context).
    """
    # Extract discovery context if provided
    discovery_topic = discovery_context.get("topic", "") if discovery_context else ""
    discovery_outcomes = discovery_context.get("learning_outcomes", []) if discovery_context else []
    discovery_additional = discovery_context.get("additional_context", "") if discovery_context else ""
    
    print(f"   🏗️ Worker: Generating topics for {course_id} (audience={target_audience}, topic='{discovery_topic}')...")
    
    try:
        # Import strategies here to avoid circular imports
        from backend.config import AUDIENCE_STRATEGIES, AUDIENCE_LEGACY_MAP, LOCALE_CONFIG
        
        # Map legacy audience values to new ones
        if target_audience in AUDIENCE_LEGACY_MAP:
            target_audience = AUDIENCE_LEGACY_MAP[target_audience]
        
        # If no policy text provided, try to load from DB
        if not policy_text:
            res = supabase_admin.table("courses").select("source_document_text").eq("id", course_id).execute()
            if res.data and res.data[0].get("source_document_text"):
                policy_text = res.data[0]["source_document_text"]
        
        # Get audience strategy (unified config with tone, structure, and extraction hints)
        audience_strategy = AUDIENCE_STRATEGIES.get(target_audience, AUDIENCE_STRATEGIES["all_employees"])
        duration_config = DURATION_STRATEGIES.get(duration, DURATION_STRATEGIES[5])
        
        # Pre-process policy if available
        processed_policy = ""
        if policy_text:
            processed_policy = await asyncio.to_thread(extract_policy_essence, policy_text)

        # Build jurisdiction and localization context
        # Default to UK if country not found or unexpected
        country_key = country.upper() if country else "UK"
        loc_config = LOCALE_CONFIG.get(country_key, LOCALE_CONFIG["UK"])
        
        jurisdiction_context = loc_config["legal_context"]
        language_instruction = loc_config["language_instruction"]

        # SOURCE-FIRST PROMPT: Extract from document, then adapt for audience
        if processed_policy:
            from backend.prompts import TOPIC_GENERATION_PROMPT
            
            prompt = TOPIC_GENERATION_PROMPT.format(
                source_document=processed_policy,
                audience_display_name=audience_strategy['display_name'].upper(),
                extraction_prompt=audience_strategy['extraction_prompt'],
                focus_areas='\n'.join(f"- {area}" for area in audience_strategy['focus_areas']),
                tone=audience_strategy['tone'],
                structure=audience_strategy['structure'],
                language_level=audience_strategy['language_level'],
                narrative_style=audience_strategy['narrative_style'],
                call_to_action=audience_strategy['call_to_action'],
                duration=duration,
                purpose=duration_config['purpose'],
                pedagogical_goal=duration_config.get('pedagogical_goal', 'Effective Training'),
                topic_count=duration_config['topic_count'],
                depth_level=duration_config['depth_level'],
                content_priorities=', '.join(duration_config['content_priorities']),
                jurisdiction_context=jurisdiction_context,
                language_instruction=language_instruction
            )
        else:
            # No source document - Use discovery context for topic generation
            # Build outcomes section if available
            outcomes_section = ""
            if discovery_outcomes:
                outcomes_section = f"""
USER'S DESIRED LEARNING OUTCOMES (MUST address these):
{chr(10).join(f"- {outcome}" for outcome in discovery_outcomes)}
"""
            
            # Build additional context section if available
            additional_section = ""
            if discovery_additional:
                additional_section = f"""
ADDITIONAL CONTEXT FROM USER:
{discovery_additional}
"""
            
            prompt = f"""You are an expert instructional designer creating engaging corporate training.

=== USER DISCOVERY CONTEXT (PRIMARY GUIDANCE) ===

TRAINING TOPIC: {discovery_topic if discovery_topic else "General corporate training"}
{outcomes_section}
{additional_section}

=== AUDIENCE CONTEXT ===

- Target Audience: {audience_strategy['display_name']}
- Tone: {audience_strategy['tone']}
- Structure: {audience_strategy['structure']}
- Language Level: {audience_strategy['language_level']}
- Key Emphasis: {', '.join(audience_strategy['emphasis'])}
- Example Types: {audience_strategy['example_types']}
- Narrative Style: "{audience_strategy['narrative_style']}"
- Call to Action: {audience_strategy['call_to_action']}

=== DURATION CALIBRATION ===

Creating a {duration}-MINUTE course:
- Purpose: {duration_config['purpose']}
- Pedagogical Goal: {duration_config.get('pedagogical_goal', 'Effective Training')}
- Topic Count: {duration_config['topic_count']}
- Depth Level: {duration_config['depth_level']}
- Content Priorities: {', '.join(duration_config['content_priorities'])}

{jurisdiction_context}
LANGUAGE: Please {language_instruction}

=== YOUR TASK ===

Generate a comprehensive course plan for "{discovery_topic if discovery_topic else 'the requested training'}" that:
1. Addresses ALL the user's desired learning outcomes
2. Uses industry best practices and expert knowledge
3. Is tailored to the {audience_strategy['display_name']} audience
4. Fits the {duration}-minute duration with {duration_config['topic_count']} topics

CRITICAL: Since no specific internal policies were provided, you must:
- Base all content on GENERAL INDUSTRY BEST PRACTICES
- Make NO ASSUMPTIONS about the user's specific internal processes
- Explicitly advise learners to "check their local policies and processes" for specifics

=== OUTPUT FORMAT (JSON) ===
{{
  "title": "Engaging Course Title for {discovery_topic if discovery_topic else 'this training'}",
  "learning_objective": "Clear, measurable learning outcome",
  "document_type_detected": "Best Practice Guide (Generic)",
  "topics": [
    {{
      "id": 1,
      "title": "Topic Title",
      "purpose": "What learners will understand/be able to do",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "estimated_slides": 3,
      "complexity": "simple|moderate|complex"
    }}
  ]
}}

REQUIREMENTS:
- Topics MUST support the user's desired learning outcomes
- Follow the {duration_config['topic_count']} topic guideline
- Focus on: {', '.join(duration_config['content_priorities'][:3])}
"""


        res_text = await asyncio.to_thread(
            anthropic_chat_completion,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            model=TOPIC_GENERATOR_MODEL,
            telemetry={
                "course_id": course_id,
                "stage": "topic_generation",
                "agent_name": "topic_generator"
            }
        )
        data = extract_json_from_response(res_text)
        
        # Use user-provided title if available, otherwise use generated title
        course_title = user_provided_title if user_provided_title else data.get("title", "New Course")

        # Fetch existing metadata to preserve fields like logo_url, custom_title, style
        existing_res = supabase_admin.table("courses").select("metadata").eq("id", course_id).execute()
        existing_metadata = existing_res.data[0].get("metadata", {}) if existing_res.data else {}

        # Update metadata with enhanced context
        new_metadata = {
            **existing_metadata,
            "duration": duration,
            "country": country,
            "topics": data.get("topics", []),
            "learning_objective": data.get("learning_objective", ""),
            "processed_policy": processed_policy if processed_policy else None,
            # Store the audience strategy used for later reference
            "audience_strategy": audience_strategy,
            "duration_strategy": duration_config
        }

        # Update DB
        supabase_admin.table("courses").update({
            "status": "reviewing_topics",
            "progress_phase": "topics_ready",
            "progress": 100,
            "name": course_title,
            "metadata": new_metadata
        }).eq("id", course_id).execute()
        print(f"   ✅ Topics generated for {course_id}")

    except Exception as e:
        print(f"   ❌ Topic Gen Failed: {e}")
        handle_failure(course_id, "system", e, {"stage": "generate_topics"})


async def generate_structure_task(course_id: str, context_package: dict, request: ScriptRequest, metadata: dict):
    """
    Generates Script Plan, Visual Plan, and Kinetic Text Plan.
    STOPS before audio/image generation.
    """
    try:
        strategy = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
        topics_list = context_package['topics']
        avg_slides_per_topic = math.floor(context_package['target_slides'] / len(topics_list)) if topics_list else 3
        
        # Get Localization Config
        from backend.config import LOCALE_CONFIG
        country = metadata.get("country", "UK")
        country_key = country.upper() if country else "UK"
        loc_config = LOCALE_CONFIG.get(country_key, LOCALE_CONFIG["UK"])
        language_instruction = loc_config["language_instruction"]

        # 1. Determine the Learning Arc based on duration/purpose
        # Logic: Short courses are 'compliance', medium are 'skill', long are 'executive' (or map to specific duration IDs)
        if context_package['duration'] <= 3:
            learning_arc = LEARNING_ARCS['compliance']
        elif context_package['duration'] <= 10:
            learning_arc = LEARNING_ARCS['skill']
        else:
            learning_arc = LEARNING_ARCS['skill'] # Default fallback

        # 2. Construct the "World Class" Chain-of-Thought Prompting Strategy
        
        # STEP 1: HIGH-LEVEL OUTLINE (The Architecture)
        # We ask for just the slide titles and concepts first to ensure the arc is solid.
        from backend.prompts import OUTLINE_GENERATOR_PROMPT
        
        outline_prompt = OUTLINE_GENERATOR_PROMPT.format(
            title=context_package['title'],
            audience=context_package['audience_strategy']['display_name'],
            duration=context_package['duration'],
            target_slides=context_package['target_slides'],
            learning_arc=learning_arc,
            language_instruction=language_instruction
        )
        print("   🧠 Step 1: Generating Course Outline...")
        outline_res = await asyncio.to_thread(
            anthropic_chat_completion,
            messages=[{"role": "user", "content": outline_prompt}],
            max_tokens=4000,
            telemetry={
                "course_id": course_id,
                "user_id": request.user_id,
                "stage": "outline_generation",
                "agent_name": "outline_generator"
            }
        )
        outline_data = extract_json_from_response(outline_res)
        outline = outline_data.get("outline", [])
        
        # STEP 2: DETAILED SCRIPTING (The Director)
        # Now we flesh out the details using the approved outline.
        from backend.prompts import SCRIPT_GENERATOR_PROMPT, SAFETY_AND_LIABILITY_GUARDRAILS
        
        base_prompt = SCRIPT_GENERATOR_PROMPT.format(
            audience=context_package['audience_strategy']['display_name'],
            tone=context_package['audience_strategy']['tone'],
            narrative_style=context_package['audience_strategy']['narrative_style'],
            source_material=context_package.get('policy_text', 'No source provided')[:3000],
            safety_guardrails=SAFETY_AND_LIABILITY_GUARDRAILS,
            pedagogy_cognitive=PEDAGOGY_INSTRUCTIONS['cognitive_load'],
            pedagogy_multimedia=PEDAGOGY_INSTRUCTIONS['multimedia_principles'],
            pedagogy_visual=PEDAGOGY_INSTRUCTIONS['visual_logic'],
            outline_json=json.dumps(outline, indent=2),
            title=context_package['title'],
            language_instruction=language_instruction
        )
        
        messages = [{"role": "user", "content": base_prompt}]
        script_plan = []
        max_retries = 3
        
        for attempt in range(max_retries):
            res_text = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=messages,
                max_tokens=20000,
                model=LLM_MODEL_NAME,
                telemetry={
                    "course_id": course_id,
                    "user_id": request.user_id,
                    "stage": "script_generation",
                    "agent_name": "script_generator",
                    "metadata": {"attempt": attempt + 1}
                }
            )
            data = extract_json_from_response(res_text)
            script_plan = data.get("script", [])
            
            if not ENABLE_SCRIPT_VALIDATION:
                break
                
            supabase_admin.table("courses").update({
                "status": "validating",
                "progress_phase": "validation"
            }).eq("id", course_id).execute()
            
            validation_result = await asyncio.to_thread(validate_script, script_plan, context_package)
            
            if validation_result['approved']:
                print("   ✅ Script Validation Passed")
                break
            
            print(f"   ⚠️ Script Validation Failed (Attempt {attempt+1}/{max_retries})")
            
            # Print specific failure reasons to console
            print(f"      Issues found: {len(validation_result.get('issues', []))}")
            for issue in validation_result.get('issues', []):
                print(f"      - {issue}")

            if attempt < max_retries - 1:
                supabase_admin.table("courses").update({"status": "generating_structure"}).eq("id", course_id).execute()
                messages.append({"role": "assistant", "content": res_text})
                
                # Construct detailed feedback including scores
                scores_summary = (
                    f"Fact-Check: {validation_result.get('fact_check_score', 'N/A')}/10, "
                    f"Completeness: {validation_result.get('completeness_score', 'N/A')}/10, "
                    f"Coherence: {validation_result.get('coherence_score', 'N/A')}/10, "
                    f"Accuracy: {validation_result.get('accuracy_score', 'N/A')}/10, "
                    f"Image Diversity: {validation_result.get('image_diversity_score', 'N/A')}/10"
                )
                
                feedback = (
                    f"CRITICAL QUALITY FEEDBACK (Validation Failed):\n"
                    f"SCORES: {scores_summary}\n"
                    f"ISSUES: {json.dumps(validation_result.get('issues', []))}\n"
                    f"Ungrounded Claims: {json.dumps(validation_result.get('ungrounded_claims', []))}\n"
                    f"Constraint Reminder: Must be exactly {context_package['target_slides']} slides.\n"
                    f"Fix these issues specifically. Ensure ALL scores are 7+ and Fact-Check is 8+."
                )
                messages.append({"role": "user", "content": feedback})
            else:
                # FINAL FAILURE - HALT PIPELINE
                print(f"❌ Script Validation Failed after {max_retries} attempts. HALTING.")
                metadata["validation_errors"] = validation_result.get("issues", [])
                metadata["validation_last_result"] = validation_result
                metadata["ungrounded_claims"] = validation_result.get("ungrounded_claims", [])
                
                supabase_admin.table("courses").update({
                    "status": "needs_human_review",
                    "metadata": metadata,
                    "slide_data": script_plan # Save what we have so user can edit
                }).eq("id", course_id).execute()
                
                return # STOP THE PIPELINE

        if ENABLE_SCRIPT_VALIDATION and 'validation_result' in locals() and validation_result.get('approved', False):
            metadata["validation_last_result"] = validation_result
            supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()

        # Visual Director
        print("   🎬 AI: Assigning Visual Types...")
        pipeline = PipelineManager()
        script_plan = await pipeline.assign_visual_types(script_plan)
        
        # --- NEW SPECIALIZED VISUAL TEXT GENERATION ---
        print("   ✍️ AI: Generating Specialized Visual Text...")
        
        async def refine_visual_text(slide):
            vtype = slide.get("visual_type")
            title = slide.get("slide_title", "")
            narration = slide.get("text", "")
            
            if vtype == "chart":
                slide["visual_text"] = "" # Defer to LogicExtractor
                return slide
            
            if vtype == "hybrid":
                prompt = HYBRID_GENERATOR_PROMPT.format(title=title, narration=narration)
                res = await asyncio.to_thread(
                    anthropic_chat_completion,
                    messages=[{"role": "user", "content": prompt}],
                    model=HYBRID_GENERATOR_MODEL,
                    telemetry={
                        "course_id": course_id,
                        "user_id": request.user_id,
                        "stage": "visual_text_hybrid",
                        "agent_name": "hybrid_text_refiner"
                    }
                )
                data = extract_json_from_response(res)
                slide["visual_text"] = data.get("visual_text", title) # Fallback to title
                return slide
            
            if vtype == "kinetic_text":
                prompt = KINETIC_GENERATOR_PROMPT.format(title=title, narration=narration)
                res = await asyncio.to_thread(
                    anthropic_chat_completion,
                    messages=[{"role": "user", "content": prompt}],
                    model=KINETIC_GENERATOR_MODEL,
                    telemetry={
                        "course_id": course_id,
                        "user_id": request.user_id,
                        "stage": "visual_text_kinetic",
                        "agent_name": "kinetic_text_refiner"
                    }
                )
                data = extract_json_from_response(res)
                slide["visual_text"] = data.get("visual_text", title) # Fallback to title
                return slide
            
            # Default fallback for other types
            slide["visual_text"] = title
            return slide

        async def refine_comparison_prompts(slide):
            """Handle comparison_split slides individually — they need two separate prompts from layout_data."""
            vtype = slide.get("visual_type")
            if vtype != "comparison_split":
                return slide
            
            layout_data = slide.get("layout_data", {})
            
            # Left Side
            l_title = layout_data.get("left_label", "Left Side")
            l_text = layout_data.get("left_text", "")
            l_prompt_input = IMAGE_PROMPT_GENERATOR_PROMPT_SINGLE.format(title=l_title, narration=l_text, archetype="image")
            l_res = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=[{"role": "user", "content": l_prompt_input}],
                model=IMAGE_PROMPT_GENERATOR_MODEL,
                telemetry={
                    "course_id": course_id,
                    "user_id": request.user_id,
                    "stage": "comparison_prompt_left",
                    "agent_name": "image_prompt_refiner"
                }
            )
            l_data = extract_json_from_response(l_res)
            layout_data["left_prompt"] = l_data.get("prompt", l_title)
            
            # Right Side
            r_title = layout_data.get("right_label", "Right Side")
            r_text = layout_data.get("right_text", "")
            r_prompt_input = IMAGE_PROMPT_GENERATOR_PROMPT_SINGLE.format(title=r_title, narration=r_text, archetype="image")
            r_res = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=[{"role": "user", "content": r_prompt_input}],
                model=IMAGE_PROMPT_GENERATOR_MODEL,
                telemetry={
                    "course_id": course_id,
                    "user_id": request.user_id,
                    "stage": "comparison_prompt_right",
                    "agent_name": "image_prompt_refiner"
                }
            )
            r_data = extract_json_from_response(r_res)
            layout_data["right_prompt"] = r_data.get("prompt", r_title)
            
            slide["layout_data"] = layout_data
            slide["prompt"] = f"Split screen comparison: {l_title} vs {r_title}"
            return slide

        async def batch_refine_image_prompts(script_plan, course_topic, style_name):
            """
            Single LLM call to generate image prompts for ALL image-needing slides.
            Gives the model cross-slide awareness for diversity and course context for relevance.
            """
            # Collect slides that need image prompts (image, hybrid, contextual_overlay)
            image_slides = []
            for idx, slide in enumerate(script_plan):
                vtype = slide.get("visual_type")
                if vtype in ["image", "hybrid", "contextual_overlay"]:
                    image_slides.append({
                        "id": idx + 1,
                        "title": slide.get("slide_title", ""),
                        "narration": slide.get("text", ""),
                        "archetype": vtype
                    })
            
            if not image_slides:
                return  # No slides need image prompts
            
            prompt = BATCH_IMAGE_PROMPT_GENERATOR_PROMPT.format(
                course_topic=course_topic,
                style_name=style_name,
                slides_json=json.dumps(image_slides, indent=2)
            )
            
            res = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4000,
                model=IMAGE_PROMPT_GENERATOR_MODEL,
                telemetry={
                    "course_id": course_id,
                    "user_id": request.user_id,
                    "stage": "batch_image_prompt_generation",
                    "agent_name": "batch_image_prompt_generator"
                }
            )
            results = extract_json_from_response(res)
            
            # Map results back to slides by id
            prompt_map = {}
            if isinstance(results, list):
                for item in results:
                    prompt_map[item.get("id")] = item.get("prompt", "")
            
            for idx, slide in enumerate(script_plan):
                slide_id = idx + 1
                if slide_id in prompt_map and prompt_map[slide_id]:
                    slide["prompt"] = prompt_map[slide_id]
                elif slide.get("visual_type") in ["image", "hybrid", "contextual_overlay"]:
                    # Fallback to slide title if batch didn't return a prompt for this slide
                    slide["prompt"] = slide.get("prompt", slide.get("slide_title", ""))

        # Resolve course context for image prompts
        course_topic = context_package.get('title', 'Corporate Training')
        style_name = metadata.get('style', 'Minimalist Vector')

        # Run visual text refinement, batch image prompts, and comparison prompts in parallel
        text_tasks = [refine_visual_text(slide) for slide in script_plan]
        comparison_tasks = [refine_comparison_prompts(slide) for slide in script_plan]
        
        await asyncio.gather(
            *text_tasks,
            *comparison_tasks,
            batch_refine_image_prompts(script_plan, course_topic, style_name)
        )

        
        # Generate Draft Visuals
        style_key = metadata.get("style", "Minimalist Vector")
        style_config = STYLE_MAPPING.get(style_key, STYLE_MAPPING["Minimalist Vector"])
        raw_style_prompt = style_config["prompt"] 

        # Resolve Brand Color: Profile > Metadata > Default
        resolved_color = style_config["default_accent"] # Fallback
        
        # 1. Try Metadata (course specific)
        if metadata.get("accent_color"):
             resolved_color = metadata.get("accent_color")

        # 2. Try Profile (brand override - highest priority if present)
        try:
            profile_res = supabase_admin.table("profiles").select("brand_colour").eq("id", request.user_id).single().execute()
            if profile_res.data and profile_res.data.get("brand_colour"):
                 resolved_color = profile_res.data.get("brand_colour")
                 # Update metadata to reflect the actual color used
                 metadata["accent_color"] = resolved_color
                 try:
                     supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()
                 except: pass
        except Exception as e:
            print(f"   ⚠️ Brand colour fetch failed: {e}")

        # Format the prompt
        try:
            style_prompt = raw_style_prompt.format(primary_color=resolved_color)
        except Exception as e:
            print(f"   ⚠️ Prompt formatting failed: {e}")
            style_prompt = raw_style_prompt.replace("{primary_color}", resolved_color)



        # Generate/Retrieve Consistency Assets
        consistency_seed = metadata.get("consistency_seed")
        if not consistency_seed:
            consistency_seed = int(time.time())
            metadata["consistency_seed"] = consistency_seed
        
        protagonist_desc = metadata.get("protagonist_description", "")
        # If no protagonist exists, we could optionally generate one here, but for now we'll stick to seed.
        
        # Save any new metadata
        supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()

        script_plan = await generate_draft_visuals(course_id, script_plan, style_prompt, request.user_id, seed=consistency_seed, protagonist=protagonist_desc)
        
        supabase_admin.table("courses").update({
            "slide_data": script_plan,
            "status": "reviewing_structure",
            "progress_phase": "structure_ready",
            "progress": 100
        }).eq("id", course_id).execute()
        
        print(f"   ✅ Structure & Draft Visuals generated for {course_id}")

    except Exception as e:
        print(f"❌ Structure Gen Error: {e}")
        handle_failure(course_id, request.user_id, e, {"stage": "generate_structure"})


async def trigger_remotion_render(course_id: str, user_id: str):
    """
    Triggers the AWS Lambda Remotion render via SQS Buffering.
    """
    print(f"🎬 Queuing Remotion Render Job: {course_id}")
    
    try:
        supabase_admin.table("courses").update({
            "status": "queued",
            "progress_phase": "compiling",
            "progress": 0
        }).eq("id", course_id).execute()
    except Exception as e:
        print(f"   ⚠️ DB Update Error: {e}")

    try:
        res = supabase_admin.table("courses").select("slide_data, metadata").eq("id", course_id).execute()
        if not res.data: return
        course_data = res.data[0]
        slides = normalize_slides(course_data.get('slide_data', []) or [])
        metadata = course_data.get('metadata', {})
        render_slides, assessment_cues = build_render_slides_and_assessment_cues(slides)
        if not render_slides:
            raise Exception("No non-assessment slides available to render.")

        metadata["assessment_cues"] = assessment_cues
        metadata["assessment_count"] = len(assessment_cues)
        metadata["rendered_slide_count"] = len(render_slides)
        # Idempotency: compute digest of render payload to avoid duplicate enqueues
        def _normalize_for_digest(slides_list):
            norm = []
            for sl in slides_list:
                d = dict(sl)
                for k in ("image", "audio"):
                    v = d.get(k)
                    if isinstance(v, str) and v.startswith("http") and ("?" in v):
                        d[k] = v.split("?", 1)[0]
                norm.append(d)
            return norm

        digest_payload = {
            "slides": _normalize_for_digest(render_slides),
            "accent_color": metadata.get("accent_color", "#14b8a6"),
            "logo_url": metadata.get("logo_url"),
            "logo_crop": metadata.get("logo_crop"),
        }
        try:
            payload_json = json.dumps(digest_payload, sort_keys=True, default=str).encode("utf-8")
            render_digest = hashlib.sha256(payload_json).hexdigest()
        except Exception:
            render_digest = None

        # If same digest already enqueued or rendering, short-circuit
        try:
            cur = supabase_admin.table("courses").select("status, metadata").eq("id", course_id).single().execute()
            current_status = cur.data if hasattr(cur, 'data') else (cur.get('data') if isinstance(cur, dict) else None)
            if current_status:
                st = current_status.get("status")
                m = current_status.get("metadata") or {}
                if render_digest and m.get("last_render_digest") == render_digest and st in ["queued", "processing_render", "rendering"]:
                    try:
                        supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()
                    except Exception as _meta_e:
                        print(f"   ⚠️ Failed to persist assessment cues during skip: {_meta_e}")
                    print(f"   🔁 Skipping duplicate enqueue for {course_id}; status={st}")
                    return m.get("last_job_id")
        except Exception as _e:
            print(f"   ⚠️ Idempotency check failed: {_e}")

        # accent_color is stored in metadata, fallback to teal
        accent_color = metadata.get('accent_color', '#14b8a6')
        logo_url = metadata.get('logo_url')
        logo_crop = metadata.get('logo_crop')

        # Sign URLs for Lambda
        print("   🔑 Signing assets for Lambda...")
        # Use 5 hours (18000s) to ensure URLs remain valid during render
        SIGN_VALIDITY = 18000
        def _sign(path: str) -> str:
            return get_asset_url(path, SIGN_VALIDITY)

        sign_slide_assets_inplace(render_slides, _sign)

        if logo_url and not logo_url.startswith("http"):
             logo_url = get_asset_url(logo_url, SIGN_VALIDITY)

        payload = {
            "slide_data": render_slides,
            "accent_color": accent_color,
            "logo_url": logo_url,
            "logo_crop": logo_crop
        }
        
        total_duration_ms = sum(s.get('duration', 0) for s in render_slides)
        print(f"   📊 Payload: {len(render_slides)} slides, total duration: {total_duration_ms}ms")

        # Update metadata with actual duration
        metadata['actual_duration'] = total_duration_ms
        try:
            supabase_admin.table("courses").update({
                "metadata": metadata
            }).eq("id", course_id).execute()
        except Exception as e:
            print(f"   ⚠️ Failed to update metadata duration: {e}")
        
        job_id = await send_render_job_async(course_id, user_id, payload)
        if 'render_digest' in locals() and render_digest:
            try:
                meta_to_update = metadata or {}
                meta_to_update["last_render_digest"] = render_digest
                meta_to_update["last_job_id"] = job_id
                import time as _t
                meta_to_update["last_enqueued_at"] = int(_t.time())
                supabase_admin.table("courses").update({"metadata": meta_to_update}).eq("id", course_id).execute()
            except Exception as _e:
                print(f"   ⚠️ Failed to persist idempotency metadata: {_e}")
        
        print(f"   ✅ Job queued with ID: {job_id}")
        return job_id

    except Exception as e:
        print(f"❌ Remotion Trigger Error: {e}")
        handle_failure(course_id, user_id, e, {"stage": "queue_render"})


async def finalize_course_assets(course_id: str, script_plan: list, user_id: str, accent_color: str):
    """
    Phase 2 Generation: Audio, Kinetic Text, and Video Compilation.
    Runs AFTER user review.
    """
    print(f"🚀 Finalizing Assets (Audio/Kinetic) for {course_id}...")
    
    supabase_admin.table("courses").update({
        "status": "generating_audio",
        "progress_phase": "media",
        "progress": 0
    }).eq("id", course_id).execute()
    
    script_plan = normalize_slides(script_plan)
    api_semaphore = asyncio.Semaphore(4)

    async def process_audio_parallel(i, slide, temp_dir):
        async with api_semaphore:
            print(f"   🎤 Finalizing Slide {i+1}...")
            
            audio_url = slide.get("audio")
            duration_ms = slide.get("duration", 10000)
            alignment = slide.get("timestamps")
            
            audio_data, new_alignment = await asyncio.to_thread(generate_audio, slide["text"])
            
            if audio_data:
                temp_audio_path = os.path.join(temp_dir, f"temp_audio_{i}.mp3")
                with open(temp_audio_path, "wb") as f:
                    f.write(audio_data)
                
                # Calc Duration locally using moviepy
                def get_duration(path):
                    try:
                        clip = AudioFileClip(path)
                        d = int((clip.duration * 1000) + 1500) # +1.5s padding
                        clip.close()
                        return d
                    except:
                        return 10000
                
                duration_ms = await asyncio.to_thread(get_duration, temp_audio_path)
                
                audio_filename = f"narration_{i}_{int(time.time())}.mp3"
                audio_url = await upload_asset_throttled(audio_data, audio_filename, "audio/mpeg", user_id, course_id=course_id, max_retries=5)
                alignment = new_alignment
            
            kinetic_events = []
            visual_type = slide.get("visual_type", "image")
            
            # Check for HTML content (Rich Text)
            visual_text = slide.get("visual_text", "")
            is_html = bool(visual_text and "<" in visual_text and ">" in visual_text)

            if visual_type != "title_card" and alignment and not is_html:
                word_timestamps = parse_alignment_to_words(alignment)
                pipeline = PipelineManager()
                kinetic_events = await asyncio.to_thread(
                    pipeline.generate_kinetic_text,
                    narration=slide.get("text", ""),
                    word_timestamps=word_timestamps,
                    visual_type=visual_type,
                    slide_duration_ms=duration_ms,
                    visual_text=visual_text
                )

            timing_plan = await asyncio.to_thread(
                build_slide_timing_plan,
                slide=slide,
                alignment=alignment,
                course_id=course_id,
                user_id=user_id
            )
            if not bool(timing_plan.get("timing_policy_ok", True)):
                policy_errors = timing_plan.get("timing_policy_errors", [])
                raise Exception(
                    f"Timing policy violation on slide {i + 1}: "
                    f"{'; '.join(str(err) for err in policy_errors) or 'Unknown timing policy error'}"
                )

            slide["audio"] = audio_url
            slide["duration"] = duration_ms
            slide["timestamps"] = alignment
            slide["kinetic_events"] = kinetic_events
            slide["timing_links_manual"] = timing_plan.get("timing_links_manual", [])
            slide["timing_links_auto"] = timing_plan.get("timing_links_auto", [])
            slide["timing_resolved"] = timing_plan.get("timing_resolved", [])
            slide["timing_meta"] = timing_plan.get("timing_meta", {})
            slide["accent_color"] = accent_color
            return slide

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            render_indices = [i for i, slide in enumerate(script_plan) if not is_assessment_slide(slide)]
            tasks = [process_audio_parallel(i, script_plan[i], temp_dir) for i in render_indices]
            processed_render_slides = await asyncio.gather(*tasks)
            processed_by_index = {i: slide for i, slide in zip(render_indices, processed_render_slides)}

            final_slides = []
            for i, slide in enumerate(script_plan):
                if i in processed_by_index:
                    final_slides.append(processed_by_index[i])
                    continue
                assessment_slide = dict(slide)
                assessment_slide["accent_color"] = accent_color
                final_slides.append(assessment_slide)

        supabase_admin.table("courses").update({
            "slide_data": final_slides, 
            "assessment_data": build_assessment_entries(final_slides),
            "status": "compiling_video",
            "progress_phase": "compiling"
        }).eq("id", course_id).execute()
        
        print("✅ Final Assets Ready, Triggering Render...")
        await trigger_remotion_render(course_id, user_id)

    except Exception as e:
        handle_failure(course_id, user_id, e, {"stage": "finalize_course_assets"})

async def generate_final_assets_task(course_id: str, script_plan: list, style_prompt: str, user_id: str, accent_color: str):
    """
    Task wrapper for finalizing assets.
    """
    try: 
         await finalize_course_assets(course_id, script_plan, user_id, accent_color)
    except Exception as e:
        print(f"❌ Final Asset Gen Error: {e}")
        handle_failure(course_id, user_id, e, {"stage": "final_assets"})
