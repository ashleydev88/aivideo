import json
import traceback

def extract_json_from_response(text_content):
    """
    Robustly extract JSON from a model response which may contain markdown code blocks or other text.
    """
    import re

    try:
        # Try direct parsing first
        return json.loads(text_content)
    except json.JSONDecodeError:
        pass

    # Clean up markdown code blocks
    cleaned_text = text_content.strip()
    if "```json" in cleaned_text:
        cleaned_text = cleaned_text.split("```json")[1].split("```")[0]
    elif "```" in cleaned_text:
        cleaned_text = cleaned_text.split("```")[1].split("```")[0]
    
    cleaned_text = cleaned_text.strip()
    
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        # Fallback: Try to find the first '{' and the last '}'
        try:
            json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

        print(f"❌ JSON Parsing Failed. Raw content sample: {text_content[:200]}...")
        raise

def parse_alignment_to_words(alignment: dict) -> list:
    """
    Converts ElevenLabs alignment data (character-level) to word-level timestamps.
    
    Args:
        alignment: Dict with 'characters', 'character_start_times_seconds', 'character_end_times_seconds'
    
    Returns:
        List of {"word": str, "start_ms": int, "end_ms": int}
    """
    if not alignment or not alignment.get("characters"):
        return []
    
    characters = alignment.get("characters", [])
    start_times = alignment.get("character_start_times_seconds", [])
    end_times = alignment.get("character_end_times_seconds", [])
    
    words = []
    current_word = ""
    word_start = -1
    
    for i, char in enumerate(characters):
        t_start = start_times[i] if i < len(start_times) else 0
        t_end = end_times[i] if i < len(end_times) else 0
        
        if word_start == -1:
            word_start = t_start
        
        if char == " ":
            if current_word:
                words.append({
                    "word": current_word,
                    "start_ms": int(word_start * 1000),
                    "end_ms": int(t_end * 1000)
                })
                current_word = ""
                word_start = -1
        else:
            current_word += char
    
    # Capture last word
    if current_word and len(end_times) > 0:
        words.append({
            "word": current_word,
            "start_ms": int(word_start * 1000),
            "end_ms": int(end_times[-1] * 1000)
        })
    
    return words
