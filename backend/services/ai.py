import replicate
import requests
import json
from backend.config import REPLICATE_API_TOKEN, LLM_MODEL_NAME

def replicate_chat_completion(messages, max_tokens=2048, temperature=0.7, model=LLM_MODEL_NAME):
    # Convert messages list to single prompt string
    prompt = ""
    for msg in messages:
        role = msg["role"].capitalize()
        content = msg["content"]
        prompt += f"{role}: {content}\n\n"
    prompt += "Assistant: "

    print(f"   🤖 Calling {model} via Replicate...")
    try:
        output = replicate.run(
            model,
            input={
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        # Replicate usually returns an iterator or list of strings
        if isinstance(output, list) or hasattr(output, '__iter__'):
            return "".join(output)
        return str(output)
    except Exception as e:
        print(f"   ❌ Replicate {model} Error: {e}")
        raise e

def generate_image_replicate(prompt, seed=None):
    print(f"   ⚡ Generating image (SDXL Lightning)...")
    try:
        # Using bytedance/sdxl-lightning-4step for speed and cost
        output = replicate.run(
            "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
            input={
                "prompt": prompt,
                "width": 1280, 
                "height": 720,
                "scheduler": "K_EULER",
                "num_inference_steps": 4,
                "num_inference_steps": 4,
                "negative_prompt": "text, watermark, ugly, blurry, low quality",
                **({"seed": seed} if seed is not None else {})
            }
        )
        # Replicate usually returns a list of outputs for this model, or a single string url
        if isinstance(output, list) and len(output) > 0:
            image_url = output[0]
        else:
            image_url = output if hasattr(output, 'url') else str(output)
            
        return requests.get(image_url).content
    except Exception as e:
        print(f"   ❌ Replicate/SDXL Error: {e}")
    return None

def extract_policy_essence(policy_text: str) -> str:
    """
    Pre-processes long policy documents by stripping boilerplate content.
    Only runs for documents > 10,000 characters to avoid unnecessary API calls.
    Uses Gemini 3 (via Replicate) for fast, cost-effective processing.
    
    PRESERVES: All rules, procedures, requirements, deadlines, consequences.
    REMOVES: Table of contents, headers, footers, revision history, generic definitions.
    
    Returns: Condensed policy text with substantive content only.
    """
    # Skip for short policies - they don't need pre-processing
    if len(policy_text) < 10000:
        print(f"   📄 Policy is {len(policy_text)} chars - skipping pre-processing")
        return policy_text
    
    print(f"   🔧 Pre-processing long policy ({len(policy_text)} chars) via Replicate...")
    
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
        messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"INPUT DOCUMENT ({len(policy_text)} characters):\n{policy_text}"}
            ]
            
        result = replicate_chat_completion(
            messages=messages,
            max_tokens=16000,
            temperature=0.3
        )
        
        condensed_length = len(result)
        reduction = ((len(policy_text) - condensed_length) / len(policy_text)) * 100
        print(f"   ✅ Pre-processed: {len(policy_text)} → {condensed_length} chars ({reduction:.1f}% reduction)")
        return result
    except Exception as e:
        print(f"   ⚠️ Pre-processing failed: {e}. Using original text.")
        return policy_text
