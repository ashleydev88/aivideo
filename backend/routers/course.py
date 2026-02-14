from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Request, UploadFile, File
from fastapi.responses import JSONResponse
from backend.db import supabase, supabase_admin
from backend.dependencies import get_user_id_from_token
from backend.schemas import (
    CourseRequest,
    PlanRequest,
    ScriptRequest,
    RenameCourseRequest,
    IntakeRequest,
    OutcomeSuggestionRequest,
    PlannerRecommendationRequest,
    PlannerCreateRequest,
    PlannerUpdateRequest,
)
from backend.services.course_generator import (
    generate_topics_task, 
    generate_structure_task, 
    generate_final_assets_task,
    trigger_remotion_render,
    generate_draft_visuals
)
from backend.services.storage import handle_failure, get_asset_url
from backend.services.ai import anthropic_chat_completion, generate_image_replicate
from backend.services.pipeline import PipelineManager
from backend.services.discovery_agent import suggest_learning_outcomes
from backend.services.planner import recommend_course_plan
from backend.services.slide_data import normalize_slides
from backend.utils import parser, helpers
from backend.config import (
    STYLE_MAPPING, 
    MINIMALIST_PROMPT, 
    DURATION_STRATEGIES,
    AUDIENCE_STRATEGIES,
    AUDIENCE_LEGACY_MAP,
    UPLOAD_LIMITS
)
import time
import asyncio
import math
import json
from typing import List

router = APIRouter()


def _normalize_planner_modules(modules: list | None) -> list[dict]:
    normalized = []
    for idx, mod in enumerate(modules or []):
        if not isinstance(mod, dict):
            continue
        title = str(mod.get("title") or "").strip()
        if not title:
            title = f"Module {idx + 1}"
        focus = mod.get("objective_focus") or []
        if not isinstance(focus, list):
            focus = []
        est = mod.get("estimated_minutes") or 5
        try:
            est = int(est)
        except Exception:
            est = 5
        est = max(1, min(240, est))
        normalized.append(
            {
                "order": idx + 1,
                "title": title,
                "objective_focus": [str(x) for x in focus if str(x).strip()],
                "estimated_minutes": est,
            }
        )
    return normalized

def build_assessment_entries(slides):
    entries = []
    for idx, slide in enumerate(slides or []):
        if (slide.get("is_assessment") or slide.get("assessment_data")) and slide.get("assessment_data"):
            entries.append({
                "slide_number": idx + 1,
                "assessment_data": slide.get("assessment_data")
            })
    return entries

def derive_assessment_cues(slides, persisted_assessment_data=None):
    persisted_map = {}
    for entry in persisted_assessment_data or []:
        slide_number = entry.get("slide_number")
        if slide_number is None:
            continue
        persisted_map[slide_number] = entry.get("assessment_data")

    elapsed_ms = 0
    cues = []
    for idx, slide in enumerate(slides or []):
        slide_number = idx + 1
        is_assessment = bool(slide.get("is_assessment") or slide.get("assessment_data"))
        if is_assessment:
            assessment_data = slide.get("assessment_data") or persisted_map.get(slide_number)
            if assessment_data:
                cues.append({
                    "slide_number": slide_number,
                    "at_ms": max(0, int(elapsed_ms)),
                    "assessment_data": assessment_data,
                })
            continue

        duration = slide.get("duration", 0)
        try:
            duration = int(duration)
        except Exception:
            duration = 0
        elapsed_ms += max(0, duration)
    return cues


@router.post("/create")
async def create_course(request: CourseRequest, background_tasks: BackgroundTasks):
    # This endpoint seemed to be legacy or unused in the new flow, 
    # but I'll keep it compatible or assume it's a starter.
    # The new flow starts with /start-intake.
    response = supabase.table("courses").insert({}).execute()
    course_id = response.data[0]['id']
    # Not calling generate_disciplinary_course as it's likely the old monolithic function.
    # We'll assume the user wants the new flow.
    return {"status": "started", "course_id": course_id}

@router.get("/status/{course_id}")
async def get_status(course_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase_admin.table("courses").select("*").eq("id", course_id).eq("user_id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    data = response.data[0]
    # Map 'progress' column to 0-100 if present, default to 0
    progress_val = data.get("progress", 0)
    
    return {
        "status": data.get("status", "processing"), 
        "data": data.get("slide_data"), 
        "video_url": data.get("video_url"),
        "progress_phase": data.get("progress_phase"),
        "progress": progress_val
    }

@router.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...)):
    print(f"📂 Uploading policy: {file.filename}")
    content = await file.read()
    text = parser.extract_text_from_file(content, file.filename)
    return {"text": text}

@router.get("/upload-limits")
async def get_upload_limits():
    """Returns the current upload limits for client-side validation"""
    return UPLOAD_LIMITS

