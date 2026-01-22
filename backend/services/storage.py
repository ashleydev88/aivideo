import asyncio
import time
import traceback
from backend.db import supabase_admin

# --- CONCURRENCY LIMITS ---
# Limits concurrent Supabase uploads to prevent socket exhaustion (Errno 35)
SUPABASE_UPLOAD_SEMAPHORE = asyncio.Semaphore(3)

def handle_failure(course_id: str, user_id: str, error: Exception, metadata: dict = None):
    """
    Moves a failed course record to the course_failures table.
    UPDATED: Does NOT delete the course record, but marks it as failed.
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

    # 2. Update Course Status (Soft Fail vs Hard Fail)
    try:
        stage = metadata.get("stage") if metadata else "unknown"
        
        # Soft Fail: Revert to previous state for retryable stages
        if stage in ["queue_render", "lambda_worker", "finalizing_assets", "render", "compiling"]:
            print(f"   ↩️ Soft Fail: Reverting course {course_id} to 'reviewing_structure'")
            
            # Fetch current metadata to preserve other fields
            res = supabase_admin.table("courses").select("metadata").eq("id", course_id).execute()
            current_metadata = res.data[0]['metadata'] if res.data else {}
            
            # Update metadata with error info
            current_metadata.update({
                "last_error": str(error),
                "failure_notice": "The last render attempt failed. Support has been notified. You can try again.",
                "failed_at": int(time.time()),
                "failed_stage": stage
            })

            supabase_admin.table("courses").update({
                "status": "reviewing_structure",
                "metadata": current_metadata
            }).eq("id", course_id).execute()
            
        else:
            # Hard Fail: Default behavior
            supabase_admin.table("courses").update({
                "status": "failed",
                "metadata": {"error": str(error), "context": metadata}
            }).eq("id", course_id).execute()
            print(f"   ❌ Marked course {course_id} as failed.")

    except Exception as e:
         print(f"   ❌ CRITICAL: Failed to update course status {course_id}: {e}")

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
                wait_time = (attempt + 1) * 2  # 2s, 4s, 6s backoff
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
