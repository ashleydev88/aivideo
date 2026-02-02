"""
Discovery Agent for AI-powered course planning.

This agent powers the conversational discovery flow, providing intelligent
suggestions for learning outcomes based on the user's topic and audience.
"""

from backend.services.ai import replicate_chat_completion
from backend.utils.helpers import extract_json_from_response
from backend.config import AUDIENCE_STRATEGIES


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

    # Build jurisdiction context
    jurisdiction_context = ""
    if country.upper() == "UK":
        jurisdiction_context = "CONTEXT: UK Employment Law and Regulations (e.g. Equality Act 2010, HSE)."
    else:
        jurisdiction_context = "CONTEXT: US Employment Law and Regulations (e.g. Title VII, OSHA, At-will employment)."
    
    prompt = f"""You are an expert instructional designer. Generate 5 specific, measurable learning outcomes for a training course.

TOPIC: {topic}
TARGET AUDIENCE: {audience_strategy['display_name']}
{jurisdiction_context}

AUDIENCE CONTEXT:
- Tone: {audience_strategy['tone']}
- Focus Areas: {', '.join(audience_strategy['focus_areas'][:4])}
- Narrative Style: "{audience_strategy['narrative_style']}"

REQUIREMENTS:
1. Outcomes should be ACTION-ORIENTED (use verbs: Identify, Explain, Apply, Demonstrate, Report)
2. Make them SPECIFIC to this topic and audience
3. Keep each outcome to ONE sentence (max 15 words)
4. Progress from simple understanding to practical application
5. Focus on what the learner will BE ABLE TO DO after training

OUTPUT FORMAT (JSON):
{{
  "outcomes": [
    "Identify the key requirements of {topic}",
    "Explain why {topic} matters in their role",
    "Apply the correct procedure when...",
    "Recognize warning signs or red flags",
    "Report issues through the appropriate channels"
  ]
}}

Return ONLY the JSON, no other text.
"""

    try:
        res_text = replicate_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
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