@router.post("/suggest-outcomes")
async def suggest_outcomes(
    request: OutcomeSuggestionRequest,
    authorization: str = Header(None)
):
    """
    Uses the Discovery Agent to generate AI-powered learning outcome suggestions
    based on the topic and target audience.
    """
    print(f"🎯 Suggesting outcomes for topic='{request.topic}', audience='{request.audience}'")
    
    # Authentication check
    user_id = get_user_id_from_token(authorization)
    
    try:
        # Call the Discovery Agent
        suggestions = await asyncio.to_thread(
            suggest_learning_outcomes,
            request.topic,
            request.audience,
            request.country
        )
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        print(f"❌ Suggest Outcomes Error: {e}")
        # Return fallback suggestions rather than failing
        return {
            "suggestions": [
                f"Understand the core concepts of {request.topic}",
                f"Apply {request.topic} principles in daily work",
                f"Identify key responsibilities and requirements",
                f"Know when and how to escalate issues"
            ]
        }


@router.post("/planner/recommend")
async def recommend_plan(
    request: PlannerRecommendationRequest,
    authorization: str = Header(None),
):
    """
    Deterministic plan recommendation endpoint.
    Returns single-video vs multi-video recommendation with rationale and decision trace.
    """
    _ = get_user_id_from_token(authorization)
    payload = request.model_dump() if hasattr(request, "model_dump") else request.dict()
    recommendation = recommend_course_plan(payload)
    return {"recommendation": recommendation}


@router.post("/planner/create")
async def create_planner(
    request: PlannerCreateRequest,
    authorization: str = Header(None),
):
    user_id = get_user_id_from_token(authorization)

    planner_input = {
        "topic": request.topic,
        "target_audience": request.target_audience,
        "learning_objectives": request.learning_objectives or [],
        "additional_context": request.additional_context,
        "source_document_text": request.source_document_text,
        "duration_preference_minutes": request.duration_preference_minutes,
        "country": request.country,
    }

    recommendation = recommend_course_plan(planner_input)
    final_format = recommendation.get("format")
    if request.forced_format in ("single_video", "multi_video_course"):
        final_format = request.forced_format

    modules = recommendation.get("modules") or []
    if request.modules_override:
        modules = [
            {
                "order": i + 1,
                "title": m.title,
                "objective_focus": m.objective_focus or [],
                "estimated_minutes": m.estimated_minutes,
            }
            for i, m in enumerate(request.modules_override)
        ]
    modules = _normalize_planner_modules(modules)

    if final_format == "single_video" and len(modules) > 1:
        modules = [modules[0]]
    if final_format == "multi_video_course" and len(modules) < 2:
        base_title = request.topic or "Course Module"
        modules = [
            {
                "order": 1,
                "title": f"{base_title}: Foundations",
                "objective_focus": request.learning_objectives[:2],
                "estimated_minutes": 6,
            },
            {
                "order": 2,
                "title": f"{base_title}: Application",
                "objective_focus": request.learning_objectives[2:] if len(request.learning_objectives) > 2 else request.learning_objectives[:2],
                "estimated_minutes": 6,
            },
        ]

    plan_name = request.name or request.topic or "New Course Plan"
    shared_context = {
        "style": request.style,
        "accent_color": request.accent_color,
        "color_name": request.color_name,
        "logo_url": request.logo_url,
        "logo_crop": request.logo_crop,
        "country": request.country,
        "target_audience": request.target_audience,
    }

    planner_output = {
        "recommended": recommendation,
        "final_format": final_format,
    }

    plan_res = supabase_admin.table("course_plans").insert(
        {
            "user_id": user_id,
            "name": plan_name,
            "status": "ready",
            "recommended_format": final_format,
            "planner_input": planner_input,
            "planner_output": planner_output,
            "shared_context": shared_context,
            "progress_percent": 0,
        }
    ).execute()
    if not plan_res.data:
        raise HTTPException(status_code=500, detail="Failed to create planner")

    plan_id = plan_res.data[0]["id"]

    module_rows = [
        {
            "course_plan_id": plan_id,
            "order_index": idx + 1,
            "title": mod["title"],
            "objective_focus": mod.get("objective_focus") or [],
            "estimated_minutes": mod.get("estimated_minutes") or 5,
            "status": "not_started",
        }
        for idx, mod in enumerate(modules)
    ]
    module_res = []
    if module_rows:
        insert_res = supabase_admin.table("course_modules").insert(module_rows).execute()
        module_res = insert_res.data or []

    return {
        "plan_id": plan_id,
        "status": "ready",
        "recommended_format": final_format,
        "recommendation": recommendation,
        "modules": module_res,
    }


