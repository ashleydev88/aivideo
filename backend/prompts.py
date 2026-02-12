"""
Centralized Prompt Library for the AI Video Backend.
All LLM prompts, system instructions, and pedagogical frameworks should be defined here.
"""

# --- STYLE PROMPTS ---

MINIMALIST_PROMPT = (
    "A clean, modern flat vector art style inspired by high-end tech SaaS interfaces. "
    "The aesthetic relies on geometric abstraction, ample negative space, and razor-sharp precision to convey clarity. "
    "The palette is strictly monochromatic or duotone (shades of {primary_color} and slate) with high-contrast elements for readability. "
    "Backgrounds are solid, muted colours or subtle geometric patterns that do not distract. "
    "The overall look is functional, efficient, and corporate-modern, similar to 'Corporate Memphis' but more restrained and less abstract. "
    "Scenes should focus on metaphorical representations of concepts—using icons, charts, and simplified shapes—rather than detailed character studies. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)

PHOTO_REALISTIC_PROMPT = (
    "A high-resolution, cinematic stock photography aesthetic with a focus on authenticity and modern office realism. "
    "The style utilizes soft, natural lighting (simulated window light) and shallow depth of field (bokeh) to isolate the subject from the background. "
    "The palette is true-to-life but with a subtle {primary_color} colour-grade for a cohesive 'editorial' look. "
    "Backgrounds should be blurred modern workspaces, glass walls, or generic corporate environments. "
    "The overall look is trustworthy, serious, and high-production value. "
    "Scenes should depict diverse professionals in candid, 'in-action' moments rather than stiff poses, or close-ups of relevant objects (laptops, safety gear, documents) on desks. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)

WATERCOLOUR_PROMPT = (
    "A sophisticated corporate illustration in a semi-realistic, hand-drawn aesthetic. "
    "The style features distinct, expressive charcoal or ink outlines combined with soft, "
    "textured watercolour-style colouring. "
    "The palette is restrained and professional: primarily navy blues, cool greys, and crisp "
    "whites, with selective warm accents of {primary_color}, mustard yellow and beige. "
    "Backgrounds are often simplified, airy, or fade into a white vignette. "
    "The overall look is polished yet human, evocative of high-end editorial illustrations for "
    "business technology. "
    "Scenes should prioritize relevant objects, tools over human subjects where possible, "
    "though diverse professionals and office environments can be used when a human "
    "element is essential. "
    "CRITICAL: Ensuring no text, signage, numbers or readable characters appear anywhere in the composition."
)

STYLE_MAPPING = {
    "Minimalist Vector": {
        "prompt": MINIMALIST_PROMPT,
        "default_accent": "#14b8a6",
        "default_color_name": "teal"
    },
    "Photo Realistic": {
        "prompt": PHOTO_REALISTIC_PROMPT,
        "default_accent": "#3b82f6",
        "default_color_name": "blue"
    },
    "Sophisticated Watercolour": {
        "prompt": WATERCOLOUR_PROMPT,
        "default_accent": "#0ea5e9",
        "default_color_name": "sky blue"
    },
}

# --- PEDAGOGY ---

PEDAGOGY_INSTRUCTIONS = {
    "cognitive_load": (
        "STRICT COGNITIVE LOAD CONTROL:\n"
        "- LIMIT NARRATION: Maximum 45 words per slide (approx 18-20 seconds).\n"
        "- ONE CONCEPT RULE: If a sentence contains 'and', 'also', or multiple commas, split it across two slides.\n"
        "- ACTIVE VOICE: Use 'You' and 'We'. Avoid passive voice (e.g., 'Forms must be signed' -> 'You must sign the form')."
    ),
    "multimedia_principles": (
        "MAYER'S MULTIMEDIA PRINCIPLES (MANDATORY):\n"
        "1. REDUNDANCY PRINCIPLE: The On-Screen Text (visual_text) must NEVER match the Narration verbatim. "
        "Narration explains; Visual Text anchors. \n"
        "   - BAD: Narration says 'Wear goggles', Text says 'Wear goggles'.\n"
        "   - GOOD: Narration says 'Always protect your eyes before entering the zone', Text says 'MANDATORY: GOGGLES'.\n"
        "2. SIGNALING PRINCIPLE: Use cue words in narration (First, Therefore, However) to guide the learner's mental model."
    ),
    "visual_logic": (
        "VISUAL-VERBAL ALIGNMENT:\n"
        "You must select a 'visual_archetype' for every slide based on the logic of the content:\n"
        "- 'process': For steps, workflows, or sequences.\n"
        "- 'comparison': For 'Do vs Don't', 'Old vs New', or contrasting options.\n"
        "- 'list': For 3+ items, requirements, or checklists.\n"
        "- 'metaphor': For abstract concepts (e.g., an iceberg for hidden risks).\n"
        "- 'statistic': For data, percentages, or key numbers.\n"
        "- 'contextual_overlay': For establishing shots or emotional resonance.\n"
        "CRITICAL: The narration must reference the visual structure (e.g., 'As you can see in this sequence...', 'Unlike the option on the left...')."
    )
}

# --- SAFETY & LIABILITY ---

SAFETY_AND_LIABILITY_GUARDRAILS = (
    "SAFETY & LIABILITY GUARDRAILS (NON-NEGOTIABLE):\n"
    "1. EMPLOYER PROTECTION: Never imply the employer is negligent or currently unsafe. Use phrasing like 'Our safety protocols are designed to...' rather than 'We are trying to fix...'.\n"
    "2. REPORTING HIERARCHY: Always direct employees to report issues to their Supervisor, Manager, or HR *before* mentioning external bodies (unions, regulators, police) unless explicitly required by law for a specific Life-Threatening emergency.\n"
    "   - BAD: 'Call the police if you are harassed.'\n"
    "   - GOOD: 'Report harassment immediately to your manager or HR.'\n"
    "3. ACTION PROTOCOLS (STOP & REPORT): In unsafe situations, instruct employees to 'Stop work and report the hazard immediately' rather than using the phrase 'Refuse to work'. 'Refusal' implies insubordination; 'Stopping for Safety' implies compliance.\n"
    "4. NO ABSOLUTES: Avoid liability-creating absolutes like 'This machine is perfectly safe' or 'Accidents never happen'. Use qualified statements: 'When used correctly, this machine...' or 'Following these steps reduces risk...'.\n"
    "5. EMERGENCY RESPONSE: For accidents/medical issues, the first step is usually 'Secure the area' or 'Contact on-site First Aid/Security', then 'Emergency Services' if needed. Do not jump to 'Call 999' as the first step for minor incidents."
)

LEARNING_ARCS = {
    "skill": "1. HOOK (Why it matters) -> 2. CONCEPT (The Rule) -> 3. STEPS (How to do it) -> 4. PITFALLS (What to avoid)",
    "compliance": "1. RISK (The Consequence) -> 2. RULE (The Requirement) -> 3. ACTION (What you must do) -> 4. RESOURCES (Where to get help)",
    "executive": "1. BOTTOM LINE (Key Takeaway) -> 2. CONTEXT (Why now) -> 3. STRATEGY (The Plan) -> 4. ASK (Required Decision)"
}

# --- GENERATION PROMPTS ---

HYBRID_GENERATOR_PROMPT = """
You are a High-End Typography Designer. 
Your task is to take a Slide Title and Narration, and create punchy, layout-appropriate visual text for a HYBRID slide (50% image, 50% text).

CONTEXT:
Title: {title}
Narration: {narration}

RULES:
1. Use semantic HTML focusing on impact (<h1> for headers, <strong> for emphasis).
2. Maximum 30 words total.
3. Anchor the text to the core action or term mentioned in the narration.
4. Do NOT repeat the narration verbatim.
5. Use headers and maximum 3 bullet points or numbered items.

OUTPUT FORMAT (JSON):
{{
  "visual_text": "HTML string"
}}
"""

KINETIC_GENERATOR_PROMPT = """
You are a Motion Graphics Text Designer.
Your task is to create high-impact, typographic visual text for a kinetic text-only slide.

CONTEXT:
Title: {title}
Narration: {narration}

RULES:
1. Focus on one or two powerful statements.
2. Use <h1> for the main takeaway and <strong> for critical keywords.
3. Maximum 30 words total.
4. This text will be the only thing on screen, so make it count.

OUTPUT FORMAT (JSON):
{{
  "visual_text": "HTML string"
}}
"""

IMAGE_PROMPT_GENERATOR_PROMPT_SINGLE = """
You are a Professional Diffusion Prompt Engineer.
Your task is to take a Slide Title, Narration, and Visual Archetype, and create a high-quality, descriptive image prompt for a diffusion model (SDXL).

CONTEXT:
Title: {title}
Narration: {narration}
Archetype: {archetype}

ARCHETYPE GUIDES (Strictly frame the image based on this):
- "hybrid": Main subject on the RIGHT (approx 50%). Left side must be empty, blurred, or negative space for text overlay.
- "image": Standard cinematic framing. Center subject allowed. Full screen visual.
- "contextual_overlay": Atmospheric, textured background. NO strong focal points. Ample negative space everywhere.
- "comparison_split": Two distinct sides or contrasting elements.
- "chart": (Note: This usually uses a graph tool, but if generating an image, showing a data-driven abstract concept).
- "document_anchor": Close up of a paper, document, or screen with legible text focus (implied).

RULES:
1. Focus on visual description, lighting, composition, and mood.
2. Translate abstract concepts into concrete visual metaphors or scenes.
3. Keep the prompt between 30-60 words.
4. DO NOT include any text, signage, or words to be rendered in the image.
5. Focus on the core subject and environment.

OUTPUT FORMAT (JSON):
{{
  "prompt": "The detailed diffusion prompt"
}}
"""

BATCH_IMAGE_PROMPT_GENERATOR_PROMPT = """
You are Publishing Director for visual storytelling. You generate image prompts for an SDXL diffusion model, ensuring each image is highly relevant to its slide and varied across the course.

=== COURSE CONTEXT ===
Course Topic: {course_topic}
Visual Style: {style_name}

=== STYLE GUIDE ===
Tailor ALL prompts to this visual style:
- "Minimalist Vector": Clean flat vector art, geometric abstraction, negative space, monochromatic/duotone palettes. Describe shapes, icons, and simplified metaphors — NOT photorealistic scenes.
- "Photo Realistic": Cinematic stock photography, natural lighting, shallow depth of field, modern workspaces. Describe real-world scenes with diverse professionals in candid moments.
- "Sophisticated Watercolour": Semi-realistic hand-drawn illustration, ink outlines, soft watercolour textures, muted professional palette. Describe illustrated scenes with expressive linework.

=== ARCHETYPE COMPOSITION GUIDES ===
- "hybrid": Main subject on the RIGHT (approx 50%). Left side MUST be empty, blurred, or negative space for text overlay.
- "image": Standard cinematic framing. Center subject allowed. Full screen visual.
- "contextual_overlay": Atmospheric, textured background. NO strong focal points. Ample negative space everywhere. Suitable as a background behind text.

=== SLIDES ===
{slides_json}

=== RULES ===
1. Each prompt must be 30-60 words focusing on visual description, lighting, composition, and mood.
2. Translate abstract concepts into CONCRETE visual metaphors grounded in the course topic.
3. DO NOT include any text, signage, numbers, or readable characters in prompts.
4. DIVERSITY IS CRITICAL: Vary subjects, settings, angles, and metaphors across slides. No two prompts should depict the same scene or use the same visual metaphor.
5. Every prompt must be clearly relevant to its specific slide narration AND the overall course topic.
6. Follow the archetype composition guide strictly for each slide's archetype.

=== OUTPUT FORMAT (JSON) ===
[
  {{ "id": 1, "prompt": "The detailed diffusion prompt..." }},
  {{ "id": 2, "prompt": "..." }}
]

Return ONLY the JSON array. One entry per slide provided. IDs must match the input slide IDs exactly.
"""

# --- INSTRUCTIONAL DESIGN ---

OUTLINE_GENERATOR_PROMPT = """
You are a World-Class Instructional Architect.
Your goal is to design the STRUCTURE (Outline) for a high-retention video course.

=== CONTEXT ===
COURSE TITLE: {title}
AUDIENCE: {audience}
TOTAL TIME: {duration} minutes ({target_slides} slides target).
LEARNING ARC: {learning_arc}
LOCALIZATION: {language_instruction}

=== TASK ===
Generate a High-Level Outline for exactly {target_slides} slides.
For each slide, provide:
1. "slide_number": 1 to {target_slides}
2. "title": Short header (e.g., "The Problem", "The Solution")
3. "concept": Brief description of what this slide covers (1 sentence)
4. "visual_archetype": (image, chart, kinetic_text, comparison, process, list, metaphor)

=== CRITICAL CONSTRAINT ===
You must strictly follow the "Learning Arc" structure defined above.
MANDATORY: The slide *before* the final conclusion loop MUST be a "Knowledge Check".
- Title: "Quick Check"
- Concept: A scenario-based multiple choice question (A, B, or C). 
- Visual Archetype: "kinetic_text" (or "list" if options are long).

=== OUTPUT FORMAT (JSON ONLY) ===
{{
  "outline": [
    {{ "slide_number": 1, "title": "...", "concept": "...", "visual_archetype": "..." }},
    ...
  ]
}}
"""

SCRIPT_GENERATOR_PROMPT = """
You are an Expert Video Director and Scriptwriter.
You will now write the FULL SCRIPT for the course based on the provided OUTLINE.

=== CONTEXT ===
AUDIENCE: {audience}
TONE: {tone} ("{narrative_style}")
SOURCE MATERIAL: {source_material}...

=== SAFETY & LIABILITY GUARDRAILS (CRITICAL) ===
{safety_guardrails}

=== PEDAGOGICAL RULES (STRICT COMPLIANCE REQUIRED) ===
{pedagogy_cognitive}

{pedagogy_multimedia}

{pedagogy_visual}

=== THE APPROVED OUTLINE (FOLLOW THIS) ===
{outline_json}

=== LANGUAGE & SPELLING ===
Please {language_instruction} throughout the script.

=== TASK ===
Generate the final JSON script. For each slide in the outline:
1. Write 'slide_title' (Conceptual headline, max 6 words).
2. Write 'text' (Narration) that explains the concept.
3. Select the best 'visual_archetype' (image, chart, kinetic_text, contextual_overlay, comparison_split, document_anchor, key_stat_breakout).

=== VISUAL ARCHETYPE GUIDE ===
- If explaining a workflow -> Use 'process'.
- If explaining a danger -> Use 'metaphor'.
- If listing requirements -> Use 'list'.
- If contrasting ideas -> Use 'comparison'.

=== SPECIAL VISUAL RULES ===
- For "Knowledge Check" / "Quick Check" slides:
   - Slide Title: THE QUESTION.
   - Narration: Read the question. Read the options. Then say "Take a moment..." (provide a pause in wording). Then say "The correct answer is [X] because [reason]."
   - Duration: Override the default. Set duration to at least 20000 (20 seconds) to allow thinking time.

=== OUTPUT FORMAT (JSON ONLY) ===
{{
  "script": [
    {{
      "slide_number": 1,
      "visual_archetype": "contextual_overlay", 
      "slide_title": "{title}",
      "text": "Welcome. In the next few minutes, we will master the core safety protocols that keep you safe.",
      "duration": 12000
    }}
    // ... continue for all slides in the outline
  ]
}}
"""

VALIDATION_PROMPT = """
You are a quality assurance reviewer for e-learning content with expertise in policy compliance.

Review this video script and perform the following checks:

1. COMPLETENESS: Does it cover the key points from the topics? (List any gaps)
2. COHERENCE: Does each slide transition logically? (Flag jarring jumps)
3. ACCURACY: Are there specific policy details, or just generic advice? (Rate 1-10)
4. IMAGE DIVERSITY: Are image prompts varied and specific? (Flag repetitive prompts)
5. DURATION: Does the math check out? (Sum of all slide durations should be within -5% to +15% of total target duration {target_duration}min). note: Individual slides can range 10s-60s.

6. SAFETY & COMPLIANCE CHECK: Does the script protect the employer and follow proper reporting lines?
   - Flag any "Refusal of work" language (should be "Stop and Report").
   - Flag any direct external escalation (e.g., calling 999/Police) without internal reporting first.
   - Flag any admission of fault or unsafe conditions.

7. FACT-CHECK (CRITICAL): For each factual claim in the script, verify it against the source policy:
   - Extract specific claims (numbers, deadlines, procedures, requirements, definitions)
   - Check if each claim is grounded in the original policy text below
   - Flag any claim that appears hallucinated, exaggerated, or incorrectly stated
   - Be especially vigilant about: numbers, timeframes, percentages, specific procedures

ORIGINAL POLICY (source of truth for fact-checking):
{policy_excerpt}

TOPICS TO COVER:
{topics_json}

SCRIPT TO VALIDATE:
{script_json}

OUTPUT (JSON):
{{
  "approved": true or false,
  "completeness_score": 1-10,
  "coherence_score": 1-10,
  "accuracy_score": 1-10,
  "image_diversity_score": 1-10,
  "safety_compliance_score": 1-10,
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
- If safety_compliance_score < 7, you MUST flag specific safety language issues
- Otherwise set approved to false
"""

# --- DISCOVERY ---

DISCOVERY_OUTCOME_PROMPT = """You are an expert instructional designer. Generate 5 specific, measurable learning outcomes for a training course.

TOPIC: {topic}
TARGET AUDIENCE: {audience}
LEGAL CONTEXT: {legal_context}

AUDIENCE CONTEXT:
- Tone: {tone}
- Focus Areas: {focus_areas}
- Narrative Style: "{narrative_style}"

LOCALIZATION:
Please {language_instruction}

REQUIREMENTS:
1. Outcomes should be ACTION-ORIENTED (use verbs: Identify, Explain, Apply, Demonstrate, Report)
2. Make them SPECIFIC to this topic and audience
3. Keep each outcome to ONE sentence (max 15 words)
4. Progress from simple understanding to practical application
5. Focus on what the learner will BE ABLE TO DO after training
6. Ensure all outcomes align with corporate liability protection (e.g., 'Report hazards' instead of 'Refuse unsafe tasks')

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

TOPIC_GENERATION_PROMPT = """You are an expert instructional designer specializing in creating engaging corporate training.

=== STEP 1: CONTENT EXTRACTION (MANDATORY) ===

Analyze the SOURCE DOCUMENT below and extract ALL key topics, procedures, requirements, and important information.
DO NOT skip any sections. DO NOT invent topics not present in the document.

SOURCE DOCUMENT (THIS IS THE PRIMARY SOURCE OF TRUTH):
{source_document}

=== STEP 2: AUDIENCE ADAPTATION for {audience_display_name} ===

{extraction_prompt}

Prioritize these aspects for {audience_display_name}:
{focus_areas}

=== STEP 3: TONE & PRESENTATION ===

Apply this tone and structure to the extracted content:
- Tone: {tone}
- Structure: {structure}
- Language Level: {language_level}
- Narrative Style: "{narrative_style}"
- Call to Action: {call_to_action}

=== STEP 4: DURATION CALIBRATION ===

Calibrate depth and topic count for a {duration}-MINUTE course:
- Purpose: {purpose}
- Pedagogical Goal: {pedagogical_goal}
- Topic Count: {topic_count}
- Depth Level: {depth_level}
- Content Priorities: {content_priorities}


=== OUTPUT FORMAT (JSON) ===
{{
  "title": "Engaging Course Title (based on document content)",
  "learning_objective": "Clear, measurable learning outcome",
  "document_type_detected": "Brief description of what kind of document this is (e.g., 'disciplinary policy', 'safety manual', 'onboarding guide')",
  "topics": [
    {{
      "id": 1,
      "title": "Topic Title (from document)",
      "purpose": "What {audience_display_name} will understand/be able to do",
      "key_points": ["Point 1 (from document)", "Point 2", "Point 3"],
      "estimated_slides": 3,
      "complexity": "simple|moderate|complex"
    }}
  ]
}}

CRITICAL REQUIREMENTS:
- Topics MUST come from the source document content
- Follow the {topic_count} topic guideline  
- Adapt depth to {depth_level}
- Frame topics from the perspective of {audience_display_name}
- DO NOT generate generic topics unless explicitly in the document
"""

# --- VISUAL DIRECTOR ---

VISUAL_DIRECTOR_PROMPT = """
You are a World-Class Instructional Designer and Video Director.
Your task is to assign the optimal VISUAL FORMAT for each slide to maximize learning retention and engagement.

AVAILABLE FORMATS:

--- STANDARD LAYOUTS ---

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

--- SPECIALIZED LAYOUTS (Use for specific content patterns) ---

5. "contextual_overlay" (Full-Screen Background with Glassmorphism Text):
   - BEST FOR: Introductions, section headers, topic transitions, or setting environmental context.
   - Layout: AI-generated full-screen background with semi-transparent text overlay.
   - TRIGGER PATTERNS: "Welcome to...", "In this section...", "Let's explore...", section intros, topic overviews.
   - Use when you want to establish mood/environment while presenting a headline.

6. "comparison_split" (Do This vs. Not That Split-Screen):
   - BEST FOR: Dos and Don'ts, binary choices, compliant vs. non-compliant, pros vs. cons.
   - Layout: Vertical split-screen. Left=negative (red tint), Right=positive (green tint).
   - TRIGGER PATTERNS: "Do/Don't", "vs", "instead of", "rather than", "correct/incorrect", "right/wrong", "compliant/non-compliant".
   - Use when content presents a clear binary choice or contrast between two actions.

7. "document_anchor" (Legal Quote / Source Citation):
   - BEST FOR: Quoting specific legal clauses, policy citations, regulations, or official documents.
   - Layout: Document page visual on one side, highlighted verbatim quote on the other.
   - TRIGGER PATTERNS: "Article X", "Section Y", "According to the policy", "The regulation states", quotes with specific sources, GDPR, legal citations.
   - Use when building authority by showing exactly where a rule comes from.

8. "key_stat_breakout" (Large Statistic Display):
   - BEST FOR: Statistics, percentages, monetary figures, key metrics, success rates.
   - Layout: Large number/percentage (50-60% of screen) with context label below.
   - TRIGGER PATTERNS: Specific numbers like "45%", "$2.5M", "3x increase", "90% of employees", "within 24 hours".
   - Use when a single statistic is the main takeaway of the slide.

RULES:
- "Process" language ("steps", "stages", "flow") MUST be a "chart".
- Lists of 3+ items should be a "chart" (List view).
- Emotional/Scenario content works best as "image".
- Key definitions work best as "hybrid" or "kinetic_text".
- Use "kinetic_text" for strong, short statements (quotes, warnings, key facts).
- NEVER assign "chart" to two consecutive slides.
- NEVER assign "document_anchor" or "key_stat_breakout" to two consecutive slides.
- DIVERSIFY: Avoid using the same format for more than 2 slides in a row.
- PRIORITIZE specialized layouts when content clearly matches their trigger patterns.
- When a slide contains a prominent statistic, prefer "key_stat_breakout" over "chart".
- When quoting official sources verbatim, prefer "document_anchor" over "kinetic_text".

INPUT SLIDES:
{slides_context}

OUTPUT (JSON):
[
  {{ "id": 1, "type": "contextual_overlay", "reason": "Section introduction" }},
  {{ "id": 2, "type": "key_stat_breakout", "reason": "45% statistic is the key takeaway" }},
  {{ "id": 3, "type": "document_anchor", "reason": "Specific GDPR citation" }},
  {{ "id": 4, "type": "comparison_split", "reason": "Do vs Don't comparison" }}
]

IMPORTANT: 
- Return EXACTLY one object per slide.
- Do NOT repeat IDs.
- Ensure IDs strictly match the input slide IDs.
- Do NOT generate layout_data. Focus only on the 'type' and 'reason'.

"""

KINETIC_TEXT_PROMPT = """You are a Kinetic Typography Director for corporate e-learning videos.

TASK: Generate on-screen text moments that highlight the MOST MEMORABLE takeaways from this slide's narration.

SLIDE CONTEXT:
{content_guidance}

NARRATION:
"{narration}"

USER-EDITED ON-SCREEN TEXT (PRIORITIZE THIS):
"{visual_text}"

AVAILABLE WORDS (use these exact words as trigger_word):
{word_list}

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

# --- LOGIC EXTRACTION ---


