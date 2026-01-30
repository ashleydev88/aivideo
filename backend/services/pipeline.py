from backend.services.ai import replicate_chat_completion
from backend.utils.helpers import extract_json_from_response
import json

class PipelineManager:
    """
    Orchestrates the granular AI agents for the V2 workflow.
    """
    def __init__(self, client=None):
        self.client = client

    def assign_visual_types(self, script_data: list) -> list:
        """
        Visual Director Agent: Decides the visual format for each slide.
        Returns the script_data with an added 'visual_type' and 'visual_metadata' field.
        """
        print("   🎬 Visual Director: Assigning formats...")
        
        # Prepare context for the LLM
        slides_context = []
        for idx, slide in enumerate(script_data):
            slides_context.append({
                "id": idx + 1,  # Use 1-based index since slides don't have 'id' field
                "text": slide.get("text", "")[:100] + "...", # Truncate for token efficiency
                "visual_note": slide.get("visual_text", "")
            })

        prompt = f"""
You are a World-Class Instructional Designer and Video Director.
Your task is to assign the optimal VISUAL FORMAT for each slide to maximize learning retention and engagement.

AVAILABLE FORMATS:
1. "hybrid" (Image + Kinetic Text): 
   - BEST FOR: Complex concepts needing a metaphor + definition.
   - Layout: Image on Right, Kinetic Text on Left.
   - Use when you need to anchor a visual metaphor while explaining a key term.

2. "image" (Image Only):
   - BEST FOR: Storytelling, emotional impact, scene-setting, or strong visual metaphors.
   - Layout: Full screen image.
   - Use when the narration is descriptive and the visual needs to take center stage.

3. "chart" (Data/Process Visualization):
   - BEST FOR: Processes, steps, comparisons, lists, statistics, or flow.
   - Layout: Clean, professional animated chart/diagram types.
   - Use whenever the text implies structure (First, Second; vs; increasing/decreasing).

4. "kinetic_text" (Text Only):
   - BEST FOR: Short powerful quotes, definitions, or critical takeaways.
   - Layout: Large, animated typography.
   - Use for emphasis or when no visual metaphor is strong enough.

RULES:
- "Process" language ("steps", "stages", "flow") MUST be a "chart".
- lists of 3+ items should be a "chart" (List view).
- Emotional/Scenario content works best as "image".
- Key definitions work best as "hybrid" or "kinetic_text".
- Use "kinetic_text" for strong, short statements (quotes, warnings, key facts).
- NEVER assign "chart" to two consecutive slides - if content needs chart, use "hybrid" or "kinetic_text" for adjacent slides.
- DIVERSIFY: Avoid using the same format for more than 2 slides in a row.

INPUT SLIDES:
{json.dumps(slides_context, indent=2)}

OUTPUT (JSON):
[
  {{ "id": 1, "type": "image", "reason": "Opening scene setting" }},
  {{ "id": 2, "type": "hybrid", "reason": "Defining the core concept" }}
]
"""
        try:
            res_text = replicate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000
            )
            print(f"   📋 Visual Director Raw Response: {res_text[:500]}...")
            directives = extract_json_from_response(res_text)
            print(f"   📋 Visual Director Parsed Directives: {json.dumps(directives, indent=2)}")
            
            # Map directives back to script_data
            directive_map = {d["id"]: d for d in directives}
            
            enriched_script = []
            type_counts = {"image": 0, "hybrid": 0, "kinetic_text": 0, "chart": 0}
            for idx, slide in enumerate(script_data):
                slide_id = idx + 1  # Use 1-based index to match AI response
                d = directive_map.get(slide_id, {"type": "image"})
                slide["visual_type"] = d.get("type", "image")
                slide["visual_reason"] = d.get("reason", "")
                enriched_script.append(slide)
                # Track type distribution
                vtype = slide["visual_type"]
                type_counts[vtype] = type_counts.get(vtype, 0) + 1
                print(f"   🎬 Slide {slide_id}: visual_type={vtype}, reason={slide['visual_reason'][:50] if slide['visual_reason'] else 'N/A'}")
            
            print(f"   📊 Visual Type Distribution: {type_counts}")
            return enriched_script

        except Exception as e:
            print(f"   ⚠️ Visual Director Failed: {e}")
            # Fallback
            for slide in script_data:
                slide["visual_type"] = "image"
            return script_data



    def generate_kinetic_text(self, narration: str, word_timestamps: list, visual_type: str, slide_duration_ms: int, visual_text: str = "") -> list:
        """
        Kinetic Text Agent: Generates timed on-screen text moments.
        Returns a list of kinetic_events with timing anchored to trigger words.
        
        Args:
            narration: The full narration text for the slide
            word_timestamps: List of {"word": str, "start_ms": int, "end_ms": int}
            visual_type: The slide's visual type (hybrid, kinetic_text, image, chart)
            slide_duration_ms: Total slide duration in milliseconds
            visual_text: The user-edited on-screen text (markdown supported)
        
        Returns:
            List of kinetic_event dicts with text, trigger_word, start_ms, style
        """
        print(f"     ✍️ Generating Kinetic Text (using manual text: {bool(visual_text)})...")
        
        # Determine content type guidance based on visual_type
        if visual_type == "kinetic_text":
            content_guidance = "This is a TEXT-ONLY slide. Generate 1-3 powerful statements that capture the core message. Use larger, impactful phrases."
            max_events = 3
        elif visual_type == "hybrid":
            content_guidance = "This is a SPLIT slide (text + image). Generate 1-2 bullet points or a short header that complements the image. Keep text concise."
            max_events = 2
        elif visual_type == "chart":
            content_guidance = "This is a CHART slide. Generate 0-1 supporting text only if the chart needs context. Usually no text needed."
            max_events = 1
        else:  # image or other
            content_guidance = "This is an IMAGE slide. Generate 0-1 text overlays only if essential. Usually no text needed."
            max_events = 1
        
        # Build word list for context
        word_list = [w["word"] for w in word_timestamps]
        
        prompt = f"""You are a Kinetic Typography Director for corporate e-learning videos.

TASK: Generate on-screen text moments that highlight the MOST MEMORABLE takeaways from this slide's narration.

SLIDE CONTEXT:
{content_guidance}

NARRATION:
"{narration}"

USER-EDITED ON-SCREEN TEXT (PRIORITIZE THIS):
"{visual_text}"

AVAILABLE WORDS (use these exact words as trigger_word):
{', '.join(word_list[:50])}

RULES:
1. Extract KEY TERMS only, never full sentences from the narration
2. Each text must anchor to a specific TRIGGER WORD (exact word from narration above)
3. Think: "What would someone screenshot to remember?"
4. Text should be SHORT (max 5-7 words) and PUNCHY
5. Maximum {max_events} events for this slide type
RULE: If USER-EDITED ON-SCREEN TEXT is provided, you MUST use that text or a subset of it for your kinetic events. Do not invent new text if the user has provided specific text.
7. Return empty array if no text is needed

TEXT STYLES:
- "header": Large title text (e.g., "Lock Your Screen")
- "bullet": Bullet point item (e.g., "• Report within 24 hours")
- "emphasis": Bold statement (e.g., "EVERY. SINGLE. TIME.")
- "stat": Large number with label (e.g., "24hr Reporting Window")

OUTPUT FORMAT (JSON):
{{
  "kinetic_events": [
    {{
      "text": "Short impactful text",
      "trigger_word": "exact_word_from_narration",
      "style": "header|bullet|emphasis|stat"
    }}
  ]
}}

CRITICAL: 
- trigger_word MUST be an EXACT word from the narration
- Return empty array {{"kinetic_events": []}} if this slide doesn't need text
"""
        try:
            res_text = replicate_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000
            )
            print(f"     ✍️ Kinetic Text Raw: {res_text[:300]}...")
            result = extract_json_from_response(res_text)
            events = result.get("kinetic_events", [])
            
            # Post-process: Add timing from word_timestamps
            word_map = {w["word"].lower(): w for w in word_timestamps}
            # Also try with punctuation stripped
            word_map_clean = {w["word"].lower().strip(".,!?;:\"'()[]"): w for w in word_timestamps}
            
            processed_events = []
            for event in events:
                trigger = event.get("trigger_word", "").lower()
                # Try exact match first, then cleaned match
                word_data = word_map.get(trigger) or word_map_clean.get(trigger.strip(".,!?;:\"'()[]"))
                
                if word_data:
                    event["start_ms"] = word_data["start_ms"]
                    processed_events.append(event)
                    print(f"     ✍️ Event: '{event['text']}' @ {event['start_ms']}ms (trigger: {trigger})")
                else:
                    # Fallback: appear at 500ms
                    event["start_ms"] = 500
                    processed_events.append(event)
                    print(f"     ⚠️ Trigger word '{trigger}' not found, defaulting to 500ms")
            
            return processed_events
            
        except Exception as e:
            print(f"     ⚠️ Kinetic Text Gen Failed: {e}")
            return []

