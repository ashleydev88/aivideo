import replicate
import requests
import json
from backend.config import REPLICATE_API_TOKEN, LLM_MODEL_NAME, IMAGE_GENERATION_MODEL, ENABLE_LLM_TELEMETRY

import anthropic
import os
import time
from typing import Optional, Dict, Any

# --- CONFIGURE ANTHROPIC ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    print("⚠️ WARNING: ANTHROPIC_API_KEY not found in environment variables.")

def _safe_int(value):
    try:
        return int(value) if value is not None else None
    except Exception:
        return None

def _record_llm_telemetry(
    *,
    model: str,
    success: bool,
    latency_ms: int,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    error_message: Optional[str] = None,
    telemetry: Optional[Dict[str, Any]] = None
):
    """
    Best-effort telemetry logger for all Anthropic calls.
    Writes to public.llm_telemetry via supabase service role client.
    Never raises.
    """
    telemetry = telemetry or {}
    if not ENABLE_LLM_TELEMETRY:
        return
    try:
        from backend.db import supabase_admin
        row = {
            "course_id": telemetry.get("course_id"),
            "user_id": telemetry.get("user_id"),
            "stage": telemetry.get("stage", "unspecified"),
            "agent_name": telemetry.get("agent_name"),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "latency_ms": latency_ms,
            "success": success,
            "error_message": (error_message[:1000] if error_message else None),
            "metadata": telemetry.get("metadata")
        }
        supabase_admin.table("llm_telemetry").insert(row).execute()
    except Exception as _telemetry_error:
        print(f"   ⚠️ LLM telemetry write failed: {_telemetry_error}")

def anthropic_chat_completion(
    messages,
    max_tokens=2048,
    temperature=0.7,
    model=LLM_MODEL_NAME,
    telemetry: Optional[Dict[str, Any]] = None
):
    """
    Wraps Anthropic Claude chat completion.
    Translates OpenAI-style messages to Anthropic format.
    """
    print(f"   🤖 Calling {model} via Anthropic...")
    started_at = time.time()
    
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Extract system instruction if present
        system_instruction = None
        filtered_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                # Ensure roles are 'user' or 'assistant'
                role = msg["role"]
                if role not in ["user", "assistant"]:
                    # Map other roles to user/assistant if needed, or default to user
                    role = "user"
                filtered_messages.append({"role": role, "content": msg["content"]})
        
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": filtered_messages
        }
        
        if system_instruction:
            kwargs["system"] = system_instruction
            
        response = client.messages.create(**kwargs)

        usage = getattr(response, "usage", None)
        input_tokens = _safe_int(getattr(usage, "input_tokens", None)) if usage else None
        output_tokens = _safe_int(getattr(usage, "output_tokens", None)) if usage else None
        total_tokens = (input_tokens + output_tokens) if (input_tokens is not None and output_tokens is not None) else None
        latency_ms = int((time.time() - started_at) * 1000)

        _record_llm_telemetry(
            model=model,
            success=True,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            telemetry=telemetry
        )
        
        return response.content[0].text
        
    except Exception as e:
        print(f"   ❌ Anthropic {model} Error: {e}")
        # Improve error logging for rate limits/overloaded
        if "rate_limit_error" in str(e) or "overloaded_error" in str(e):
             print("   ⚠️ Rate limit or Overloaded. Please retry later.")
        latency_ms = int((time.time() - started_at) * 1000)
        _record_llm_telemetry(
            model=model,
            success=False,
            latency_ms=latency_ms,
            error_message=str(e),
            telemetry=telemetry
        )
        raise e

