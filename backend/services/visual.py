import os
import tempfile
import requests
from PIL import Image, ImageDraw, ImageFont
import re
import textwrap

# --- ROBUST FONT MANAGER ---
def get_fonts():
    fonts_dir = tempfile.gettempdir()
    regular_path = os.path.join(fonts_dir, "Roboto-Regular-v50.ttf")
    bold_path = os.path.join(fonts_dir, "Roboto-Bold-v50.ttf")

    # Correct URLs for Apache-licensed Roboto
    # Updated URLs for Roboto v50 (Verified)
    r_url = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf" 
    b_url = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf"

    def download_font(url, path):
        # Only download if missing or empty
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            print(f"   ⬇️ Downloading Font: {os.path.basename(path)}...")
            try:
                resp = requests.get(url)
                if resp.status_code == 200:
                    with open(path, "wb") as f:
                        f.write(resp.content)
                else:
                    return False
            except Exception as e:
                print(f"   ⚠️ Font download error: {e}")
                return False
        return True

    r_ok = download_font(r_url, regular_path)
    b_ok = download_font(b_url, bold_path)

    if not r_ok or not b_ok:
        return None, None
    return regular_path, bold_path

def draw_markdown_text(draw, x_start, y_start, text, max_width_px, font_reg, font_bold, fill_color):
    """
    Draws text with support for **bold** markdown, handling wrapping based on pixel width.
    Returns the next y-coordinate.
    """
    line_height = font_reg.size * 1.4
    
    # 1. Parse Tokens: list of (word_str, is_bold)
    # Split by bold markers
    parts = re.split(r'(\*\*.*?\*\*)', text)
    tokens = [] 
    
    for part in parts:
        is_bold = part.startswith("**") and part.endswith("**")
        clean_part = part[2:-2] if is_bold else part
        
        # Split by space to get words, keeping spaces for reconstruction
        # We start by splitting by space
        words = clean_part.split(' ')
        for i, w in enumerate(words):
            if i < len(words) - 1:
                token_text = w + " "
            else:
                token_text = w
            
            if token_text:
                tokens.append((token_text, is_bold))
    
    # 2. Draw Tokens with Wrapping
    curr_x = x_start
    curr_y = y_start
    
    for word, is_bold in tokens:
        font = font_bold if is_bold else font_reg
        w_len = draw.textlength(word, font=font)
        
        # Check wrap
        if curr_x + w_len > x_start + max_width_px:
            # New Line
            curr_x = x_start
            curr_y += line_height
            word_clean = word.lstrip() # Remove leading space on new line
            w_len = draw.textlength(word_clean, font=font)
            draw.text((curr_x, curr_y), word_clean, font=font, fill=fill_color)
            curr_x += w_len
        else:
            draw.text((curr_x, curr_y), word, font=font, fill=fill_color)
            curr_x += w_len
            
    return curr_y + line_height