def validate_script(script_output, context_package):
    """
    Validates script quality before proceeding to media generation.
    Includes fact-checking against the original policy to catch hallucinations.
    Returns: dict with 'approved' (bool), 'issues' (list), 'ungrounded_claims' (list), 'suggestions' (list)
    """
    print("   🕵️ Validating Script Quality (with fact-checking)...")
    
    # Use original policy for fact-checking (truncate to stay within token limits)
    policy_excerpt = context_package.get('original_policy_text', context_package.get('policy_text', ''))[:8000]
    
    validation_prompt = f"""
You are a quality assurance reviewer for e-learning content with expertise in policy compliance.

Review this video script and perform the following checks:

1. COMPLETENESS: Does it cover the key points from the topics? (List any gaps)
2. COHERENCE: Does each slide transition logically? (Flag jarring jumps)
3. ACCURACY: Are there specific policy details, or just generic advice? (Rate 1-10)
4. IMAGE DIVERSITY: Are image prompts varied and specific? (Flag repetitive prompts)
5. DURATION: Does the math check out? (Sum of all slide durations should be within -5% to +15% of total target duration {context_package['duration']}min). note: Individual slides can range 10s-60s.

6. FACT-CHECK (CRITICAL): For each factual claim in the script, verify it against the source policy:
   - Extract specific claims (numbers, deadlines, procedures, requirements, definitions)
   - Check if each claim is grounded in the original policy text below
   - Flag any claim that appears hallucinated, exaggerated, or incorrectly stated
   - Be especially vigilant about: numbers, timeframes, percentages, specific procedures

ORIGINAL POLICY (source of truth for fact-checking):
{policy_excerpt}

TOPICS TO COVER:
{json.dumps(context_package['topics'], indent=2)}

SCRIPT TO VALIDATE:
{json.dumps(script_output, indent=2)}

OUTPUT (JSON):
{{
  "approved": true or false,
  "completeness_score": 1-10,
  "coherence_score": 1-10,
  "accuracy_score": 1-10,
  "image_diversity_score": 1-10,
  "fact_check_score": 1-10,
  "issues": ["issue 1", "issue 2"],
  "ungrounded_claims": [
    {{"slide": 1, "claim": "quoted claim from script", "issue": "what's wrong or not found in policy"}}
  ],
  "suggestions": ["suggestion 1"]
}}

APPROVAL CRITERIA:
- Approve (true) if all scores are 7+ AND fact_check_score is 8+
- If fact_check_score < 8, you MUST populate ungrounded_claims with specific examples
- Otherwise set approved to false
"""
    
    try:
        res_text = replicate_chat_completion(
            messages=[{"role": "user", "content": validation_prompt}],
            max_tokens=20000
        )
        result = extract_json_from_response(res_text)
        
        # Log fact-check results
        fact_score = result.get('fact_check_score', 'N/A')
        ungrounded = result.get('ungrounded_claims', [])
        print(f"   📊 Fact-check score: {fact_score}/10, Ungrounded claims: {len(ungrounded)}")
        if ungrounded:
            for claim in ungrounded[:3]:  # Log first 3
                print(f"      ⚠️ Slide {claim.get('slide')}: {claim.get('issue', 'Unknown issue')[:50]}...")
        
        return result
    except Exception as e:
        print(f"   ⚠️ Validation Error: {e}")
        # Return a safe fallback so the process doesn't crash and delete the course
        return {
            "approved": False,
            "issues": [f"Validation process failed: {str(e)}"],
            "fact_check_score": 0,
            "ungrounded_claims": [],
            "suggestions": ["Please review manually due to validation system error."]
        }