def generate_image_replicate(prompt, archetype="image", seed=None):
    """
    Generates an image using Replicate (SDXL-Lightning).
    """
    print(f"   🎨 Generating Image ({archetype})...")

    try:
        # Using bytedance/sdxl-lightning-4step for speed and cost
        input_params = {
            "prompt": prompt,
            "width": 1280, 
            "height": 720,
            "scheduler": "K_EULER",
            "num_outputs": 1,
            "guidance_scale": 0,
            "negative_prompt": "text, watermark, ugly, deformed, noisy, blurry, low contrast, text overlay, signage",
            "num_inference_steps": 4
        }
        
        if seed is not None:
            input_params["seed"] = seed

        output = replicate.run(
            IMAGE_GENERATION_MODEL,
            input=input_params
        )
        
        # Replicate usually returns a list of outputs for this model, or a single string url
        image_url = None
        if isinstance(output, list) and len(output) > 0:
            image_url = output[0]
        elif isinstance(output, str):
            image_url = output
        elif hasattr(output, 'url'):
             image_url = output.url
            
        if image_url:
            return requests.get(image_url).content
            
        return None
        
    except Exception as e:
        print(f"   ❌ Image Gen Error: {e}")
        return None

def extract_policy_essence(policy_text: str) -> str:
    """
    Pre-processes long policy documents by stripping boilerplate content.
    Only runs for documents > 10,000 characters to avoid unnecessary API calls.
    Uses Anthropic (via Haiku) for fast, cost-effective processing.
    
    PRESERVES: All rules, procedures, requirements, deadlines, consequences.
    REMOVES: Table of contents, headers, footers, revision history, generic definitions.
    
    Returns: Condensed policy text with substantive content only.
    """
    # Skip for short policies - they don't need pre-processing
    if len(policy_text) < 10000:
        print(f"   📄 Policy is {len(policy_text)} chars - skipping pre-processing")
        return policy_text
    
    print(f"   🔧 Pre-processing long policy ({len(policy_text)} chars) via Anthropic...")
    
    prompt = """You are a Policy Document Specialist. Your task is to extract ONLY the substantive policy content.

REMOVE (do not include):
- Table of contents and indices
- Document headers, footers, page numbers
- Revision history and version notes
- Definitions of common/obvious terms (e.g., "Employee means a person employed by...")
- Generic legal disclaimers and boilerplate
- Redundant restatements of the same rule

PRESERVE (keep exact wording):
- All specific rules and requirements
- Procedures and step-by-step processes
- Deadlines, timeframes, and numerical thresholds
- Consequences and penalties
- Roles and responsibilities
- Examples and scenarios mentioned
- Definitions of policy-specific terms

CRITICAL: Do NOT summarize or paraphrase. Keep the exact original wording of all requirements.

OUTPUT: The condensed policy with only substantive content. No commentary."""

    try:
        # Use a faster/cheaper model if available for this task, otherwise default LLM
        # Assuming LLM_MODEL_NAME or similar. Ideally Haiku should be used here.
        # Let's use the configured LLM_MODEL_NAME for now as it's likely Sonnet or similar powerful model which is fine,
        # or we could import DISCOVERY_AGENT_MODEL (Haiku) from config.
        from backend.config import DISCOVERY_AGENT_MODEL
        
        # Messages structure for Anthropic
        messages=[
            {"role": "user", "content": f"{prompt}\n\nINPUT DOCUMENT ({len(policy_text)} characters):\n{policy_text}"}
        ]
            
        # Note: Anthropic models have large context windows (200k), so we don't strictly *need* to condense for context limits,
        # but it helps with cost and noise reduction.
        
        result = anthropic_chat_completion(
            messages=messages,
            max_tokens=4096, # Claude max output
            temperature=0.3,
            model=DISCOVERY_AGENT_MODEL, # Use Haiku for this bulk task
            telemetry={
                "stage": "policy_preprocess",
                "agent_name": "policy_essence_extractor",
                "metadata": {"input_chars": len(policy_text)}
            }
        )
        
        condensed_length = len(result)
        reduction = ((len(policy_text) - condensed_length) / len(policy_text)) * 100 if len(policy_text) > 0 else 0
        print(f"   ✅ Pre-processed: {len(policy_text)} → {condensed_length} chars ({reduction:.1f}% reduction)")
        return result
    except Exception as e:
        print(f"   ⚠️ Pre-processing failed: {e}. Using original text.")
        return policy_text
