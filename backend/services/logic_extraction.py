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
        'matrix', 'metaphor', 'anatomy'
    ]
    nodes: List[MotionNode]
    edges: List[MotionEdge]
    metadata: dict = Field(default_factory=dict)

# --- Service Logic ---

class LogicExtractor:
    def __init__(self):
        self.client = None
        try:
            from openai import AsyncOpenAI
            import os
            
            api_key = os.getenv("DEEPSEEK_API_KEY")
            if api_key:
                self.client = AsyncOpenAI(
                    api_key=api_key, 
                    base_url="https://api.deepseek.com"
                )
        except ImportError:
            print("OpenAI library not found. extraction will fall back to mock.")

    async def extract_from_text(self, text: str) -> MotionGraph:
        """
        Parses raw text and returns a semantic MotionGraph using Deepseek V3.
        """
        if not self.client:
            print("No Deepseek client (check api key). Returning mock data.")
            return self._get_mock_data()

        system_prompt = """
        You are a Logic Extraction Agent for an advanced video visualization engine (X-Pilot Level).
        Your goal is to parse text and map it to the **perfect semantic visualization structure**.
        
        CRITICAL: You must choose the specific ARCHETYPE that best fits the logic of the information.
        
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
            - *NOTE*: Put the code content in the node's `description` field.
        - **"math"**: Mathematical relationships. Use for physics equations or financial formulas.
            - *NOTE*: Put the LaTeX formula in the node's `description` field.
        - **"architecture"**: System diagrams. Use for "Client-Server", "Microservices", "Data Pipelines", or IT infrastructure.
        
        ### 4. PEDAGOGICAL TIER (Deep Understanding)
        - **"matrix"**: 2x2 Quadrants. Use for "SWOT Analysis", "Risk vs Reward", or "Urgent vs Important" matrices.
        - **"metaphor"**: The "Iceberg" model. Use for "Surface vs Deep" or "Visible vs Hidden" concepts.
        - **"anatomy"**: Labeling parts. Use for explaining a diagram where specific parts need labels (e.g., "Parts of a URL", "Anatomy of a Team").
        
        ### OUTPUT FORMAT (JSON ONLY):
        {
            "id": "uuid",
            "archetype": "one of the above strings",
            "metadata": { "title": "...", "description": "..." },
            "nodes": [
                {
                    "id": "short-id",
                    "type": "motion-card" | "motion-stat",
                    "data": {
                        "label": "Title",
                        "subLabel": "Subtitle/Type",
                        "description": "Long text / Code / Latex / Matrix quadrant",
                        "icon": "Lucide icon (kebab-case)",
                        "variant": "neutral"| "primary" | "secondary" | "accent" | "positive" | "negative" | "warning"
                    }
                }
            ],
            "edges": [
                { "id": "e1", "source": "n1", "target": "n2", "label": "connection label" }
            ]
        }
        """

        try:
            response = await self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract the logic from this text:\n\n{text}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            content = response.choices[0].message.content
            import json
            data = json.loads(content)
            
            # Validate with Pydantic
            graph = MotionGraph(**data)
            # Ensure ID is unique if missing (LLM strictly follows schema but safe to ensure)
            if not graph.id: graph.id = str(uuid.uuid4())
            return graph

        except Exception as e:
            print(f"Deepseek extraction failed: {e}")
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
