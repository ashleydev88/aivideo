from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import uuid

# --- Data Models (Matching MotionGraph.ts) ---

class MotionNodeData(BaseModel):
    label: str = Field(..., description="Main text for the node")
    subLabel: Optional[str] = Field(None, description="Secondary text")
    description: Optional[str] = Field(None, description="Longer description")
    icon: Optional[str] = Field(None, description="Lucide icon name")
    variant: Literal['neutral', 'primary', 'secondary', 'accent', 'positive', 'negative', 'warning'] = "neutral"
    value: Optional[str] = Field(None, description="For statistic nodes")

class MotionNode(BaseModel):
    id: str
    type: Literal['motion-card', 'motion-stat']
    data: MotionNodeData
    # Position is deliberately omitted as it's handled by the layout engine

class MotionEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = True

class MotionGraph(BaseModel):
    id: str
    archetype: Literal[
        'process', 'cycle', 'hierarchy', 'comparison', 'statistic', 'grid', 
        'timeline', 'funnel', 'pyramid', 'mindmap', 
        'code', 'math', 'architecture',
        'matrix', 'metaphor', 'anatomy',
        'document-anchor', 'contextual-overlay'
    ]
    nodes: List[MotionNode]
    edges: List[MotionEdge]
    metadata: dict = Field(default_factory=dict)

# --- Service Logic ---

from backend.services.ai import replicate_chat_completion
from backend.utils.helpers import extract_json_from_response
import json
import asyncio

class LogicExtractor:
    """
    Extracts semantic logic from text and returns a MotionGraph structure.
    Uses DeepSeek V3 via Replicate (same as other AI features).
    """
    
    def __init__(self):
        pass  # No client needed, uses replicate_chat_completion

    async def extract_from_text(self, text: str) -> MotionGraph:
        """
        Parses raw text and returns a semantic MotionGraph using Deepseek V3 via Replicate.
        """
        print("   📊 Logic Extraction: Analyzing text for visualization structure...")

        system_prompt = """You are a Logic Extraction Agent for an advanced video visualization engine.
Your goal is to parse text and map it to the **perfect semantic visualization structure**.

CRITICAL: You must choose the specific ARCHETYPE that best fits the logic of the information.
CRITICAL: ALL nodes MUST have a meaningful description. Do not leave descriptions empty or use placeholders.

### 1. ESSENTIAL TIER (Basic Structure)
- **"process"**: Sequential steps where order matters (A -> B -> C). Use for recipes, workflows, or instructions.
- **"cycle"**: A repeating loop (A -> B -> C -> A). Use for feedback loops, natural cycles, or circular economies.
- **"comparison"**: Side-by-side analysis (Pros vs Cons, Before vs After). Use for contrasting two distinct entities.
- **"hierarchy"**: Standard tree chart (Parent -> Children). Use for organizational charts or folder structures.
- **"grid"**: A collection of equal items. Use for feature lists, photo galleries, or item catalogs.
- **"statistic"**: Focus on a single key number.

### 2. BUSINESS TIER (Strategic Logic)
- **"timeline"**: Chronological events. Use ONLY for history, roadmaps, or time-based sequences (Year 1, Year 2...).
- **"funnel"**: Tapering process. Use for "Sales Funnels", "Hiring Pipelines", or filtering many items down to a few.
- **"pyramid"**: Hierarchical importance. Use for "Maslow's Hierarchy", "Bloom's Taxonomy", or foundational levels (Base > Peak).
- **"mindmap"**: Radial connections. Use for brainstorming, "Key Concepts", or a central idea with non-linear branches.

### 3. TECHNICAL TIER (Data & Systems)
- **"code"**: Programming logic. Use if the text contains code snippets, SQL queries, or terminal commands.
- **"math"**: Mathematical relationships. Use for physics equations or financial formulas.
- **"architecture"**: System diagrams. Use for "Client-Server", "Microservices", "Data Pipelines", or IT infrastructure.

### 4. PEDAGOGICAL TIER (Deep Understanding)
- **"matrix"**: 2x2 Quadrants. Use for "SWOT Analysis", "Risk vs Reward", or "Urgent vs Important" matrices.
- **"metaphor"**: The "Iceberg" model. Use for "Surface vs Deep" or "Visible vs Hidden" concepts.
- **"anatomy"**: Labeling parts. Use for explaining a diagram where specific parts need labels.

### 5. DOCUMENT & CONTEXT TIER
- **"document-anchor"**: Key quotes or citations. Use for highlighting specific text excerpts, regulations, or "Key Takeways" from a document.
- **"contextual-overlay"**: Text overlaid on visual context. Use when describing a scene, a physical location, or when the text needs a visual backdrop to make sense.

### OUTPUT FORMAT (JSON ONLY):
{
    "id": "unique-id",
    "archetype": "one of the above strings",
    "metadata": { "title": "Short descriptive title", "description": "Brief description" },
    "nodes": [
        {
            "id": "n1",
            "type": "motion-card",
            "data": {
                "label": "Title",
                "subLabel": "Subtitle/Type (optional)",
                "description": "Detailed explanation of this step (MANDATORY - do not leave empty). Extract from context.",
                "icon": "lucide-icon-name-kebab-case",
                "variant": "neutral"
            }
        }
    ],
    "edges": [
        { "id": "e1", "source": "n1", "target": "n2", "label": "connection label (optional)" }
    ]
}

VARIANT OPTIONS: "neutral", "primary", "secondary", "accent", "positive", "negative", "warning"
ICON EXAMPLES: "shield", "alert-triangle", "check-circle", "users", "file-text", "lock", "clock"
"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract the logic from this text and return a JSON MotionGraph:\n\n{text}"}
            ]
            
            # Use the existing replicate_chat_completion (runs sync, so wrap in thread)
            result = await asyncio.to_thread(
                replicate_chat_completion,
                messages=messages,
                max_tokens=4000,
                temperature=0.3
            )
            
            # Parse JSON from response
            data = extract_json_from_response(result)
            
            # Validate with Pydantic
            graph = MotionGraph(**data)
            
            # Ensure ID is unique
            if not graph.id:
                graph.id = str(uuid.uuid4())
            
            print(f"   ✅ Logic Extraction: archetype='{graph.archetype}', {len(graph.nodes)} nodes")
            return graph

        except Exception as e:
            print(f"   ⚠️ Logic Extraction failed: {e}")
            return self._get_mock_data()

    def _get_mock_data(self) -> MotionGraph:
        return MotionGraph(
            id=str(uuid.uuid4()),
            archetype="process",
            metadata={"title": "Mock Process (No API Key)", "description": "Deepseek setup incomplete"},
            nodes=[
                MotionNode(
                    id="step-1", 
                    type="motion-card", 
                    data=MotionNodeData(label="Input", icon="file-input", variant="secondary")
                ),
                MotionNode(
                    id="step-2", 
                    type="motion-card", 
                    data=MotionNodeData(label="Processing", icon="cpu", variant="primary")
                ),
                MotionNode(
                    id="step-3", 
                    type="motion-card", 
                    data=MotionNodeData(label="Output", icon="file-output", variant="positive")
                )
            ],
            edges=[
                MotionEdge(id="e1", source="step-1", target="step-2", label="feeds"),
                MotionEdge(id="e2", source="step-2", target="step-3", label="produces")
            ]
        )

# Singleton instance
logic_extractor = LogicExtractor()
