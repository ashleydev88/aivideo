import sys
import os
from PIL import Image
import traceback

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.main import render_slide_visual, get_fonts
except ImportError:
    # Use relative import if running from root
    from main import render_slide_visual, get_fonts

def test():
    print("Testing render_slide_visual...")
    
    # Create dummy bg
    bg_path = "test_bg.jpg"
    Image.new('RGB', (1920, 1080), '#ffffff').save(bg_path)
    
    text = (
        "Normal text\n"
        "**Bold text** here\n"
        "Mixed **bold** and normal\n"
        "Long line with **bold** that should wrap automatically because it is very long and goes beyond the limit."
    )
    
    try:
        output = render_slide_visual(bg_path, text, layout="split")
        print(f"Success! Output: {output}")
        if os.path.exists(output):
            print("Output file exists.")
    except Exception:
        traceback.print_exc()
    finally:
        # Cleanup
        if os.path.exists(bg_path): os.remove(bg_path)
        # Keep output for inspection if needed, or remove
        # if os.path.exists(output): os.remove(output)

if __name__ == "__main__":
    test()
