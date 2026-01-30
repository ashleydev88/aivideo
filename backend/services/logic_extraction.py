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
    archetype: Literal['process', 'cycle', 'hierarchy', 'comparison', 'statistic', 'grid']
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
        You are a Logic Extraction Agent for a video visualization engine.
        Your goal is to turn the User's text into a structured "Motion Graph" for visualization.
        
        ARCHETYPES:
        - "process": Linear steps (A -> B -> C)
        - "cycle": A loop (A -> B -> C -> A)
        - "comparison": Side-by-side (Pros vs Cons, A vs B)
        - "hierarchy": Tree structure (Parent -> Children)
        - "grid": A collection of items without strict order
        
        OUTPUT FORMAT:
        Return ONLY valid JSON matching this schema:
        {
            "id": "uuid",
            "archetype": "process" | "cycle" | "comparison" | "hierarchy" | "grid",
            "metadata": { "title": "...", "description": "..." },
            "nodes": [
                {
                    "id": "short-id",
                    "type": "motion-card" | "motion-stat",
                    "data": {
                        "label": "Short Title",
                        "subLabel": "Optional subtitle",
                        "icon": "Lucide icon name (kebab-case)",
                        "variant": "neutral" | "primary" | "positive" | "negative" | "accent"
                    }
                }
            ],
            "edges": [
                { "id": "e1", "source": "n1", "target": "n2", "label": "optional vertex label" }
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