@router.patch("/planner/{plan_id}")
async def update_planner(
    plan_id: str,
    request: PlannerUpdateRequest,
    authorization: str = Header(None),
):
    user_id = get_user_id_from_token(authorization)

    existing = supabase_admin.table("course_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Planner not found")

    updates = {}
    if request.name:
        updates["name"] = request.name
    if request.status in ("planning", "ready", "in_progress", "completed", "failed"):
        updates["status"] = request.status
    if request.forced_format in ("single_video", "multi_video_course"):
        updates["recommended_format"] = request.forced_format

    if updates:
        supabase_admin.table("course_plans").update(updates).eq("id", plan_id).execute()

    if request.modules is not None:
        supabase_admin.table("course_modules").delete().eq("course_plan_id", plan_id).execute()
        module_rows = [
            {
                "course_plan_id": plan_id,
                "order_index": idx + 1,
                "title": m.title,
                "objective_focus": m.objective_focus or [],
                "estimated_minutes": max(1, min(240, int(m.estimated_minutes))),
                "status": "not_started",
            }
            for idx, m in enumerate(request.modules)
        ]
        if module_rows:
            supabase_admin.table("course_modules").insert(module_rows).execute()

    return {"status": "updated", "plan_id": plan_id}


@router.get("/planner/{plan_id}/status")
async def get_planner_status(plan_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)

    plan_res = supabase_admin.table("course_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Planner not found")

    modules_res = supabase_admin.table("course_modules").select("*").eq("course_plan_id", plan_id).order("order_index").execute()
    modules = modules_res.data or []

    source_ids = [m.get("source_course_id") for m in modules if m.get("source_course_id")]
    course_map = {}
    if source_ids:
        courses_res = supabase_admin.table("courses").select("id, status, video_url, progress, progress_phase").in_("id", source_ids).execute()
        for c in courses_res.data or []:
            course_map[c["id"]] = c

    done = 0
    for mod in modules:
        source_id = mod.get("source_course_id")
        linked_course = course_map.get(source_id) if source_id else None
        mod["linked_course"] = linked_course
        effective_status = mod.get("status")
        if linked_course:
            if linked_course.get("status") == "completed":
                effective_status = "published"
            elif linked_course.get("status") in ("failed", "error"):
                effective_status = "failed"
            elif linked_course.get("status"):
                effective_status = "in_progress"
        mod["effective_status"] = effective_status
        if effective_status == "published":
            done += 1

    total = len(modules)
    progress = int((done / total) * 100) if total else 0
    plan_status = plan_res.data[0].get("status")
    if total > 0 and done == total:
        plan_status = "completed"
    elif done > 0:
        plan_status = "in_progress"

    return {
        "plan": {
            **plan_res.data[0],
            "status": plan_status,
            "progress_percent": progress,
        },
        "modules": modules,
    }


@router.post("/planner/{plan_id}/modules/{module_id}/generate")
async def generate_planner_module(
    plan_id: str,
    module_id: str,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None),
):
    user_id = get_user_id_from_token(authorization)

    plan_res = supabase_admin.table("course_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Planner not found")
    plan = plan_res.data[0]

    mod_res = supabase_admin.table("course_modules").select("*").eq("id", module_id).eq("course_plan_id", plan_id).execute()
    if not mod_res.data:
        raise HTTPException(status_code=404, detail="Module not found")
    module = mod_res.data[0]

    if module.get("status") == "published":
        raise HTTPException(status_code=400, detail="Module already published")
    if module.get("status") == "in_progress":
        raise HTTPException(status_code=400, detail="Module is already in progress")

    planner_input = plan.get("planner_input") or {}
    shared = plan.get("shared_context") or {}
    target_audience = planner_input.get("target_audience", "all_employees")
    if target_audience in AUDIENCE_LEGACY_MAP:
        target_audience = AUDIENCE_LEGACY_MAP[target_audience]

    duration = int(module.get("estimated_minutes") or planner_input.get("duration_preference_minutes") or 5)
    duration = max(1, min(20, duration))

    country = shared.get("country") or planner_input.get("country") or "UK"
    source_document_text = planner_input.get("source_document_text")
    module_title = module.get("title") or "Course Module"
    module_outcomes = module.get("objective_focus") or planner_input.get("learning_objectives") or []
    additional_context = planner_input.get("additional_context") or ""
    if module_outcomes:
        additional_context = f"{additional_context}\n\nModule focus:\n" + "\n".join([f"- {x}" for x in module_outcomes])

    audience_strategy = AUDIENCE_STRATEGIES.get(target_audience, AUDIENCE_STRATEGIES["all_employees"])
    duration_config = DURATION_STRATEGIES.get(duration, DURATION_STRATEGIES[5])

    course_metadata = {
        "duration": duration,
        "country": country,
        "style": shared.get("style", "Minimalist Vector"),
        "accent_color": shared.get("accent_color", "#14b8a6"),
        "color_name": shared.get("color_name", "teal"),
        "logo_url": shared.get("logo_url"),
        "logo_crop": shared.get("logo_crop"),
        "custom_title": module_title,
        "audience_strategy": audience_strategy,
        "duration_strategy": duration_config,
        "discovery_topic": module_title,
        "discovery_outcomes": module_outcomes,
        "discovery_additional_context": additional_context,
        "planner_plan_id": plan_id,
        "planner_module_id": module_id,
    }

    course_res = supabase_admin.table("courses").insert(
        {
            "status": "generating_topics",
            "name": module_title,
            "user_id": user_id,
            "metadata": course_metadata,
            "target_audience": target_audience,
            "has_source_documents": bool(source_document_text),
            "topic": module_title,
            "learning_outcomes": module_outcomes,
            "additional_context": additional_context,
            "source_document_text": source_document_text,
            "intake_complete": True,
            "progress_phase": "topics",
            "progress": 0,
        }
    ).execute()
    if not course_res.data:
        raise HTTPException(status_code=500, detail="Failed to create module course record")
    course_id = course_res.data[0]["id"]

    supabase_admin.table("course_modules").update(
        {
            "status": "in_progress",
            "source_course_id": course_id,
            "metadata": {
                **(module.get("metadata") or {}),
                "generation_started": True,
            },
        }
    ).eq("id", module_id).execute()

    supabase_admin.table("course_plans").update({"status": "in_progress"}).eq("id", plan_id).execute()

    discovery_context = {
        "topic": module_title,
        "learning_outcomes": module_outcomes,
        "additional_context": additional_context,
    }

    background_tasks.add_task(
        generate_topics_task,
        course_id,
        source_document_text,
        duration,
        country,
        module_title,
        target_audience,
        discovery_context,
    )

    return {
        "status": "started",
        "plan_id": plan_id,
        "module_id": module_id,
        "course_id": course_id,
    }

