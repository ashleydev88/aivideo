from backend.config import VISUAL_DIRECTOR_MODEL, VALIDATION_MODEL
from backend.services.ai import anthropic_chat_completion
from backend.utils.helpers import extract_json_from_response
import json
import re

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
                "text": slide.get("text", ""),
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
                model=VISUAL_DIRECTOR_MODEL,
                telemetry={
                    "stage": "visual_assignment",
                    "agent_name": "visual_director"
                }
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
                                "kicker": graph.nodes[0].data.subLabel if graph.nodes[0].data.subLabel else None,
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
        
        OPTIMIZATION: If visual_text is provided (user edited), we avoid the LLM call
        and use a deterministic alignment algorithm to match the text to the narration.
        """
        
        # 1. OPTIMIZED PATH: Deterministic Alignment
        if visual_text:
            print(f"     ⚡ Using Deterministic Alignment for Kinetic Text (Visual Text present)...")
            
            # Helper to clean words for comparison
            def clean(w): return w.lower().strip(".,!?;:\"'()[]")
            
            # Map word timestamps for fast lookup (keeping order)
            narration_words = [(clean(w["word"]), w["start_ms"]) for w in word_timestamps]
            
            # Split visual text into potential events
            # Logic: Split by newlines first. If single line, split by major punctuation.
            # If plain text, keep as single event or split by sentences?
            # Assuming user formatted widely with newlines for kinetic breaks.
            events_text = [t.strip() for t in visual_text.split('\n') if t.strip()]
            
            # If no newlines, try splitting by sentence terminators
            if len(events_text) <= 1:
                import re
                events_text = [t.strip() for t in re.split(r'(?<=[.!?])\s+', visual_text) if t.strip()]
            
            processed_events = []
            narr_idx = 0
            last_start_ms = 0
            
            for text_chunk in events_text:
                # Find first word of chunk in narration starting from narr_idx
                chunk_words = text_chunk.split()
                if not chunk_words: continue
                
                trigger = clean(chunk_words[0])
                search_idx = narr_idx
                found_match = False
                
                # Search forward in narration
                while search_idx < len(narration_words):
                    nw, start_ms = narration_words[search_idx]
                    if nw == trigger:
                        # Found match!
                        processed_events.append({
                            "text": text_chunk,
                            "trigger_word": chunk_words[0], # Original casing
                            "start_ms": start_ms,
                            "style": "emphasis" if len(clean(text_chunk)) < 20 else "bullet"
                        })
                        last_start_ms = start_ms
                        narr_idx = search_idx + 1 # Advance pointer
                        found_match = True
                        break
                    search_idx += 1
                
                if not found_match:
                    # Fallback: Space out evenly from last verified time?
                    # Or just 500ms after last event
                    fallback_ms = last_start_ms + 1500 if last_start_ms > 0 else 500
                    processed_events.append({
                        "text": text_chunk,
                        "trigger_word": chunk_words[0],
                        "start_ms": fallback_ms,
                        "style": "emphasis" if len(clean(text_chunk)) < 20 else "bullet"
                    })
                    last_start_ms = fallback_ms
                    print(f"     ⚠️ Trigger '{trigger}' not found, falling back to {fallback_ms}ms")
                else:
                    print(f"     ⚡ Aligned: '{text_chunk[:20]}...' @ {last_start_ms}ms")
                    
            return processed_events

        # 2. LLM PATH: Generation from Narration (Only if no visual_text)
        print(f"     ✍️ Generating Kinetic Text (using LLM)...")
        
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
                max_tokens=1000,
                telemetry={
                    "stage": "kinetic_text_generation",
                    "agent_name": "kinetic_text_agent"
                }
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
    Uses a two-pass approach:
    1) Quality/Safety checks (no source policy required)
    2) Claim-level fact-checking against retrieved policy chunks
    Returns: dict with 'approved' (bool), 'issues' (list), 'ungrounded_claims' (list), 'suggestions' (list)
    """
    print("   🕵️ Validating Script Quality (with fact-checking)...")

    def _tokenize(text: str) -> set:
        return set(re.findall(r"[a-zA-Z0-9]{3,}", (text or "").lower()))

    def _chunk_policy(text: str, chunk_size: int = 1800, overlap: int = 250) -> list:
        chunks = []
        if not text:
            return chunks
        start = 0
        idx = 1
        length = len(text)
        while start < length:
            end = min(length, start + chunk_size)
            chunk = text[start:end].strip()
            if chunk:
                chunks.append({"id": f"c{idx}", "text": chunk})
                idx += 1
            if end >= length:
                break
            start = max(0, end - overlap)
        return chunks

    def _top_evidence_for_claim(claim_text: str, chunks: list, top_k: int = 3) -> list:
        claim_tokens = _tokenize(claim_text)
        scored = []
        for ch in chunks:
            chunk_tokens = _tokenize(ch["text"])
            overlap = len(claim_tokens.intersection(chunk_tokens))
            if overlap > 0:
                scored.append((overlap, ch))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    policy_text_raw = context_package.get('original_policy_text', context_package.get('policy_text', ''))

    try:
        # Pass 1: Quality/Safety validation (no source-policy grounding here)
        from backend.prompts import (
            QUALITY_VALIDATION_PROMPT,
            CLAIM_EXTRACTION_PROMPT,
            CLAIM_GROUNDEDNESS_PROMPT
        )

        quality_prompt = QUALITY_VALIDATION_PROMPT.format(
            target_duration=context_package['duration'],
            topics_json=json.dumps(context_package['topics'], indent=2),
            script_json=json.dumps(script_output, indent=2)
        )
        quality_res_text = anthropic_chat_completion(
            messages=[{"role": "user", "content": quality_prompt}],
            max_tokens=3500,
            model=VALIDATION_MODEL,
            telemetry={
                "stage": "validation_quality",
                "agent_name": "quality_validator"
            }
        )
        quality_result = extract_json_from_response(quality_res_text)

        # Pass 2: Claim-level fact checking with evidence retrieval
        ungrounded_claims = []
        fact_check_score = 8  # neutral-good default when no source exists
        fact_issues = []

        if policy_text_raw and len(policy_text_raw.strip()) >= 50:
            print("   🔎 Fact-check: extracting claims...")
            claim_prompt = CLAIM_EXTRACTION_PROMPT.format(
                script_json=json.dumps(script_output, indent=2)
            )
            claim_res_text = anthropic_chat_completion(
                messages=[{"role": "user", "content": claim_prompt}],
                max_tokens=2500,
                model=VALIDATION_MODEL,
                telemetry={
                    "stage": "validation_claim_extraction",
                    "agent_name": "claim_extractor"
                }
            )
            claim_result = extract_json_from_response(claim_res_text)
            extracted_claims = claim_result.get("claims", []) if isinstance(claim_result, dict) else []
            extracted_claims = extracted_claims[:60]  # hard cap for token/cost control

            if extracted_claims:
                policy_chunks = _chunk_policy(policy_text_raw)
                claims_with_evidence = []

                for c in extracted_claims:
                    claim_text = c.get("claim", "")
                    top_chunks = _top_evidence_for_claim(claim_text, policy_chunks, top_k=3)
                    claims_with_evidence.append({
                        "slide": c.get("slide"),
                        "claim": claim_text,
                        "type": c.get("type", "other"),
                        "evidence": [
                            {"id": ch["id"], "text": ch["text"][:900]}
                            for ch in top_chunks
                        ]
                    })

                groundedness_prompt = CLAIM_GROUNDEDNESS_PROMPT.format(
                    claims_with_evidence_json=json.dumps(claims_with_evidence, indent=2)
                )
                groundedness_res_text = anthropic_chat_completion(
                    messages=[{"role": "user", "content": groundedness_prompt}],
                    max_tokens=5000,
                    model=VALIDATION_MODEL,
                    telemetry={
                        "stage": "validation_claim_groundedness",
                        "agent_name": "groundedness_checker"
                    }
                )
                groundedness_result = extract_json_from_response(groundedness_res_text)

                results = groundedness_result.get("results", []) if isinstance(groundedness_result, dict) else []
                provided_score = groundedness_result.get("fact_check_score") if isinstance(groundedness_result, dict) else None

                for r in results:
                    if not r.get("grounded", False):
                        issue = r.get("issue", "Claim not supported by provided policy evidence.")
                        ungrounded_claims.append({
                            "slide": r.get("slide"),
                            "claim": r.get("claim", ""),
                            "issue": issue
                        })
                        fact_issues.append(f"Slide {r.get('slide')}: {issue}")

                if isinstance(provided_score, (int, float)):
                    fact_check_score = int(max(1, min(10, round(provided_score))))
                else:
                    total = len(results)
                    grounded = len([r for r in results if r.get("grounded", False)])
                    if total > 0:
                        fact_check_score = int(max(1, min(10, round((grounded / total) * 10))))
            else:
                print("   ℹ️ No factual claims extracted; assigning high fact-check score by default.")
                fact_check_score = 10
        else:
            print("   ⚠️ No source policy provided; skipping strict claim-grounded fact-check.")

        completeness_score = int(quality_result.get('completeness_score', 0))
        coherence_score = int(quality_result.get('coherence_score', 0))
        accuracy_score = int(quality_result.get('accuracy_score', 0))
        image_diversity_score = int(quality_result.get('image_diversity_score', 0))
        safety_score = int(quality_result.get('safety_compliance_score', 0))

        issues = []
        issues.extend(quality_result.get('issues', []) if isinstance(quality_result.get('issues', []), list) else [])
        issues.extend(fact_issues[:20])

        suggestions = quality_result.get('suggestions', [])
        if not isinstance(suggestions, list):
            suggestions = []
        if ungrounded_claims:
            suggestions.append("Revise or remove ungrounded factual claims, then re-run validation.")

        approved = (
            completeness_score >= 7 and
            coherence_score >= 7 and
            accuracy_score >= 7 and
            image_diversity_score >= 7 and
            safety_score >= 7 and
            fact_check_score >= 8
        )

        result = {
            "approved": approved,
            "completeness_score": completeness_score,
            "coherence_score": coherence_score,
            "accuracy_score": accuracy_score,
            "image_diversity_score": image_diversity_score,
            "safety_compliance_score": safety_score,
            "fact_check_score": fact_check_score,
            "issues": issues,
            "ungrounded_claims": ungrounded_claims,
            "suggestions": suggestions
        }

        print(
            "   📊 Validation Scores: "
            f"FactCheck={fact_check_score}/10, "
            f"Completeness={completeness_score}/10, "
            f"Coherence={coherence_score}/10, "
            f"Accuracy={accuracy_score}/10, "
            f"ImageDiversity={image_diversity_score}/10, "
            f"Safety={safety_score}/10"
        )
        print(f"   📊 Ungrounded claims: {len(ungrounded_claims)}")
        return result

    except Exception as e:
        print(f"   ⚠️ Validation Error: {e}")
        return {
            "approved": False,
            "issues": [f"Validation process failed: {str(e)}"],
            "fact_check_score": 0,
            "ungrounded_claims": [],
            "suggestions": ["Please review manually due to validation system error."]
        }
