
import sys
import os
from io import BytesIO
from PIL import Image

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.services.course_generator import convert_bytes_to_webp

def test_conversion():
    print("🧪 Testing WebP Conversion...")
    
    # 1. Create a dummy JPEG
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    original_bytes = img_byte_arr.getvalue()
    print(f"   Created dummy JPEG: {len(original_bytes)} bytes")
    
    # 2. Convert
    webp_bytes = convert_bytes_to_webp(original_bytes)
    print(f"   Converted to WebP: {len(webp_bytes)} bytes")
    
    # 3. Validation
    # Check if smaller (usually is for simple colors, but overhead might make it close for tiny 100x100 images)
    # Main check is format
    
    result_img = Image.open(BytesIO(webp_bytes))
    print(f"   Result Format: {result_img.format}")
    
    if result_img.format == 'WEBP':
        print("   ✅ SUCCESS: Image is WebP")
    else:
        print(f"   ❌ FAILURE: Image is {result_img.format}")

    # Check optimization (size)
    # For a solid red image, webp should be very small.
    if len(webp_bytes) < len(original_bytes):
        print(f"   ✅ SUCCESS: Size reduced ({len(original_bytes)} -> {len(webp_bytes)})")
    else:
        print(f"   ℹ️ Note: Size not reduced (expected for tiny test images sometimes)")

if __name__ == "__main__":
    test_conversion()