@router.post("/upload-documents")

async def upload_documents(
    files: List[UploadFile] = File(...),
    authorization: str = Header(None)
):
    """
    Uploads and parses multiple documents, returning combined text.
    Enforces upload limits defined in config.
    """
    user_id = get_user_id_from_token(authorization)
    
    # Validate file count
    if len(files) > UPLOAD_LIMITS["max_files"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum {UPLOAD_LIMITS['max_files']} files allowed"
        )
    
    combined_text = []
    total_size = 0
    
    for file in files:
        # Validate extension
        ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in UPLOAD_LIMITS["allowed_extensions"]:
            raise HTTPException(
                status_code=400,
                detail=f"File type {ext} not allowed. Allowed: {UPLOAD_LIMITS['allowed_extensions']}"
            )
        
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        
        # Validate individual file size
        if file_size_mb > UPLOAD_LIMITS["max_file_size_mb"]:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} exceeds {UPLOAD_LIMITS['max_file_size_mb']}MB limit"
            )
        
        total_size += file_size_mb
        
        # Parse file
        text = parser.extract_text_from_file(content, file.filename)
        if text:
            combined_text.append(f"--- {file.filename} ---\n{text}")
    
    # Validate total size
    if total_size > UPLOAD_LIMITS["max_total_size_mb"]:
        raise HTTPException(
            status_code=400,
            detail=f"Total upload size exceeds {UPLOAD_LIMITS['max_total_size_mb']}MB limit"
        )
    
    full_text = "\n\n".join(combined_text)
    
    # Validate text length
    if len(full_text) > UPLOAD_LIMITS["max_text_chars"]:
        full_text = full_text[:UPLOAD_LIMITS["max_text_chars"]]
        print(f"⚠️ Text truncated to {UPLOAD_LIMITS['max_text_chars']} characters")
    
    return {
        "text": full_text,
        "file_count": len(files),
        "total_chars": len(full_text),
        "truncated": len(full_text) == UPLOAD_LIMITS["max_text_chars"]
    }

