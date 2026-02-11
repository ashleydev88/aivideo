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

from backend.services.ai import anthropic_chat_completion
from backend.chart_prompts import ROUTER_PROMPT, SPECIALIST_PROMPTS
from backend.utils.helpers import extract_json_from_response
import json
import asyncio

class LogicExtractor:
    """
    Extracts semantic logic from text and returns a MotionGraph structure.
    Uses the AI pipeline via Replicate (same as other AI features).
    """
    
    def __init__(self):
        pass  # No client needed, uses anthropic_chat_completion


    async def extract_from_text(self, text: str) -> MotionGraph:
        """
        Parses raw text and returns a semantic MotionGraph using a 2-step AI pipeline:
        1. Router: Determines the best archetype.
        2. Specialist: Generates the graph structure based on that archetype.
        """
        print("   📊 Logic Extraction: Step 1 - Routing...")

        try:
            # --- STEP 1: ROUTING ---
            router_messages = [
                {"role": "system", "content": ROUTER_PROMPT},
                {"role": "user", "content": f"Analyze this text:\n\n{text}"}
            ]
            
            router_response = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=router_messages,
                max_tokens=1000,
                temperature=0.1 # Low temp for precise classification
            )
            
            router_data = extract_json_from_response(router_response)
            archetype = router_data.get("archetype", "process")
            reasoning = router_data.get("reasoning", "No valid reason provided")
            
            print(f"      👉 Selected Archetype: '{archetype}'")
            print(f"      🧠 Reasoning: {reasoning}")

            # --- STEP 2: GENERATION ---
            print(f"   📊 Logic Extraction: Step 2 - Generation ({archetype})...")
            
            # Select the specialist driver or fallback to default
            specialist_instruction = SPECIALIST_PROMPTS.get(archetype, SPECIALIST_PROMPTS["default"])
            
            # Construct the generation prompt
            generation_system_prompt = f"""{specialist_instruction}

OUTPUT FORMAT (JSON ONLY):
{{
    "id": "unique-id",
    "archetype": "{archetype}",
    "metadata": {{ "title": "Title", "description": "Brief description" }},
    "nodes": [ {{ "id": "n1", "type": "motion-card", "data": {{ "label": "...", "description": "..." }} }} ],
    "edges": [ {{ "id": "e1", "source": "n1", "target": "n2" }} ]
}}
"""
            
            gen_messages = [
                {"role": "system", "content": generation_system_prompt},
                {"role": "user", "content": f"Generate the {archetype} chart for:\n\n{text}"}
            ]

            result = await asyncio.to_thread(
                anthropic_chat_completion,
                messages=gen_messages,
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
            
            # FALLBACK: Ensure all nodes have descriptions
            for node in graph.nodes:
                if not node.data.description or node.data.description.strip() == "":
                    # print(f"   ⚠️ Node {node.id} missing description. Auto-filling with label.")
                    node.data.description = node.data.label

            print(f"   ✅ Logic Extraction Complete: {len(graph.nodes)} nodes")
            return graph

        except Exception as e:
            print(f"   ⚠️ Logic Extraction failed: {e}")
            return self._get_mock_data()

    def _get_mock_data(self) -> MotionGraph:
        return MotionGraph(
            id=str(uuid.uuid4()),
            archetype="process",
            metadata={"title": "Mock Process (No API Key)", "description": "AI pipeline setup incomplete"},
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
