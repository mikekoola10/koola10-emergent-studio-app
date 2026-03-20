from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from enum import Enum

# Enums
class StyleType(str, Enum):
    BOONDOCKS = "boondocks"
    CINEMATIC_4K = "4k"

class GenerationStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class AssetType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    PROMPT = "prompt"
    IMAGE = "image"

# User Models
class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserInDB(User):
    hashed_password: str

# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Episode Models
class EpisodeCreate(BaseModel):
    title: str
    season: int
    episode_number: int
    description: Optional[str] = None
    master_prompt: Optional[str] = None

class Episode(EpisodeCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    script_completion_percent: float = 0.0
    clips_generated_percent: float = 0.0
    edits_assembled_percent: float = 0.0

# Scene Models
class SceneCreate(BaseModel):
    episode_id: str
    scene_number: int
    title: str
    location: str
    time: str
    style: StyleType
    camera_notes: Optional[str] = None
    dialogue: Optional[str] = None
    magic_cues: Optional[List[str]] = []
    style_switch_cues: Optional[List[str]] = []
    ai_generation_notes: Optional[str] = None
    prompt: Optional[str] = None

class Scene(SceneCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Chat Models
class ChatMessageCreate(BaseModel):
    content: str
    role: str = "user"  # user or assistant
    episode_id: Optional[str] = None

class ChatMessage(ChatMessageCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Asset Models
class AssetCreate(BaseModel):
    episode_id: Optional[str] = None
    scene_id: Optional[str] = None
    asset_type: AssetType
    filename: str
    s3_key: str
    file_size: int
    tags: Optional[Dict[str, str]] = {}
    metadata: Optional[Dict[str, Any]] = {}

class Asset(AssetCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    url: Optional[str] = None

# Video Generation Models
class VideoGenerationRequest(BaseModel):
    episode_id: Optional[str] = None
    scene_id: Optional[str] = None
    prompt: str
    mode: str = "scene"  # "scene" or "full_episode"

class VideoGenerationJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    episode_id: Optional[str] = None
    scene_id: Optional[str] = None
    prompt: str
    mode: str
    status: GenerationStatus = GenerationStatus.QUEUED
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Production Tracking Models
class CharacterNote(BaseModel):
    character_name: str
    notes: str
    appearance_details: Optional[str] = None
    voice_notes: Optional[str] = None

class StyleRule(BaseModel):
    trigger: str
    style: StyleType
    description: str

class ProductionTracking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    episode_id: str
    character_notes: List[CharacterNote] = []
    style_rules: List[StyleRule] = []
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
