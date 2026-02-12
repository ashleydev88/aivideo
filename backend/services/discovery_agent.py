"""
Discovery Agent for AI-powered course planning.

This agent powers the conversational discovery flow, providing intelligent
suggestions for learning outcomes based on the user's topic and audience.
"""

from backend.services.ai import anthropic_chat_completion
from backend.utils.helpers import extract_json_from_response
from backend.config import AUDIENCE_STRATEGIES, DISCOVERY_AGENT_MODEL


def suggest_learning_outcomes(topic: str, audience: str, country: str = "UK") -> list[str]:
    """
    Generates 4-6 relevant learning outcomes based on the topic and target audience.
    
    Args:
        topic: The training topic (e.g., "GDPR Compliance", "Workplace Safety")
        audience: The target audience key (new_hires, all_employees, leadership)
    
    Returns:
        A list of 4-6 suggested learning outcome strings.
    """
    print(f"   🎯 Discovery Agent: Suggesting outcomes for '{topic}' ({audience})...")
    
    # Get audience context
    audience_strategy = AUDIENCE_STRATEGIES.get(audience, AUDIENCE_STRATEGIES["all_employees"])

    # Build jurisdiction and localization context
    from backend.config import LOCALE_CONFIG
    
    country_key = country.upper() if country else "UK"
    loc_config = LOCALE_CONFIG.get(country_key, LOCALE_CONFIG["UK"])
    
    # Use the centralized legal context
    jurisdiction_instruction = loc_config["legal_context"]
    # Get language instruction for prompt
    language_instruction = loc_config["language_instruction"]

    from backend.prompts import DISCOVERY_OUTCOME_PROMPT

    prompt = DISCOVERY_OUTCOME_PROMPT.format(
        topic=topic,
        audience=audience_strategy['display_name'],
        legal_context=jurisdiction_instruction,
        tone=audience_strategy['tone'],
        focus_areas=', '.join(audience_strategy['focus_areas'][:4]),
        narrative_style=audience_strategy['narrative_style'],
        language_instruction=language_instruction
    )

    try:
        res_text = anthropic_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7,
            model=DISCOVERY_AGENT_MODEL,
            telemetry={
                "stage": "discovery_outcomes",
                "agent_name": "discovery_agent"
            }
        )
        
        data = extract_json_from_response(res_text)
        outcomes = data.get("outcomes", [])
        
        # Ensure we have at least some outcomes
        if not outcomes:
            outcomes = [
                f"Understand the fundamentals of {topic}",
                f"Apply {topic} principles in your daily work",
                f"Identify key requirements and responsibilities",
                f"Know when and how to escalate issues"
            ]
        
        print(f"   ✅ Generated {len(outcomes)} learning outcomes")
        return outcomes[:6]  # Cap at 6 outcomes
        
    except Exception as e:
        print(f"   ⚠️ Discovery Agent Error: {e}")
        # Return sensible fallback outcomes
        return [
            f"Understand the core concepts of {topic}",
            f"Identify your responsibilities regarding {topic}",
            f"Apply best practices for {topic}",
            f"Know where to get help and report concerns"
        ]
