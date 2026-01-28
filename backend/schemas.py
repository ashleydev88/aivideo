from pydantic import BaseModel
from typing import List, Optional

class CourseRequest(BaseModel):
    topic: str

class PlanRequest(BaseModel):
    policy_text: str
    duration: int # Minutes
    country: str = "USA" # Default to USA
    style: str = "Minimalist Vector" 
    accent_color: str = "#14b8a6" 
    color_name: str = "teal"
    title: Optional[str] = None
    logo_url: Optional[str] = None
    logo_crop: Optional[dict] = None

class Topic(BaseModel):
    id: int
    title: str
    purpose: str
    key_points: List[str]
    complexity: str = "moderate" # Default
    estimated_slides: int = 3 # Default
    depth_notes: str = "" # Default

class ScriptRequest(BaseModel):
    topics: List[Topic]
    style: str
    duration: int # Minutes
    title: str = "Untitled Course"
    policy_text: str # Added for context
    learning_objective: str # Added for context
    country: str = "USA" # Default to USA
    user_id: str  # Required: User's UUID for storage paths
    accent_color: Optional[str] = None  # Optional: User-selected accent color hex (e.g., "#14b8a6")
    color_name: Optional[str] = None  # Optional: Color name for style prompt (e.g., "teal")
    course_id: Optional[str] = None # Added for Async Flow linking
    logo_url: Optional[str] = None
    logo_crop: Optional[dict] = None
