"""
AWS Lambda Handler for SQS Video Render Queue.
Processes render jobs via Remotion Lambda Python SDK.
"""
import json
import os
import time
import traceback
import boto3
from botocore.config import Config as BotoConfig
from supabase import create_client
from remotion_lambda import RemotionClient, RenderMediaParams, Privacy, ValidStillImageFormats

# Environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "eu-west-2")

# Remotion Configuration
SERVE_URL = os.environ.get(
    "REMOTION_SERVE_URL",
    "https://remotionlambda-euwest2-wxjopockvc.s3.eu-west-2.amazonaws.com/sites/video-renderer/index.html"
)
COMPOSITION_ID = os.environ.get("REMOTION_COMPOSITION_ID", "Main")
REMOTION_FUNCTION_NAME = os.environ.get(
    "REMOTION_FUNCTION_NAME",
    "remotion-render-4-0-405-mem3008mb-disk10240mb-900sec"
)

# Initialize Supabase client
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Configure boto3 with extended timeouts for long-running Lambda invocations
boto_config = BotoConfig(
    read_timeout=900,  # 15 minutes
    connect_timeout=30,
    retries={'max_attempts': 0}  # Don't retry on timeout
)

# Initialize Remotion client with custom boto config
# Note: RemotionClient uses boto3 internally, we need to patch it
remotion_client = RemotionClient(
    region=AWS_REGION,
    serve_url=SERVE_URL,
    function_name=REMOTION_FUNCTION_NAME
)


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
    Orchestrates the render process via Remotion Lambda Python SDK.
    """
    if not supabase_admin:
        raise Exception("Supabase client not initialized")

    # 1. Update Status to Processing
    try:
        supabase_admin.table("courses").update({
            "status": "processing_render",
            "progress_phase": "rendering",
            "progress": 0
        }).eq("id", course_id).execute()
    except Exception as e:
        print(f"⚠️ Failed to update status: {e}")

    # 2. Prepare Remotion render params
    print(f"   📤 Starting Remotion render for course {course_id}")
    print(f"   📊 Input props: {len(payload.get('slide_data', []))} slides")
    
    render_params = RenderMediaParams(
        composition=COMPOSITION_ID,
        privacy=Privacy.PUBLIC,
        image_format=ValidStillImageFormats.JPEG,
        input_props=payload,
        concurrency=3,  # Safe limit: (1 Consumer + 3 Workers) * 2 Max SQS Concurrency = 8 Total Lambdas
    )
    
    # 3. Start render using Remotion SDK
    print(f"   🎬 Invoking Remotion Lambda via SDK: {REMOTION_FUNCTION_NAME}")
    
    try:
        response_payload = remotion_client.render_media_on_lambda(render_params)
        
        # The Python SDK returns a dict-like object or Pydantic model
        # based on the library version. Converting to dict if needed.
        # Handle both dict and object responses robustly
        if isinstance(response_payload, dict):
            render_id = response_payload.get('renderId') or response_payload.get('render_id')
            bucket_name = response_payload.get('bucketName') or response_payload.get('bucket_name')
        else:
            # Try attribute access for Pydantic models / objects
            render_id = getattr(response_payload, 'renderId', None) or getattr(response_payload, 'render_id', None)
            bucket_name = getattr(response_payload, 'bucketName', None) or getattr(response_payload, 'bucket_name', None)
            
        print(f"   📥 Remotion Response (Parsed): render_id={render_id}, bucket={bucket_name}")
        
        if not render_id:
            raise Exception(f"No renderId in response: {response_payload}")
            
        print(f"   🎬 Render started: {render_id}")
        print(f"   📦 Bucket: {bucket_name}")
        
    except Exception as e:
        print(f"   ❌ Failed to start render: {e}")
        raise e
    
    # 4. Poll for progress using SDK
    max_wait_time = 840  # 14 minutes
    start_time = time.time()
    poll_interval = 10  # seconds
    
    while (time.time() - start_time) < max_wait_time:
        progress_response = remotion_client.get_render_progress(
            render_id=render_id,
            bucket_name=bucket_name
        )
        
        if not progress_response:
            print("   ⚠️ No progress response, continuing...")
            time.sleep(poll_interval)
            continue
        
        # Handle both dict and object responses for robustness
        if isinstance(progress_response, dict):
            overall_progress = progress_response.get('overallProgress')
            fatal_error = progress_response.get('fatalErrorEncountered')
            errors = progress_response.get('errors')
            done = progress_response.get('done')
            output_file = progress_response.get('outputFile')
        else:
            overall_progress = getattr(progress_response, 'overallProgress', None)
            fatal_error = getattr(progress_response, 'fatalErrorEncountered', None)
            errors = getattr(progress_response, 'errors', None)
            done = getattr(progress_response, 'done', None)
            output_file = getattr(progress_response, 'outputFile', None)

        # Normalize values
        overall_progress = overall_progress or 0
        fatal_error = fatal_error or False
        errors = errors or []
        done = done or False
        
        progress_pct = int(overall_progress * 100)
        
        # Update progress in database
        try:
            supabase_admin.table("courses").update({
                "progress": progress_pct
            }).eq("id", course_id).execute()
        except:
            pass
        
        print(f"   📊 Progress: {progress_pct}%")

        # Check for fatal errors
        if fatal_error:
            raise Exception(f"Remotion render fatal error: {errors}")
        
        # Check if done
        if done:
            if output_file:
                print(f"   ✅ Render complete: {output_file}")
                finalize_render(course_id, output_file)
                return
            else:
                raise Exception("Render reported done but no output file")
        
        time.sleep(poll_interval)
    
    raise Exception(f"Render timed out after {max_wait_time} seconds")


def finalize_render(course_id: str, s3_url: str):
    """
    Updates the course with the final video URL.
    """
    print(f"   ✅ Finalizing render for {course_id}: {s3_url}")
    
    supabase_admin.table("courses").update({
        "video_url": s3_url,
        "status": "completed",
        "progress": 100
    }).eq("id", course_id).execute()


def handle_failure(course_id: str, user_id: str, error: Exception, metadata: dict = None):
    """
    Logs failure and reverts course to reviewable state.
    """
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
