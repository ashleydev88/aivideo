import asyncio
import sys
import os

# Add parent directory to path to allow imports from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db import supabase_admin

async def backfill_duration():
    print("🔄 Starting Backfill: Actual Duration Calculation")
    
    # Fetch all completed courses
    try:
        response = supabase_admin.table("courses").select("id, name, slide_data, metadata").eq("status", "completed").execute()
        courses = response.data
        
        print(f"found {len(courses)} completed courses.")
        
        count = 0
        for course in courses:
            course_id = course['id']
            slide_data = course.get('slide_data')
            metadata = course.get('metadata') or {}
            
            if not slide_data:
                print(f"⚠️ Skipping {course.get('name')} ({course_id}): No slide data.")
                continue
                
            # Calculate duration
            total_duration_ms = sum(s.get('duration', 0) for s in slide_data)
            
            # Update metadata
            metadata['actual_duration'] = total_duration_ms
            
            supabase_admin.table("courses").update({
                "metadata": metadata
            }).eq("id", course_id).execute()
            
            print(f"✅ Updated {course.get('name')} ({course_id}): {total_duration_ms}ms")
            count += 1
            
        print(f"\n🎉 Backfill Complete. Updated {count} courses.")
        
    except Exception as e:
        print(f"❌ Error during backfill: {e}")

if __name__ == "__main__":
    asyncio.run(backfill_duration())
