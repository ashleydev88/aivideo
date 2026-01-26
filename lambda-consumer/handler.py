"""
AWS Lambda Handler for SQS Video Render Queue.
Processes render jobs by invoking Remotion Lambda via CLI.
"""
import json
import os
import subprocess
import tempfile
import traceback
from supabase import create_client

# Environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Remotion Configuration
SERVE_URL = os.environ.get(
    "REMOTION_SERVE_URL",
    "https://remotionlambda-euwest2-wxjopockvc.s3.eu-west-2.amazonaws.com/sites/video-renderer/index.html"
)
COMPOSITION_ID = os.environ.get("REMOTION_COMPOSITION_ID", "Main")
FUNCTION_NAME = os.environ.get(
    "REMOTION_FUNCTION_NAME",
    "remotion-render-4-0-405-mem3008mb-disk10240mb-900sec"
)

# Initialize Supabase Admin
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def lambda_handler(event, context):
    """
    AWS Lambda Handler for SQS Video Render Queue.
    """
    print("🚀 Video Render Consumer: Received event batch")
    
    for record in event.get('Records', []):
        course_id = None
        user_id = None
        try:
            body = json.loads(record['body'])
            course_id = body.get('course_id')
            user_id = body.get('user_id')
            payload = body.get('payload')
            
            print(f"   Processing course_id: {course_id}")
            process_render_job(course_id, user_id, payload)
            
        except Exception as e:
            print(f"❌ Error processing record: {e}")
            traceback.print_exc()
            if course_id and supabase_admin:
                handle_failure(course_id, user_id, e, {"stage": "lambda_worker"})
            raise e  # Re-raise to trigger SQS retry/DLQ


def process_render_job(course_id: str, user_id: str, payload: dict):
    """
    Orchestrates the render process via Remotion Lambda CLI.
    """
    if not supabase_admin:
        raise Exception("Supabase client not initialized")

    # 1. Update Status to Processing
    try:
        supabase_admin.table("courses").update({
            "status": "processing_render",
            "progress_phase": "rendering",
            "progress_current_step": 0
        }).eq("id", course_id).execute()
    except Exception as e:
        print(f"⚠️ Failed to update status: {e}")

    # 2. Prepare Props File
    props_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(payload, props_file)
    props_file.close()

    try:
        # 3. Construct Remotion CLI Command
        cmd_args = [
            "npx", "remotion", "lambda", "render",
            SERVE_URL,
            COMPOSITION_ID,
            "--function-name", FUNCTION_NAME,
            "--props", props_file.name,
            "--log", "verbose",
            "--yes",
            "--concurrency", "8",
            "--timeout", "900"
        ]
        
        print(f"   🏃 Running: {' '.join(cmd_args)}")
        
        # Run subprocess
        process = subprocess.Popen(
            cmd_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        s3_url = None
        
        # Stream and parse output
        for line in process.stdout:
            print(f"   [Remotion] {line.strip()}")
            # Extract S3 URL from output
            if "https://" in line and ".mp4" in line and "s3" in line.lower():
                parts = line.split()
                for p in parts:
                    if p.startswith("https://") and ".mp4" in p:
                        s3_url = p.strip().rstrip('.')

        return_code = process.wait()
        
        if return_code != 0:
            raise Exception(f"Remotion CLI failed with code {return_code}")

        if not s3_url:
            raise Exception("Could not find S3 URL in CLI output")

        print(f"   ✅ Video Rendered: {s3_url}")
        
        # 4. Update Success
        supabase_admin.table("courses").update({
            "video_url": s3_url,
            "status": "completed",
            "progress_current_step": 100
        }).eq("id", course_id).execute()

    finally:
        # Cleanup temp file
        if os.path.exists(props_file.name):
            os.remove(props_file.name)


def handle_failure(course_id: str, user_id: str, error: Exception, metadata: dict = None):
    """
    Logs failure and reverts course to reviewable state.
    """
    import time
    print(f"🔥 Handling Failure for {course_id}: {error}")
    
    # Log to failures table
    try:
        supabase_admin.table("course_failures").insert({
            "original_course_id": course_id,
            "user_id": user_id,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
            "metadata": metadata
        }).execute()
    except Exception as e:
        print(f"   ⚠️ Failed to log failure: {e}")

    # Soft fail - revert to reviewing_structure for retry
    try:
        res = supabase_admin.table("courses").select("metadata").eq("id", course_id).execute()
        current_metadata = res.data[0]['metadata'] if res.data else {}
        
        current_metadata.update({
            "last_error": str(error),
            "failure_notice": "The last render attempt failed. You can try again.",
            "failed_at": int(time.time()),
            "failed_stage": metadata.get("stage") if metadata else "unknown"
        })

        supabase_admin.table("courses").update({
            "status": "reviewing_structure",
            "metadata": current_metadata
        }).eq("id", course_id).execute()
        
        print(f"   ↩️ Reverted course {course_id} to 'reviewing_structure'")
    except Exception as e:
        print(f"   ❌ CRITICAL: Failed to update course status: {e}")
