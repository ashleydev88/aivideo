import json
import os
import asyncio
import tempfile
import subprocess
import traceback
from supabase import create_client
from backend.services.storage import handle_failure

# Environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase Admin
supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def lambda_handler(event, context):
    """
    AWS Lambda Handler for SQS Video Render Queue.
    """
    print("🚀 Wrapper Lambda: Received event batch")
    
    for record in event.get('Records', []):
        try:
            body = json.loads(record['body'])
            course_id = body.get('course_id')
            user_id = body.get('user_id')
            payload = body.get('payload') # input props
            
            print(f"   Processing course_id: {course_id}")
            
            # Sync wrapper for async processing if needed, 
            # or just run sync logic since Lambda is event-driven
            process_render_job(course_id, user_id, payload)
            
        except Exception as e:
            print(f"❌ Error processing record: {e}")
            traceback.print_exc()
            # In a real DLQ setup, we might raise e to trigger retry, 
            # but user asked for DLQ after 3 attempts. SQS handles that if we raise.
            # However, we also want to update DB to 'failed' if it's a hard fail?
            # For now, let's catch and update DB, but re-raise if we want SQS retry.
            # Given "prevent SQS from retrying a job while it is still processing", 
            # we assume we handle it. 
            if course_id and supabase_admin:
                handle_failure(course_id, user_id, e, {"stage": "lambda_worker"})
            raise e # Raise to let SQS know it failed (trigger retry/DLQ)

def process_render_job(course_id, user_id, payload):
    """
    Orchestrates the render process.
    """
    if not supabase_admin:
        print("❌ Supabase client not initialized")
        return

    # 1. Update Status to Processing
    try:
        supabase_admin.table("courses").update({
            "status": "processing_render",
            "progress_phase": "rendering",
            "progress_current_step": 0
        }).eq("id", course_id).execute()
    except Exception as e:
        print(f"⚠️ Failed to update status: {e}")

    try:
        # 2. Setup Remotion Environment
        # Note: On Lambda, we need npx/node. Assuming Custom Runtime or Layer.
        
        # Define Paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(current_dir)
        remotion_dir = os.path.join(root_dir, "remotion-renderer")
        
        # If running locally or differently structure:
        if not os.path.exists(remotion_dir):
            print(f"⚠️ Remotion dir not found at {remotion_dir}, trying sibling...")
            remotion_dir = os.path.join(os.path.dirname(root_dir), "remotion-renderer")
        
        print(f"   📂 Remotion Dir: {remotion_dir}")

        SERVE_URL = "https://remotionlambda-euwest2-wxjopockvc.s3.eu-west-2.amazonaws.com/sites/video-renderer/index.html"
        COMPOSITION_ID = "Main"
        FUNCTION_NAME = "remotion-render-4-0-405-mem3008mb-disk10240mb-900sec" # Update if needed
        
        # Prepare Props File
        output_path = tempfile.mktemp(suffix=".mp4")
        props_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(payload, props_file)
        props_file.close()

        # Construct Command
        cmd_args = [
            "npx", "remotion", "lambda", "render",
            SERVE_URL,
            COMPOSITION_ID,
            "--function-name", FUNCTION_NAME,
            "--props", props_file.name,
            "--output", output_path,
            "--log", "verbose",
            "--yes",
            "--concurrency", "30",
            "--timeout", "900" 
        ]
        
        print(f"   🏃 Running: {' '.join(cmd_args)}")
        
        env = os.environ.copy()
        
        # Ensure AWS credentials are passed to the subprocess
        # Map REMOTION_AWS_* to AWS_* if standard keys are missing but REMOTION keys exist
        if not env.get("AWS_ACCESS_KEY_ID") and env.get("REMOTION_AWS_ACCESS_KEY_ID"):
            env["AWS_ACCESS_KEY_ID"] = env["REMOTION_AWS_ACCESS_KEY_ID"]
            print("   🔑 Mapped REMOTION_AWS_ACCESS_KEY_ID to AWS_ACCESS_KEY_ID")
            
        if not env.get("AWS_SECRET_ACCESS_KEY") and env.get("REMOTION_AWS_SECRET_ACCESS_KEY"):
            env["AWS_SECRET_ACCESS_KEY"] = env["REMOTION_AWS_SECRET_ACCESS_KEY"]
            
        if not env.get("AWS_REGION") and env.get("REMOTION_AWS_REGION"):
            env["AWS_REGION"] = env["REMOTION_AWS_REGION"]

        env["PATH"] = f"{env.get('PATH', '')}:/var/lang/bin:/usr/local/bin:/opt/homebrew/bin"
        
        process = subprocess.Popen(
            cmd_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=remotion_dir,
            env=env,
            text=True
        )

        s3_url = None
        
        # Stream Log
        for line in process.stdout:
            print(f"   [Remotion] {line.strip()}")
            if "https://" in line and ".mp4" in line and "s3" in line.lower():
                # Naive extraction - better to rely on structured output but CLI prints URL at end
                # Usually: "Your video is ready: https://..."
                parts = line.split(" ")
                for p in parts:
                    if p.startswith("https://") and p.endswith(".mp4"):
                        s3_url = p.strip()

        return_code = process.wait()
        
        if return_code != 0:
            raise Exception(f"Remotion CLI failed with code {return_code}")

        if not s3_url:
             # Try to find S3 URL in output if we missed it
             raise Exception("Could not find S3 URL in CLI output")

        print(f"   ✅ Video Rendered: {s3_url}")
        
        # 3. Success Update
        supabase_admin.table("courses").update({
            "video_url": s3_url,
            "status": "completed",
            "progress_current_step": 100
        }).eq("id", course_id).execute()

    except Exception as e:
        print(f"❌ Render Failed: {e}")
        # Re-raise to trigger handle_failure in caller
        raise e
    finally:
        # Cleanup
        if 'props_file' in locals() and os.path.exists(props_file.name):
            os.remove(props_file.name)
