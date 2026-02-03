import asyncio
import json
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
    LEARNING_ARCS
)
from backend.db import supabase_admin
from backend.services.ai import replicate_chat_completion, generate_image_replicate, extract_policy_essence
from backend.services.pipeline import PipelineManager, validate_script
from backend.services.audio import generate_audio
from backend.services.storage import upload_asset_throttled, handle_failure, get_asset_url
from backend.services.sqs_producer import send_render_job_async
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
                    text_context = f"{slide.get('visual_text', '')}\n{slide['text']}"
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
        from backend.config import AUDIENCE_STRATEGIES, AUDIENCE_LEGACY_MAP
        
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

        # Build jurisdiction context - used for LEGAL REFERENCES only
        jurisdiction_context = ""
        if country.upper() == "UK":
            jurisdiction_context = "When the source document mentions legal requirements, reference the relevant UK legal framework (e.g., Equality Act 2010, GDPR, HSE regulations)."
        else:
            jurisdiction_context = "When the source document mentions legal requirements, reference the relevant US legal framework (e.g., Title VII, OSHA, ADA)."

        # SOURCE-FIRST PROMPT: Extract from document, then adapt for audience
        if processed_policy:
            prompt = f"""You are an expert instructional designer specializing in creating engaging corporate training.

=== STEP 1: CONTENT EXTRACTION (MANDATORY) ===

Analyze the SOURCE DOCUMENT below and extract ALL key topics, procedures, requirements, and important information.
DO NOT skip any sections. DO NOT invent topics not present in the document.

SOURCE DOCUMENT (THIS IS THE PRIMARY SOURCE OF TRUTH):
{processed_policy}

=== STEP 2: AUDIENCE ADAPTATION for {audience_strategy['display_name'].upper()} ===

{audience_strategy['extraction_prompt']}

Prioritize these aspects for {audience_strategy['display_name']}:
{chr(10).join(f"- {area}" for area in audience_strategy['focus_areas'])}

=== STEP 3: TONE & PRESENTATION ===

Apply this tone and structure to the extracted content:
- Tone: {audience_strategy['tone']}
- Structure: {audience_strategy['structure']}
- Language Level: {audience_strategy['language_level']}
- Narrative Style: "{audience_strategy['narrative_style']}"
- Call to Action: {audience_strategy['call_to_action']}

=== STEP 4: DURATION CALIBRATION ===

Calibrate depth and topic count for a {duration}-MINUTE course:
- Purpose: {duration_config['purpose']}
- Pedagogical Goal: {duration_config.get('pedagogical_goal', 'Effective Training')}
- Topic Count: {duration_config['topic_count']}
- Depth Level: {duration_config['depth_level']}
- Content Priorities: {', '.join(duration_config['content_priorities'])}

{jurisdiction_context}

=== OUTPUT FORMAT (JSON) ===
{{
  "title": "Engaging Course Title (based on document content)",
  "learning_objective": "Clear, measurable learning outcome",
  "document_type_detected": "Brief description of what kind of document this is (e.g., 'disciplinary policy', 'safety manual', 'onboarding guide')",
  "topics": [
    {{
      "id": 1,
      "title": "Topic Title (from document)",
      "purpose": "What {audience_strategy['display_name']} will understand/be able to do",
      "key_points": ["Point 1 (from document)", "Point 2", "Point 3"],
      "estimated_slides": 3,
      "complexity": "simple|moderate|complex"
    }}
  ]
}}

CRITICAL REQUIREMENTS:
- Topics MUST come from the source document content
- Follow the {duration_config['topic_count']} topic guideline  
- Adapt depth to {duration_config['depth_level']}
- Frame topics from the perspective of {audience_strategy['display_name']}
- DO NOT generate generic topics unless explicitly in the document
"""
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


        res_text = await asyncio.to_thread(replicate_chat_completion, messages=[{"role": "user", "content": prompt}], max_tokens=3000, model=TOPIC_GENERATOR_MODEL)
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
        outline_prompt = f"""
You are a World-Class Instructional Architect.
Your goal is to design the STRUCTURE (Outline) for a high-retention video course.

=== CONTEXT ===
COURSE TITLE: {context_package['title']}
AUDIENCE: {context_package['audience_strategy']['display_name']}
TOTAL TIME: {context_package['duration']} minutes ({context_package['target_slides']} slides target).
LEARNING ARC: {learning_arc}

=== TASK ===
Generate a High-Level Outline for exactly {context_package['target_slides']} slides.
For each slide, provide:
1. "slide_number": 1 to {context_package['target_slides']}
2. "title": Short header (e.g., "The Problem", "The Solution")
3. "concept": Brief description of what this slide covers (1 sentence)
4. "visual_archetype": (image, chart, kinetic_text, comparison, process, list, metaphor)

=== CRITICAL CONSTRAINT ===
You must strictly follow the "Learning Arc" structure defined above.
MANDATORY: The slide *before* the final conclusion loop MUST be a "Knowledge Check".
- Title: "Quick Check"
- Concept: A scenario-based multiple choice question (A, B, or C). 
- Visual Archetype: "kinetic_text" (or "list" if options are long).

=== OUTPUT FORMAT (JSON ONLY) ===
{{
  "outline": [
    {{ "slide_number": 1, "title": "...", "concept": "...", "visual_archetype": "..." }},
    ...
  ]
}}
"""
        print("   🧠 Step 1: Generating Course Outline...")
        outline_res = await asyncio.to_thread(replicate_chat_completion, messages=[{"role": "user", "content": outline_prompt}], max_tokens=4000)
        outline_data = extract_json_from_response(outline_res)
        outline = outline_data.get("outline", [])
        
        # STEP 2: DETAILED SCRIPTING (The Director)
        # Now we flesh out the details using the approved outline.
        base_prompt = f"""
You are an Expert Video Director and Scriptwriter.
You will now write the FULL SCRIPT for the course based on the provided OUTLINE.

=== CONTEXT ===
AUDIENCE: {context_package['audience_strategy']['display_name']}
TONE: {context_package['audience_strategy']['tone']} ("{context_package['audience_strategy']['narrative_style']}")
SOURCE MATERIAL: {context_package.get('policy_text', 'No source provided')[:3000]}...

=== PEDAGOGICAL RULES (STRICT COMPLIANCE REQUIRED) ===
{PEDAGOGY_INSTRUCTIONS['cognitive_load']}

{PEDAGOGY_INSTRUCTIONS['multimedia_principles']}

{PEDAGOGY_INSTRUCTIONS['visual_logic']}

=== THE APPROVED OUTLINE (FOLLOW THIS) ===
{json.dumps(outline, indent=2)}

=== TASK ===
Generate the final JSON script. For each slide in the outline:
1. Write 'visual_text' (MAX 6 WORDS) that anchors the concept.
2. Write 'text' (Narration) that explains the concept using the visual as a reference.
3. Write a 'prompt' for the image generator that matches the archetype.

=== VISUAL ARCHETYPE GUIDE ===
- If explaining a workflow -> Use 'process' -> Prompt: "A clean minimalist flowchart showing step A leading to step B..."
- If explaining a danger -> Use 'metaphor' -> Prompt: "A stormy sea or caution tape aesthetic..."
- If listing requirements -> Use 'list' -> Prompt: "A checklist with 3 items checked off..."
- If contrasting ideas -> Use 'comparison' -> Prompt: "Split screen, left side chaotic, right side organized..."

=== SPECIAL VISUAL RULES ===
- For "Knowledge Check" / "Quick Check" slides:
   - Visual Text: THE QUESTION + Options A, B, C.
   - Narration: Read the question. Read the options. Then say "Take a moment..." (provide a pause in wording). Then say "The correct answer is [X] because [reason]."
   - Duration: Override the default. Set duration to at least 20000 (20 seconds) to allow thinking time.

=== OUTPUT FORMAT (JSON ONLY) ===
{{
  "script": [
    {{
      "slide_number": 1,
      "visual_archetype": "contextual_overlay", 
      "visual_text": "# {context_package['title']}",
      "text": "Welcome. In the next few minutes, we will master the core safety protocols that keep you safe.",
      "prompt": "Cinematic wide shot of a modern, clean corporate office, soft lighting, 8k resolution.",
      "duration": 12000
    }}
    // ... continue for all slides in the outline
  ]
}}
"""
        
        messages = [{"role": "user", "content": base_prompt}]
        script_plan = []
        max_retries = 2
        
        for attempt in range(max_retries):
            res_text = await asyncio.to_thread(replicate_chat_completion, messages=messages, max_tokens=20000)
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
            
            if attempt < max_retries - 1:
                supabase_admin.table("courses").update({"status": "generating_structure"}).eq("id", course_id).execute()
                messages.append({"role": "assistant", "content": res_text})
                feedback = (
                    f"CRITICAL QUALITY FEEDBACK:\n"
                    f"ISSUES: {json.dumps(validation_result.get('issues', []))}\n"
                    f"Constraint Reminder: Must be exactly {context_package['target_slides']} slides.\n"
                    f"Fix these issues specifically."
                )
                messages.append({"role": "user", "content": feedback})

        if ENABLE_SCRIPT_VALIDATION and 'validation_result' in locals():
            metadata["validation_last_result"] = validation_result
            supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()

        # Visual Director
        print("   🎬 AI: Assigning Visual Types...")
        pipeline = PipelineManager()
        script_plan = await asyncio.to_thread(pipeline.assign_visual_types, script_plan)
        

        
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
        res = supabase_admin.table("courses").select("slide_data, accent_color, metadata").eq("id", course_id).execute()
        if not res.data: return
        course_data = res.data[0]
        slides = course_data.get('slide_data', [])
        accent_color = course_data.get('accent_color', '#14b8a6')
        metadata = course_data.get('metadata', {})
        logo_url = metadata.get('logo_url')
        logo_crop = metadata.get('logo_crop')

        # Sign URLs for Lambda
        print("   🔑 Signing assets for Lambda...")
        for slide in slides:
            if slide.get("audio") and not slide["audio"].startswith("http"):
                 slide["audio"] = get_asset_url(slide["audio"], 3600)
            if slide.get("image") and not slide["image"].startswith("http"):
                 slide["image"] = get_asset_url(slide["image"], 3600)

        if logo_url and not logo_url.startswith("http"):
             logo_url = get_asset_url(logo_url, 3600)

        payload = {
            "slide_data": slides,
            "accent_color": accent_color,
            "logo_url": logo_url,
            "logo_crop": logo_crop
        }
        
        total_duration_ms = sum(s.get('duration', 0) for s in slides)
        print(f"   📊 Payload: {len(slides)} slides, total duration: {total_duration_ms}ms")

        # Update metadata with actual duration
        metadata['actual_duration'] = total_duration_ms
        try:
            supabase_admin.table("courses").update({
                "metadata": metadata
            }).eq("id", course_id).execute()
        except Exception as e:
            print(f"   ⚠️ Failed to update metadata duration: {e}")
        
        job_id = await send_render_job_async(course_id, user_id, payload)
        
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

            slide["audio"] = audio_url
            slide["duration"] = duration_ms
            slide["timestamps"] = alignment
            slide["kinetic_events"] = kinetic_events
            slide["accent_color"] = accent_color
            return slide

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            tasks = [process_audio_parallel(i, slide, temp_dir) for i, slide in enumerate(script_plan)]
            final_slides = await asyncio.gather(*tasks)
            final_slides.sort(key=lambda x: x.get("id", 0) if x.get("id") else 0)

        supabase_admin.table("courses").update({
            "slide_data": final_slides, 
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