@router.post("/start-intake")
async def start_intake(
    request: IntakeRequest, 
    background_tasks: BackgroundTasks, 
    authorization: str = Header(None)
):
    """
    New primary entry point for course creation.
    Creates a course record with structured intake data and starts topic generation.
    Now includes discovery context (topic, learning_outcomes, additional_context).
    """
    print(f"🚀 Starting Intake Flow: topic='{request.topic}', audience={request.target_audience}")
    
    user_id = get_user_id_from_token(authorization)
    
    # Map legacy audience values if needed
    target_audience = request.target_audience
    if target_audience in AUDIENCE_LEGACY_MAP:
        target_audience = AUDIENCE_LEGACY_MAP[target_audience]
    
    # Get audience strategy (unified config)
    audience_strategy = AUDIENCE_STRATEGIES.get(target_audience, AUDIENCE_STRATEGIES["all_employees"])
    duration_config = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
    
    # Build metadata with all the new structured data including discovery context
    metadata = {
        "duration": request.duration,
        "country": request.country,
        "style": request.style,
        "accent_color": request.accent_color,
        "color_name": request.color_name,
        "logo_url": request.logo_url,
        "logo_crop": request.logo_crop,
        "custom_title": request.title,
        # Audience-based context
        "audience_strategy": audience_strategy,
        "duration_strategy": duration_config,
        # Discovery context (NEW)
        "discovery_topic": request.topic,
        "discovery_outcomes": request.learning_outcomes,
        "discovery_additional_context": request.additional_context
    }
    
    
    # conversation_history serialization removed
    
    try:
        response = supabase_admin.table("courses").insert({
            "status": "generating_topics",
            "name": request.title or "New Course",
            "user_id": user_id,
            "metadata": metadata,
            # Audience type
            "target_audience": target_audience,
            "has_source_documents": request.has_source_documents,
            # NEW: Discovery Context Columns
            "topic": request.topic,
            "learning_outcomes": request.learning_outcomes, # Stored as JSONB
            "additional_context": request.additional_context,
            "source_document_text": request.source_document_text, # Store text immediately
            "intake_complete": True,
            # conversation_history removed as per schema change
            # Progress tracking
            "progress_phase": "topics",
            "progress": 0
        }).execute()
        course_id = response.data[0]['id']
    except Exception as e:
        print(f"❌ DB Insert Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create course record")
    
    # Build discovery context dict for topic generator
    discovery_context = {
        "topic": request.topic,
        "learning_outcomes": request.learning_outcomes or [],
        "additional_context": request.additional_context
    }
    
    # Start background task with enhanced context
    background_tasks.add_task(
        generate_topics_task, 
        course_id, 
        request.source_document_text,  # Pass text directly from request (fixes race condition)
        request.duration, 
        request.country, 
        request.title,
        target_audience,
        discovery_context  # NEW: pass discovery context
    )
    
    return {"status": "started", "course_id": course_id}


@router.patch("/{course_id}/source-documents")
async def update_source_documents(
    course_id: str,
    request: Request,
    authorization: str = Header(None)
):
    """
    Updates the source document text for an existing course.
    Called after document upload to store extracted text.
    """
    user_id = get_user_id_from_token(authorization)
    
    # Verify ownership
    res = supabase_admin.table("courses").select("user_id").eq("id", course_id).execute()
    if not res.data or res.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    body = await request.json()
    source_text = body.get("source_document_text", "")
    
    supabase_admin.table("courses").update({
        "source_document_text": source_text,
        "has_source_documents": bool(source_text)
    }).eq("id", course_id).execute()
    
    return {"status": "updated"}

