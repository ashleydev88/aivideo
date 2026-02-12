
"""
Chart-Specific Prompts for the Logic Extraction Service.
Contains the Router Prompt and specialized generation prompts for each archetype.
"""

# --- ROUTER PROMPT ---

ROUTER_PROMPT = """You are the Lead Visual Architect for a high-end video generation engine.
Your task is to analyze the user's text and determine the SINGLE best visualization archetype.

Analyze the structure of information in the text:
1. Is it a sequence/workflow? -> "process"
2. Is it a set of distinct items with no order? -> "grid"
3. Is it a hierarchy (parent/child)? -> "hierarchy"
4. Is it a contrast (A vs B)? -> "comparison"
5. Is it a single key number? -> "statistic"
6. Is it a timeline of events? -> "timeline"
7. Is it an abstract concept? -> "metaphor"

OUTPUT JSON ONLY:
{
    "archetype": "string (one of the valid types below)",
    "reasoning": "string (why you chose this)"
}

VALID ARCHETYPES:
- process
- cycle
- comparison
- hierarchy
- grid
- statistic
- timeline
- funnel
- pyramid
- mindmap
- code
- math
- architecture
- matrix
- metaphor
- anatomy
- document-anchor
- contextual-overlay
"""

# --- SPECIALIST PROMPTS ---

SPECIALIST_PROMPTS = {
    # --- ESSENTIAL TIER ---
    "process": """You are a Process Visualization Expert.
Extract the sequential steps from the text.
CRITICAL:
- Each node represents a STEP.
- Descriptions must be action-oriented and summarize what happens in this step.
- Edges should represent the flow (Next Step).
- Ignore statistical values or unrelated context.
- MANDATORY: Every node MUST have a 'description' field (10-15 words).
    """,
    
    "cycle": """You are a Systems Thinking Expert.
Extract the repeating loop or cycle from the text.
CRITICAL:
- Ensure the last node connects back to the first.
- Describe the relationship between stages.
- MANDATORY: Every node MUST have a 'description' field explaining the stage.
    """,

    "comparison": """You are a Comparative Analyst.
Extract distinct sides/options being compared.
CRITICAL:
- Node 1: label="Left Side Label" (e.g. "Don't"), description="Left Side Text (Negative/Incorrect)"
- Node 2: label="Right Side Label" (e.g. "Do"), description="Right Side Text (Positive/Correct)"
- Ensure balanced representation.
- MANDATORY: Both nodes MUST have a 'description' field.
    """,

    "hierarchy": """You are an Organizational Architect.
Extract the parent-child relationships.
CRITICAL:
- Identify the Root node.
- Use edges to show ownership/membership.
- MANDATORY: Every node MUST have a 'description' field explaining the role/item.
    """,

    "grid": """You are a Catalog Designer.
Extract a clean list of items.
CRITICAL:
- All items should have equal weight.
- Use icons to differentiate items.
- MANDATORY: Every node MUST have a 'description' field summarizing the item.
    """,

    "statistic": """You are a Data Visualizer.
Extract the Key Statistic.
CRITICAL:
- 'value' field is MANDATORY (e.g. "45%", "$1M").
- Label should be the metric name.
- Description should provide context.
- MANDATORY: The node MUST have a 'description' field explaining the stat.
    """,

    # --- BUSINESS TIER ---
    "timeline": """You are a Historian.
Extract chronological events.
CRITICAL:
- 'subLabel' should be the Date/Year.
- Order nodes chronologically.
- MANDATORY: Every node MUST have a 'description' field explaining the event.
    """,

    "funnel": """You are a Sales Strategist.
Extract the stages of the funnel.
CRITICAL:
- Order from Top (Broad) to Bottom (Narrow).
- MANDATORY: Every node MUST have a 'description' field explaining the stage conversion.
    """,

    # --- DEFAULT FALLBACK ---
    "default": """You are a General Logic Extractor.
Map the text to a semantic node-link structure.
Ensure every node has a clear Label and Description.
    """,

    # --- SPECIALIZED SLIDE TYPES (Visual Director) ---
    "contextual-overlay": """You are a Contextual Design Expert.
Extract the core message and a punchy 'kicker' tag.
CRITICAL:
- Node 1: label="Headline" (The main impactful statement or section title)
- Node 1: subLabel="Kicker" (Short 1-3 word uppercase tag like "KEY INSIGHT", "INTRODUCTION")
- Ignore extra details. Stick to the mood/theme.
    """,

    "document-anchor": """You are a Legal Analyst.
Extract the citation details.
CRITICAL:
- Node 1: label="Source Reference" (e.g. "GDPR Art. 5")
- Node 2: label="Verbatim Quote" (The exact text to highlight)
- Node 3: label="Context Note" (Brief explanation)
    """,

    "key-stat-breakout": """You are a Data Journalist.
Extract the SINGLE most important number.
CRITICAL:
- Node 1: value="The Number" (e.g. "45%", "$10k")
- Node 1: label="The Label" (e.g. "Revenue Growth")
- Node 1: description="Brief trend context"
    """
}