# --- VISUAL GENERATOR (Layout Aware) ---
def render_slide_visual(image_path, text_content, layout="split", accent_color="#14b8a6"):
    # 1. Setup Canvas (1920x1080)
    canvas = Image.new('RGB', (1920, 1080), '#f8fafc') # Slate-50 background (clean white/grey)
    draw = ImageDraw.Draw(canvas)
    
    # Fonts Load
    reg_path, bold_path = get_fonts()
    try:
        if reg_path and bold_path:
            # Adjust sizes based on layout
            base_size = 50 if layout == "split" else 60
            title_size = 80 if layout == "split" else 100
            
            title_font = ImageFont.truetype(bold_path, title_size) 
            body_font = ImageFont.truetype(reg_path, base_size)
            bold_body_font = ImageFont.truetype(bold_path, base_size) # New: For inline bolding
            quote_font = ImageFont.truetype(reg_path, base_size) # Could be Italic if available
        else:
            raise OSError("Fonts missing")
    except OSError:
        print("   ⚠️ Using default font (fonts failed to load).")
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        bold_body_font = ImageFont.load_default()
        quote_font = ImageFont.load_default()

    # 2. Process Image
    if layout in ["split", "image_only"] and image_path:
        try:
            img = Image.open(image_path)
            
            if layout == "image_only":
                # Fullscreen
                img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
                canvas.paste(img, (0, 0))
                # Fall through to save at the end
                
            elif layout == "split":
                # Right Half
                ratio = 1080 / img.height
                new_size = (int(img.width * ratio), 1080)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                left = (img.width - 960) / 2
                img = img.crop((left, 0, left + 960, 1080))
                canvas.paste(img, (960, 0))
                
        except Exception as e:
            print(f"   ⚠️ Image processing warning: {e}")

    # 3. Process Text (Markdown Lite)
    # Modes: Split (Left side), Text Only (Centered)
    
    if text_content and layout != "image_only": # Double check
        text_color = "#0f172a" # Slate-900 (Dark)
        # accent_color is now passed as parameter (default: teal-500)
        quote_color = "#475569" # Slate-600
        
        lines = text_content.split('\n')
        
        # Coordinates
        if layout == "split":
            x_margin = 120
            y_cursor = 240
            max_width = 20 # Adjusted for 80px font (approx 17-20 chars fit in 800px)
        else: # text_only
            x_margin = 200
            y_cursor = 200 # Start higher
            max_width = 28 # Adjusted for 100px font (approx 25-30 chars fit in 1500px)
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line: continue
            
            # --- Markdown Lite Parser ---
            
            # Header (#)
            if line.startswith("#"):
                clean_line = line.lstrip("#").strip()
                wrapper = textwrap.TextWrapper(width=int(max_width//1.5)) 
                header_lines = wrapper.wrap(clean_line)
                
                # Measure header width to determine underline length
                max_header_width = 0
                for h_line in header_lines:
                    # Use textbbox for reliable measurement (returns left, top, right, bottom)
                    bbox = draw.textbbox((0, 0), h_line, font=title_font)
                    line_width = bbox[2] - bbox[0]  # right - left
                    max_header_width = max(max_header_width, line_width)
                
                # Draw header text
                for h_line in header_lines:
                    draw.text((x_margin, y_cursor), h_line, font=title_font, fill=text_color)
                    y_cursor += (title_font.size * 1.2)
                
                # Underline - match header width with 20px padding
                y_cursor += 20
                underline_width = max_header_width + 20
                draw.rectangle([x_margin, y_cursor, x_margin + underline_width, y_cursor + 8], fill=accent_color)
                y_cursor += 60
                
            # Quote (>)
            elif line.startswith(">") or line.startswith('"'):
                clean_line = line.lstrip(">").strip('"').strip()
                wrapper = textwrap.TextWrapper(width=max_width)
                wrapped = wrapper.wrap(clean_line)
                
                # Draw a bar on left
                draw.rectangle([x_margin - 30, y_cursor, x_margin - 20, y_cursor + (len(wrapped) * 70)], fill=accent_color)
                
                for w_line in wrapped:
                    draw.text((x_margin, y_cursor), w_line, font=quote_font, fill=quote_color) # Italic logic implied
                    y_cursor += (body_font.size * 1.4)
                y_cursor += 40

            # Standard Bullet / Text
            else:
                # Calculate pixel width limit
                if layout == "split":
                    # Text area: 0 to 960
                    # Margin 120. Right padding 80 -> 960 - 120 - 80 = 760
                    max_width_px = 760 
                else: 
                     # text_only: 1920 width
                    max_width_px = 1920 - x_margin - 200

                clean_line = line.replace("-", "").strip()
                
                # Bullet
                if line.startswith("-") and reg_path:
                    draw.text((x_margin - 40, y_cursor), "•", font=body_font, fill=accent_color)
                
                # Draw with markdown support
                y_cursor = draw_markdown_text(
                    draw, x_margin, y_cursor, clean_line, max_width_px, body_font, bold_body_font, text_color
                )
                
                y_cursor += 30

    # Save
    output_path = image_path.replace(".jpg", "_rendered.jpg")
    canvas.save(output_path)
    return output_path
