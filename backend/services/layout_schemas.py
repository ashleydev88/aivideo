"""
Layout-specific data schemas for the new slide layout types.

These Pydantic models define the data payloads required for each of the
four new layout types: contextual_overlay, comparison_split, document_anchor,
and key_stat_breakout.
"""
from pydantic import BaseModel
from typing import Optional, Literal


class ContextualOverlayData(BaseModel):
    """
    Data for full-screen AI-generated background image with a 
    semi-transparent "glassmorphism" text container overlaying it.
    
    Best for: Introductions, section headers, or general concept definitions
    where the environment/context matters.
    """
    background_prompt: str  # AI image generation prompt for background
    headline: str  # Main text overlay (large, prominent)
    subheadline: Optional[str] = None  # Optional smaller text below


class ComparisonSplitData(BaseModel):
    """
    Data for a vertical split-screen layout.
    Left side = negative/incorrect action (red tint/styling)
    Right side = positive/correct action (green tint/styling)
    
    Best for: "Dos and Don'ts", safety binary choices, or 
    compliant vs. non-compliant examples.
    """
    left_label: str  # e.g., "Don't", "Incorrect", "Non-Compliant"
    left_text: str  # Description of the negative action
    left_prompt: Optional[str] = None  # Optional visual prompt for left side
    right_label: str  # e.g., "Do", "Correct", "Compliant"
    right_text: str  # Description of the positive action
    right_prompt: Optional[str] = None  # Optional visual prompt for right side


class DocumentAnchorData(BaseModel):
    """
    Data for a visual representation of a document page with a specific
    paragraph or clause "pulled out," magnified, and highlighted.
    
    Best for: Building authority by showing the viewer exactly where 
    a rule comes from (e.g., quoting a specific legal clause or GDPR article).
    """
    source_reference: str  # e.g., "GDPR Article 7, Section 3", "Employee Handbook, p.12"
    verbatim_quote: str  # The exact text to be highlighted (from the source)
    context_note: Optional[str] = None  # Optional explanation or context


class KeyStatBreakoutData(BaseModel):
    """
    Data for a typographic layout where a specific number or percentage 
    is rendered extremely large (~50-60% of the screen) with a smaller
    context label below it.
    
    Best for: Emphasizing statistics, monetary figures, or success rates.
    """
    stat_value: str  # The core value, e.g., "45%", "$2.5M", "3x"
    stat_label: str  # Context label, e.g., "reduction in errors", "annual savings"
    trend: Optional[Literal["up", "down", "neutral"]] = None  # Optional trend indicator


# Type alias for all layout data types
LayoutData = (
    ContextualOverlayData | 
    ComparisonSplitData | 
    DocumentAnchorData | 
    KeyStatBreakoutData
)

# Layout type string literals for type checking
LayoutType = Literal[
    # Existing types
    "hybrid",
    "image", 
    "chart",
    "kinetic_text",
    "title_card",
    # New types
    "contextual_overlay",
    "comparison_split",
    "document_anchor",
    "key_stat_breakout"
]
