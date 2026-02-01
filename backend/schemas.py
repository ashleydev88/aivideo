from pydantic import BaseModel
from typing import List, Optional

class CourseRequest(BaseModel):
    topic: str

# Legacy PlanRequest - kept for backward compatibility but deprecated
class PlanRequest(BaseModel):
    policy_text: str
    duration: int # Minutes
    country: str = "UK" # Default to UK
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
    country: str = "UK" # Default to UK
    user_id: str  # Required: User's UUID for storage paths
    accent_color: Optional[str] = None  # Optional: User-selected accent color hex (e.g., "#14b8a6")
    color_name: Optional[str] = None  # Optional: Color name for style prompt (e.g., "teal")
    course_id: Optional[str] = None # Added for Async Flow linking
    logo_url: Optional[str] = None
    logo_crop: Optional[dict] = None
    # New fields from intake
    course_purpose: Optional[str] = None
    target_audience: Optional[str] = None

class RenameCourseRequest(BaseModel):
    name: str

# --- NEW INTAKE MODELS ---

class ConversationMessage(BaseModel):
    """Single message in the intake conversation"""
    role: str  # "assistant" or "user"
    content: str
    step: Optional[str] = None  # Current wizard step when message was created
    timestamp: Optional[str] = None

class IntakeRequest(BaseModel):
    """Request to start or continue the intake conversation"""
    course_purpose: str  # onboarding, compliance_training, leadership_development, business_case, custom
    target_audience: str  # employees, line_managers, senior_leadership, executives, mixed
    has_source_documents: bool = False
    duration: int  # Minutes
    title: Optional[str] = None
    style: str = "Minimalist Vector"
    accent_color: str = "#14b8a6"
    color_name: str = "teal"
    country: str = "UK"
    logo_url: Optional[str] = None
    logo_crop: Optional[dict] = None
    conversation_history: Optional[List[ConversationMessage]] = None

class UploadLimits(BaseModel):
    """Upload constraints for document intake"""
    max_files: int = 5
    max_file_size_mb: int = 10
    max_total_size_mb: int = 25
    allowed_extensions: List[str] = [".pdf", ".docx", ".txt"]
    max_text_chars: int = 100000
