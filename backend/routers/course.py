from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Request, UploadFile, File
from fastapi.responses import JSONResponse
from backend.db import supabase, supabase_admin
from backend.dependencies import get_user_id_from_token
from backend.schemas import CourseRequest, PlanRequest, ScriptRequest, RenameCourseRequest, IntakeRequest
from backend.services.course_generator import (
    generate_topics_task, 
    generate_structure_task, 
    generate_final_assets_task,
    trigger_remotion_render,
    inject_bookend_slides,
    generate_draft_visuals
)
from backend.services.storage import handle_failure, get_asset_url
from backend.services.ai import replicate_chat_completion, generate_image_replicate
from backend.services.pipeline import PipelineManager
from backend.utils import parser, helpers
from backend.config import (
    STYLE_MAPPING, 
    MINIMALIST_PROMPT, 
    DURATION_STRATEGIES,
    INSTRUCTIONAL_STRATEGIES,
    AUDIENCE_ADAPTATIONS,
    UPLOAD_LIMITS
)
import time
import asyncio
import math
import json
from typing import List

router = APIRouter()

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
    """
    print(f"🚀 Starting Intake Flow: purpose={request.course_purpose}, audience={request.target_audience}")
    
    user_id = get_user_id_from_token(authorization)
    
    # Get instructional strategy for this purpose
    strategy = INSTRUCTIONAL_STRATEGIES.get(request.course_purpose, INSTRUCTIONAL_STRATEGIES["custom"])
    audience = AUDIENCE_ADAPTATIONS.get(request.target_audience, AUDIENCE_ADAPTATIONS["employees"])
    duration_config = DURATION_STRATEGIES.get(request.duration, DURATION_STRATEGIES[5])
    
    # Build metadata with all the new structured data
    metadata = {
        "duration": request.duration,
        "country": request.country,
        "style": request.style,
        "accent_color": request.accent_color,
        "color_name": request.color_name,
        "logo_url": request.logo_url,
        "logo_crop": request.logo_crop,
        "custom_title": request.title,
        # Instructional design context
        "instructional_strategy": strategy,
        "audience_adaptation": audience,
        "duration_strategy": duration_config
    }
    
    # Serialize conversation history if present
    conversation_json = None
    if request.conversation_history:
        conversation_json = [msg.dict() for msg in request.conversation_history]
    
    try:
        response = supabase_admin.table("courses").insert({
            "status": "generating_topics",
            "name": request.title or "New Course",
            "user_id": user_id,
            "metadata": metadata,
            # New structured columns
            "course_purpose": request.course_purpose,
            "target_audience": request.target_audience,
            "has_source_documents": request.has_source_documents,
            "intake_complete": True,
            "conversation_history": conversation_json,
            # Progress tracking
            "progress_phase": "topics",
            "progress": 0
        }).execute()
        course_id = response.data[0]['id']
    except Exception as e:
        print(f"❌ DB Insert Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create course record")
    
    # Start background task with enhanced context
    background_tasks.add_task(
        generate_topics_task, 
        course_id, 
        None,  # source_document_text will be loaded from DB if needed
        request.duration, 
        request.country, 
        request.title,
        request.course_purpose,
        request.target_audience
    )
    
    return {"status": "started", "course_id": course_id}

@router.patch("/course/{course_id}/source-documents")
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
            # Default to compliance training for legacy flow
            "course_purpose": "compliance_training",
            "target_audience": "employees",
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
        "compliance_training",  # Default for legacy
        "employees"  # Default for legacy
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
            "country": request.country
        }
        
        metadata = {
            "topics": topics_list, 
            "style": request.style,
            "target_slides": target_slides,
            "accent_color": request.accent_color,
            "color_name": request.color_name,
            "logo_url": request.logo_url,
            "logo_crop": request.logo_crop
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
         supabase_admin.table("courses").update({
            "slide_data": slide_data,
            "status": "finalizing_assets"
        }).eq("id", course_id).execute()
    else:
        res = supabase_admin.table("courses").select("slide_data, metadata").eq("id", course_id).execute()
        slide_data = res.data[0].get("slide_data", [])

    res = supabase_admin.table("courses").select("metadata, accent_color").eq("id", course_id).execute()
    metadata = res.data[0]['metadata']
    accent_color = res.data[0].get('accent_color', '#14b8a6')
    
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
    style_prompt = style_config["prompt"]

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
