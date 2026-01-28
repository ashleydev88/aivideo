
import os
import sys
import uuid
import time
import requests

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db import supabase_admin
from backend.services.storage import upload_asset_throttled, get_asset_url

async def test_storage_flow():
    user_id = "test_user_" + str(uuid.uuid4())[:8]
    course_id = "test_course_" + str(uuid.uuid4())[:8]
    filename = "test_asset.txt"
    content = b"This is a test asset content."
    content_type = "text/plain"

    print(f"🚀 Starting Storage Verification")
    print(f"   User ID: {user_id}")
    print(f"   Course ID: {course_id}")
    print(f"   Filename: {filename}")
    print("-" * 50)

    # 1. Upload
    print("1. Uploading Asset...")
    try:
        # Note: upload_asset_throttled is async
        path = await upload_asset_throttled(
            content, 
            filename, 
            content_type, 
            user_id, 
            course_id=course_id
        )
        print(f"   ✅ Upload successful. Path: {path}")
    except Exception as e:
        print(f"   ❌ Upload failed: {e}")
        return

    # 2. Generate Signed URL
    print("\n2. Generating Signed URL...")
    try:
        signed_url = get_asset_url(path, validity=60)
        print(f"   ✅ Signed URL: {signed_url}")
    except Exception as e:
        print(f"   ❌ Failed to sign URL: {e}")
        return

    # 3. Verify Access
    print("\n3. Verifying Access (Download)...")
    try:
        # Wait a moment for propagation (sometimes needed for S3-backed storage)
        time.sleep(1)
        
        response = requests.get(signed_url)
        print(f"   HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            if response.content == content:
                print("   ✅ Content verified match!")
            else:
                print(f"   ⚠️ Content mismatch! Expected {len(content)} bytes, got {len(response.content)}")
        else:
            print(f"   ❌ Access failed!")
            print(f"   Response headers: {response.headers}")
            print(f"   Response body: {response.text[:200]}")

    except Exception as e:
        print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_storage_flow())
