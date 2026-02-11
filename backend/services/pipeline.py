from backend.config import VISUAL_DIRECTOR_MODEL, VALIDATION_MODEL
from backend.services.ai import anthropic_chat_completion
from backend.utils.helpers import extract_json_from_response
import json

class PipelineManager:
    """
    Orchestrates the granular AI agents for the V2 workflow.
    """
    def __init__(self, client=None):
        self.client = client

    async def assign_visual_types(self, script_data: list) -> list:
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
                "visual_note": slide.get("slide_title", "")
            })

        from backend.prompts import VISUAL_DIRECTOR_PROMPT
        import asyncio
        
        prompt = VISUAL_DIRECTOR_PROMPT.format(slides_context=json.dumps(slides_context, indent=2))
        try:
            res_text = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                model=VISUAL_DIRECTOR_MODEL
            )
            print(f"   📋 Visual Director Raw Response: {res_text[:500]}...")
            directives = extract_json_from_response(res_text)
            print(f"   📋 Visual Director Parsed Directives: {json.dumps(directives, indent=2)}")
            
            # Map directives back to script_data
            directive_map = {}
            for d in directives:
                d_id = d.get("id")
                if d_id and d_id not in directive_map:
                    directive_map[d_id] = d
                elif d_id:
                    print(f"   ⚠️ Visual Director Duplicate ID Ignored: {d_id}")
            
            enriched_script = []
            type_counts = {
                "image": 0, "hybrid": 0, "kinetic_text": 0, "chart": 0,
                "contextual_overlay": 0, "comparison_split": 0, 
                "document_anchor": 0, "key_stat_breakout": 0
            }
            for idx, slide in enumerate(script_data):
                slide_id = idx + 1  # Use 1-based index to match AI response
                d = directive_map.get(slide_id, {"type": "image"})
                slide["visual_type"] = d.get("type", "image")
                slide["visual_reason"] = d.get("reason", "")
                slide["visual_reason"] = d.get("reason", "")
                
                # --- NEW LOGIC: Delegate Content Extraction to LogicExtractor ---
                # For specialized types, we now use the dedicated LogicExtractor to get the content
                vtype = slide["visual_type"]
                
                # Mapping Visual Director types to LogicExtractor archetypes
                archetype_map = {
                    "comparison_split": "comparison",
                    "key_stat_breakout": "key-stat-breakout",
                    "document_anchor": "document-anchor",
                    "contextual_overlay": "contextual-overlay",
                    "chart": "process" # Default for generic charts, though course_generator usually handles this
                }
                
                mapped_archetype = archetype_map.get(vtype)
                
                if mapped_archetype:
                    print(f"   🧠 Pipeline: Delegating {vtype} to LogicExtractor ({mapped_archetype})...")
                    try:
                        from backend.services.logic_extraction import logic_extractor
                        text_context = f"Title: {slide.get('slide_title', '')}\nNarration: {slide.get('text', '')}"
                        
                        # We bypass the router and call the specialist directly by extracting with a forced archetype?
                        # Actually logic_extractor.extract_from_text is a 2-step process. 
                        # Ideally we'd have a method to force the archetype. 
                        # For now, we'll let it auto-route OR we can assume the text is clear enough.
                        # BUT, strict control is better. Let's rely on the text context being strong.
                        # WAIT: logic_extraction.py doesn't have a 'force_archetype' param yet.
                        # It's safer to just rely on the existing extract_from_text method for now, 
                        # but we should inject the VISUAL TYPE into the text to guide the router.
                        
                        guided_text = f"[ARCHETYPE REQUEST: {mapped_archetype}]\n{text_context}"
                        graph = await logic_extractor.extract_from_text(guided_text)
                        
                        # --- MAPPER: MotionGraph -> LayoutData ---
                        layout_data = {}
                        
                        if vtype == "comparison_split" and len(graph.nodes) >= 2:
                            layout_data = {
                                "left_label": graph.nodes[0].data.label,
                                "left_text": graph.nodes[0].data.description or "",
                                "right_label": graph.nodes[1].data.label,
                                "right_text": graph.nodes[1].data.description or ""
                            }
                        elif vtype == "key_stat_breakout" and len(graph.nodes) >= 1:
                            layout_data = {
                                "stat_value": graph.nodes[0].data.value or graph.nodes[0].data.label,
                                "stat_label": graph.nodes[0].data.label if graph.nodes[0].data.value else "Statistic",
                                "trend": "neutral"
                            }
                        elif vtype == "document_anchor" and len(graph.nodes) >= 2:
                            layout_data = {
                                "source_reference": graph.nodes[0].data.label,
                                "verbatim_quote": graph.nodes[1].data.label,
                                "context_note": graph.nodes[2].data.label if len(graph.nodes) > 2 else None
                            }
                        elif vtype == "contextual_overlay" and len(graph.nodes) >= 1:
                            layout_data = {
                                "headline": graph.nodes[0].data.label,
                                "subheadline": graph.nodes[1].data.label if len(graph.nodes) > 1 else None,
                                "background_prompt": slide.get("slide_title", "Corporate Background") # Default, will be refined by image prompter
                            }
                            
                        slide["layout_data"] = layout_data
                        
                    except Exception as e:
                        print(f"   ⚠️ specialized content extraction failed: {e}")
                        # Fallback to defaults or empty
                        slide["layout_data"] = {}
                
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
        
        from backend.prompts import KINETIC_TEXT_PROMPT
        
        prompt = KINETIC_TEXT_PROMPT.format(
            content_guidance=content_guidance,
            narration=narration,
            visual_text=visual_text,
            word_list=', '.join(word_list[:50]),
            max_events=max_events
        )
        try:
            res_text = anthropic_chat_completion(
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
    policy_text_raw = context_package.get('original_policy_text', context_package.get('policy_text', ''))
    
    if not policy_text_raw or len(policy_text_raw.strip()) < 50:
        print("   ⚠️ No policy text found. instructing AI to skip unique fact-checking.")
        policy_excerpt = (
            "NO SOURCE POLICY PROVIDED. "
            "Skip strict fact-checking against a source document. "
            "Evaluate based on general coherence, logical flow, and best practices. "
            "Do NOT flag issues as ungrounded claims unless they contradict common knowledge."
        )
    else:
        policy_excerpt = policy_text_raw[:8000]
    
    from backend.prompts import VALIDATION_PROMPT

    validation_prompt = VALIDATION_PROMPT.format(
        target_duration=context_package['duration'],
        policy_excerpt=policy_excerpt,
        topics_json=json.dumps(context_package['topics'], indent=2),
        script_json=json.dumps(script_output, indent=2)
    )
    
    try:
        res_text = anthropic_chat_completion(
            messages=[{"role": "user", "content": validation_prompt}],
            max_tokens=20000,
            model=VALIDATION_MODEL
        )
        result = extract_json_from_response(res_text)
        
        # Log fact-check results
        fact_score = result.get('fact_check_score', 'N/A')
        ungrounded = result.get('ungrounded_claims', [])

        # Log all scores for debugging
        print(f"   📊 Validation Scores: "
              f"FactCheck={fact_score}/10, "
              f"Completeness={result.get('completeness_score', 'N/A')}/10, "
              f"Coherence={result.get('coherence_score', 'N/A')}/10, "
              f"Accuracy={result.get('accuracy_score', 'N/A')}/10, "
              f"ImageDiversity={result.get('image_diversity_score', 'N/A')}/10"
        )
        
        print(f"   📊 Ungrounded claims: {len(ungrounded)}")
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