# Legacy endpoint - kept for backward compatibility
@router.post("/generate-topics")
async def generate_topics(request: PlanRequest, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    """
    Legacy endpoint for document-first flow.
    New flows should use /start-intake instead.
    """
    print(f"🧠 [LEGACY] Starting Async Topic Generation for duration: {request.duration}")
    
    user_id = get_user_id_from_token(authorization)

    # 1. Create Course Record Immediately
    try:
        response = supabase_admin.table("courses").insert({
            "status": "generating_topics",
            "name": request.title or "New Policy Course",
            "user_id": user_id,
            "metadata": {
                "duration": request.duration,
                "country": request.country,
                "style": request.style,
                "accent_color": request.accent_color,
                "color_name": request.color_name,
                "logo_url": request.logo_url,
                "logo_crop": request.logo_crop,
                "custom_title": request.title
            },
            # Default audience for legacy flow (mapped to new system)
            "target_audience": "all_employees",
            "has_source_documents": True,
            "source_document_text": request.policy_text,
            "intake_complete": True,
            "progress_phase": "topics",
            "progress": 0
        }).execute()
        course_id = response.data[0]['id']
    except Exception as e:
        print(f"❌ DB Insert Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create course record")

    # 2. Start Background Task
    background_tasks.add_task(
        generate_topics_task, 
        course_id, 
        request.policy_text, 
        request.duration, 
        request.country, 
        request.title,
        "all_employees"  # Default for legacy
    )

    return {"status": "started", "course_id": course_id}


@router.post("/generate-structure")
async def generate_structure(request: ScriptRequest, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    print("🏗️ Generating Structure...")
    try:
        user_id = get_user_id_from_token(authorization)
        
        if user_id != request.user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")

        course_id = request.course_id 
        
        if not course_id:
            print("   ⚠️ No course_id provided in request, creating new record...")
            try:
                 response = supabase_admin.table("courses").insert({
                    "status": "generating_structure",
                    "name": request.title,
                    "user_id": user_id,
                    "progress_phase": "structure",
                    "progress": 0
                }).execute()
                 course_id = response.data[0]['id']
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to initiate course: {e}")
        else:
            supabase_admin.table("courses").update({
                "status": "generating_structure",
                "progress_phase": "structure",
                "progress": 0,
                "name": request.title
            }).eq("id", course_id).execute()

        target_slides = request.duration * 3
        
        topics_list = [t.dict() for t in request.topics]
        strategy = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
        
        # Resolve Audience Strategy
        req_audience = request.target_audience
        if not req_audience and course_id:
             try:
                 res = supabase_admin.table("courses").select("target_audience").eq("id", course_id).execute()
                 if res.data:
                     req_audience = res.data[0].get("target_audience")
             except: pass
             
        if not req_audience:
             req_audience = "all_employees"
             
        if req_audience in AUDIENCE_LEGACY_MAP:
             req_audience = AUDIENCE_LEGACY_MAP[req_audience]
             
        audience_strategy = AUDIENCE_STRATEGIES.get(req_audience, AUDIENCE_STRATEGIES["all_employees"])

        context_package = {
            "policy_text": request.policy_text, 
            "original_policy_text": request.policy_text, 
            "title": request.title,
            "learning_objective": request.learning_objective,
            "topics": topics_list,
            "duration": request.duration,
            "target_slides": target_slides,
            "style_guide": STYLE_MAPPING.get(request.style, {"prompt": MINIMALIST_PROMPT})["prompt"],
            "strategy_tier": strategy["purpose"],
            "country": request.country,
            "audience_strategy": audience_strategy
        }
        
        metadata = {
            "topics": topics_list, 
            "style": request.style,
            "target_slides": target_slides,
            "accent_color": request.accent_color,
            "color_name": request.color_name,
            "logo_url": request.logo_url,
            "logo_crop": request.logo_crop,
            "audience_strategy": audience_strategy
        }
        supabase_admin.table("courses").update({"metadata": metadata}).eq("id", course_id).execute()

        background_tasks.add_task(
            generate_structure_task, 
            course_id, 
            context_package, 
            request, 
            metadata
        )
        
        return {"status": "started", "course_id": course_id}

    except Exception as e:
        print(f"❌ Error in generate-structure endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/finalize-course")
async def finalize_course(course_id: str, request: Request, background_tasks: BackgroundTasks, authorization: str = Header(None)):
    """
    Triggers final media generation and rendering.
    Expects 'slide_data' in the body if edits were made, or uses DB data.
    """
    print(f"🎬 Finalizing Course {course_id}...")
    user_id = get_user_id_from_token(authorization)
    
    body = await request.json()
    slide_data = body.get("slide_data")

    if slide_data:
         slide_data = normalize_slides(slide_data)
         supabase_admin.table("courses").update({
            "slide_data": slide_data,
            "assessment_data": build_assessment_entries(slide_data),
            "status": "finalizing_assets"
        }).eq("id", course_id).execute()
    else:
        res = supabase_admin.table("courses").select("slide_data, metadata").eq("id", course_id).execute()
        slide_data = normalize_slides(res.data[0].get("slide_data", []))
        # Normalize assessment_data in DB even when reusing existing slide_data
        supabase_admin.table("courses").update({
            "slide_data": slide_data,
            "assessment_data": build_assessment_entries(slide_data)
        }).eq("id", course_id).execute()

    res = supabase_admin.table("courses").select("metadata").eq("id", course_id).execute()
    metadata = res.data[0]['metadata']
    # Fallback to metadata's accent_color or default
    accent_color = metadata.get('accent_color', '#14b8a6')

    # Brand Colour Override: Check if user has a brand colour set defined in their profile
    try:
        profile_res = supabase_admin.table("profiles").select("brand_colour").eq("id", user_id).single().execute()
        if profile_res.data and profile_res.data.get("brand_colour"):
             accent_color = profile_res.data.get("brand_colour")
             print(f"   🎨 Using Brand Colour Override: {accent_color}")
    except Exception as e:
        print(f"   ⚠️ Failed to fetch brand colour: {e}")
    
    style_key = metadata.get("style", "Minimalist Vector")
    style_config = STYLE_MAPPING.get(style_key, STYLE_MAPPING["Minimalist Vector"])
    style_prompt = style_config["prompt"]
    
    background_tasks.add_task(generate_final_assets_task, course_id, slide_data, style_prompt, user_id, accent_color)
    
    return {"status": "finalizing"}

@router.post("/export-video/{course_id}")
async def export_video(
    course_id: str, 
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    user_id = get_user_id_from_token(authorization)
    
    # Send to SQS immediately to get Job ID
    job_id = await trigger_remotion_render(course_id, user_id)
    
    return JSONResponse(
        status_code=202,
        content={"status": "accepted", "jobId": job_id}
    )

@router.get("/course/{course_id}/assessment-cues")
async def get_assessment_cues(course_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)

    res = supabase_admin.table("courses").select(
        "id, user_id, status, slide_data, assessment_data, metadata"
    ).eq("id", course_id).single().execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Course not found")
    if res.data.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this course")

    slide_data = res.data.get("slide_data") or []
    assessment_data = res.data.get("assessment_data") or []
    metadata = res.data.get("metadata") or {}
    derived_cues = derive_assessment_cues(slide_data, assessment_data)

    return {
        "course_id": course_id,
        "status": res.data.get("status"),
        "slide_count": len(slide_data),
        "assessment_data": assessment_data,
        "metadata_assessment_cues": metadata.get("assessment_cues", []),
        "derived_assessment_cues": derived_cues,
    }

@router.delete("/course/{course_id}")
async def delete_course(course_id: str, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    
    res = supabase_admin.table("courses").select("user_id").eq("id", course_id).execute()
    
    if not res.data or res.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")

    supabase_admin.table("courses").delete().eq("id", course_id).execute()
    return {"status": "deleted"}

@router.patch("/course/{course_id}")
async def rename_course(course_id: str, request: RenameCourseRequest, authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    
    # Verify ownership
    res = supabase_admin.table("courses").select("user_id").eq("id", course_id).execute()
    if not res.data or res.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this course")

    # Update name
    supabase_admin.table("courses").update({"name": request.name}).eq("id", course_id).execute()
    
    return {"status": "updated", "data": {"name": request.name}}

@router.post("/copy-course/{course_id}")
async def copy_course(course_id: str, authorization: str = Header(None)):
    """
    Creates a copy of an existing course for editing purposes.
    The new course will be in 'reviewing_structure' state.
    """
    user_id = get_user_id_from_token(authorization)
    
    # 1. Fetch source course
    res = supabase_admin.table("courses").select("*").eq("id", course_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Course not found")
        
    source_course = res.data[0]
    
    # Security check
    if source_course['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to copy this course")
        
    # 2. Prepare new course data
    new_name = f"Copy of {source_course.get('name', 'Untitled')}"
    
    new_course_data = {
        "user_id": user_id,
        "name": new_name,
        "status": "reviewing_structure",
        "progress_phase": "structure_ready",
        "progress": 100,
        "slide_data": source_course.get("slide_data"),
        "metadata": source_course.get("metadata", {}),
        "video_url": None # Reset video url
    }
    
    # 3. Insert new course
    try:
        insert_res = supabase_admin.table("courses").insert(new_course_data).execute()
        new_course_id = insert_res.data[0]['id']
        return {"status": "copied", "course_id": new_course_id}
    except Exception as e:
        print(f"❌ Copy Course Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to copy course")

@router.post("/regenerate-slide-visual/{course_id}")
async def regenerate_slide_visual(
    course_id: str, 
    request: Request, 
    authorization: str = Header(None)
):
    print(f"🎨 Regenerating Visual for {course_id}...")
    user_id = get_user_id_from_token(authorization)
    body = await request.json()
    prompt = body.get("prompt")
    slide_index = body.get("slide_index") 

    if not prompt or slide_index is None:
        raise HTTPException(status_code=400, detail="Missing prompt or slide_index")
    
    res = supabase_admin.table("courses").select("metadata").eq("id", course_id).execute()
    metadata = res.data[0]['metadata'] if res.data else {}
    style_key = metadata.get("style", "Minimalist Vector")
    style_config = STYLE_MAPPING.get(style_key, STYLE_MAPPING["Minimalist Vector"])
    raw_style_prompt = style_config["prompt"]

    # Resolve Brand Color: Profile > Metadata > Default
    resolved_color = style_config["default_accent"] # Fallback

    if metadata.get("accent_color"):
         resolved_color = metadata.get("accent_color")

    try:
        profile_res = supabase_admin.table("profiles").select("brand_colour").eq("id", user_id).single().execute()
        if profile_res.data and profile_res.data.get("brand_colour"):
             resolved_color = profile_res.data.get("brand_colour")
    except Exception as e:
        print(f"   ⚠️ Brand colour fetch failed: {e}")

    try:
        style_prompt = raw_style_prompt.format(primary_color=resolved_color)
    except Exception as e:
        # Fallback if format fails (e.g. no placeholder)
        style_prompt = raw_style_prompt.replace("{primary_color}", resolved_color)


    from backend.services.storage import upload_asset_throttled
    
    full_prompt = f"{style_prompt}. {prompt}"
    
    image_data = await asyncio.to_thread(generate_image_replicate, full_prompt)
    if not image_data:
        raise HTTPException(status_code=500, detail="Failed to generate image")
        
    image_filename = f"visual_{slide_index}_{int(time.time())}.jpg"
    image_url = await upload_asset_throttled(image_data, image_filename, "image/jpeg", user_id, course_id=course_id, max_retries=5)
    
    return {"image_url": image_url}

@router.post("/course/{course_id}/mark-viewed")
async def mark_viewed(course_id: str, authorization: str = Header(None)):
    """
    Marks the course video as 'viewed' by the user.
    """
    user_id = get_user_id_from_token(authorization)
    
    res = supabase_admin.table("courses").select("user_id, metadata").eq("id", course_id).execute()
    if not res.data or res.data[0]['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_metadata = res.data[0].get('metadata') or {}
    
    current_metadata['viewed_result'] = True
    
    supabase_admin.table("courses").update({
        "metadata": current_metadata
    }).eq("id", course_id).execute()
    
    return {"status": "marked_viewed"}

@router.get("/dashboard/courses")
async def get_dashboard_courses(authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    # Fetch only lightweight fields for the dashboard list
    response = supabase_admin.table("courses").select("id, created_at, status, name, metadata, video_url").eq("user_id", user_id).order("created_at", desc=True).execute()
    return response.data

@router.get("/courses")
async def get_courses(authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase_admin.table("courses").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return response.data

@router.get("/history")
async def get_history(authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase_admin.table("courses").select("id, created_at, status, name, metadata").eq("status", "completed").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
    return response.data

@router.get("/subscription")
async def get_subscription(authorization: str = Header(None)):
    user_id = get_user_id_from_token(authorization)
    response = supabase.table("profiles").select("subscription_level").eq("id", user_id).single().execute()
    
    if not response.data:
        return {"subscription_level": "free"}
        
    return response.data

@router.post("/get-signed-url")
async def get_signed_url(request: Request, authorization: str = Header(None)):
    """
    Generate a fresh signed URL for a storage asset.
    """
    user_id = get_user_id_from_token(authorization)
    
    body = await request.json()
    path = body.get("path")
    
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    if path.startswith("http"):
        try:
            if "/course-assets/" in path:
                after_bucket = path.split("/course-assets/")[1]
                extracted_path = after_bucket.split("?")[0]
                path = extracted_path
                print(f"   🔄 Extracted path from legacy URL: {path}")
            else:
                raise HTTPException(status_code=400, detail="Invalid legacy URL format")
        except Exception as e:
            print(f"   ❌ Failed to parse legacy URL: {e}")
            raise HTTPException(status_code=400, detail="Could not parse legacy URL")
    
    if not path.startswith(f"{user_id}/"):
        raise HTTPException(status_code=403, detail="Access denied to this asset")
    
    try:
        bucket = "course-assets"
        
        # Heuristic: If filename contains "logo_", check 'logos' bucket
        # We can also accept an explicit bucket param in the future
        if "/logo_" in path or path.startswith("logo_") or "_logo_" in path:
             bucket = "logos"
             
        signed_url_response = supabase_admin.storage.from_(bucket).create_signed_url(path, 900)
        
        # Handle dict response (standard in recent SDKs)
        # It might be 'signedURL' or 'signed_url'
        if isinstance(signed_url_response, dict):
             signed_url = signed_url_response.get("signedURL") or signed_url_response.get("signed_url")
        else:
             signed_url = str(signed_url_response)

        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to generate signed URL")
        
        return {"signed_url": signed_url, "expires_in": 900}
    except Exception as e:
        print(f"❌ Signed URL Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate signed URL")


@router.get("/render-status/{course_id}")
async def render_status(course_id: str, authorization: str = Header(None)):
    """
    Returns realtime render status for a course:
    - status and progress from courses table
    - approximate queue size and position while queued
    """
    user_id = get_user_id_from_token(authorization)

    # Ensure the course belongs to the user
    res = supabase_admin.table("courses").select("id, user_id, status, progress, created_at, metadata").eq("id", course_id).single().execute()
    if not res.data or res.data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    course = res.data
    status = course.get('status')
    progress = int(course.get('progress') or 0)

    # Defaults
    queue_size = None
    queue_position = None

    # While queued, compute an approximate position
    if status == 'queued':
        try:
            # Prefer counting queued courses in DB to reflect app-level queue
            q = supabase_admin.table("courses").select("id", count="exact").eq("status", "queued").execute()
            queue_size = (q.count or 0) if hasattr(q, 'count') else (q.get('count') if isinstance(q, dict) else None)
        except Exception:
            queue_size = None

        # Fallback to SQS approximation if configured
        try:
            import os
            import boto3
            queue_url = os.getenv('VIDEO_RENDER_QUEUE_URL')
            region = os.getenv('AWS_REGION', 'eu-west-2')
            if (queue_size is None) and queue_url:
                sqs = boto3.client('sqs', region_name=region)
                attrs = sqs.get_queue_attributes(QueueUrl=queue_url, AttributeNames=['ApproximateNumberOfMessages'])
                queue_size = int(attrs['Attributes'].get('ApproximateNumberOfMessages', '0'))
        except Exception:
            pass

        # Position approximation: number of queued jobs (including this task)
        if isinstance(queue_size, int):
            queue_position = max(queue_size, 1)

    return {
        "status": status,
        "progress": progress,
        "queue_size": queue_size,
        "queue_position": queue_position
    }
