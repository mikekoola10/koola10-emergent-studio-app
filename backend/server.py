from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

# Import models and services
from models import *
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from storage import s3_storage
from llm_service import llm_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="KOOLA10 Emergent Studio API")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================
# AUTHENTICATION ROUTES
# =====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = UserInDB(
        **user_data.model_dump(exclude={"password"}),
        hashed_password=hashed_password
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return User(**user.model_dump())

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user and return JWT token"""
    user = await db.users.find_one({"email": form_data.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(
        data={"sub": user['email'], "user_id": user['id']}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"email": current_user['email']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# =====================
# EPISODE ROUTES
# =====================

@api_router.post("/episodes", response_model=Episode)
async def create_episode(episode_data: EpisodeCreate, current_user: dict = Depends(get_current_user)):
    """Create a new episode"""
    episode = Episode(**episode_data.model_dump(), user_id=current_user['user_id'])
    
    doc = episode.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.episodes.insert_one(doc)
    return episode

@api_router.get("/episodes", response_model=List[Episode])
async def get_episodes(current_user: dict = Depends(get_current_user)):
    """Get all episodes for current user"""
    episodes = await db.episodes.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    
    for ep in episodes:
        if isinstance(ep.get('created_at'), str):
            ep['created_at'] = datetime.fromisoformat(ep['created_at'])
        if isinstance(ep.get('updated_at'), str):
            ep['updated_at'] = datetime.fromisoformat(ep['updated_at'])
    
    return episodes

@api_router.get("/episodes/{episode_id}", response_model=Episode)
async def get_episode(episode_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific episode"""
    episode = await db.episodes.find_one({"id": episode_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if isinstance(episode.get('created_at'), str):
        episode['created_at'] = datetime.fromisoformat(episode['created_at'])
    if isinstance(episode.get('updated_at'), str):
        episode['updated_at'] = datetime.fromisoformat(episode['updated_at'])
    
    return Episode(**episode)

@api_router.put("/episodes/{episode_id}", response_model=Episode)
async def update_episode(episode_id: str, episode_data: EpisodeCreate, current_user: dict = Depends(get_current_user)):
    """Update an episode"""
    existing = await db.episodes.find_one({"id": episode_id, "user_id": current_user['user_id']})
    if not existing:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    update_data = episode_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.episodes.update_one({"id": episode_id}, {"$set": update_data})
    
    updated = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Episode(**updated)

@api_router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an episode"""
    result = await db.episodes.delete_one({"id": episode_id, "user_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Also delete related scenes
    await db.scenes.delete_many({"episode_id": episode_id})
    
    return {"message": "Episode deleted successfully"}

# =====================
# SCENE ROUTES
# =====================

@api_router.post("/scenes", response_model=Scene)
async def create_scene(scene_data: SceneCreate, current_user: dict = Depends(get_current_user)):
    """Create a new scene"""
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": scene_data.episode_id, "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    scene = Scene(**scene_data.model_dump())
    
    doc = scene.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.scenes.insert_one(doc)
    return scene

@api_router.get("/scenes", response_model=List[Scene])
async def get_scenes(episode_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get scenes, optionally filtered by episode"""
    query = {}
    if episode_id:
        # Verify episode belongs to user
        episode = await db.episodes.find_one({"id": episode_id, "user_id": current_user['user_id']})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        query["episode_id"] = episode_id
    
    scenes = await db.scenes.find(query, {"_id": 0}).to_list(1000)
    
    for scene in scenes:
        if isinstance(scene.get('created_at'), str):
            scene['created_at'] = datetime.fromisoformat(scene['created_at'])
        if isinstance(scene.get('updated_at'), str):
            scene['updated_at'] = datetime.fromisoformat(scene['updated_at'])
    
    return scenes

@api_router.get("/scenes/{scene_id}", response_model=Scene)
async def get_scene(scene_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific scene"""
    scene = await db.scenes.find_one({"id": scene_id}, {"_id": 0})
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": scene['episode_id'], "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if isinstance(scene.get('created_at'), str):
        scene['created_at'] = datetime.fromisoformat(scene['created_at'])
    if isinstance(scene.get('updated_at'), str):
        scene['updated_at'] = datetime.fromisoformat(scene['updated_at'])
    
    return Scene(**scene)

@api_router.put("/scenes/{scene_id}", response_model=Scene)
async def update_scene(scene_id: str, scene_data: SceneCreate, current_user: dict = Depends(get_current_user)):
    """Update a scene"""
    existing = await db.scenes.find_one({"id": scene_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": scene_data.episode_id, "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    update_data = scene_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.scenes.update_one({"id": scene_id}, {"$set": update_data})
    
    updated = await db.scenes.find_one({"id": scene_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return Scene(**updated)

@api_router.delete("/scenes/{scene_id}")
async def delete_scene(scene_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a scene"""
    scene = await db.scenes.find_one({"id": scene_id})
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": scene['episode_id'], "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    await db.scenes.delete_one({"id": scene_id})
    return {"message": "Scene deleted successfully"}

# =====================
# CHAT ROUTES
# =====================

@api_router.post("/chat", response_model=ChatMessage)
async def send_chat_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a chat message and get AI response"""
    # Save user message
    user_msg = ChatMessage(**message_data.model_dump(), user_id=current_user['user_id'])
    
    doc = user_msg.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.chat_messages.insert_one(doc)
    
    # Get AI response
    session_id = message_data.episode_id if message_data.episode_id else current_user['user_id']
    ai_response_text = await llm_service.chat(message_data.content, session_id)
    
    # Save AI response
    ai_msg = ChatMessage(
        content=ai_response_text,
        role="assistant",
        episode_id=message_data.episode_id,
        user_id=current_user['user_id']
    )
    
    ai_doc = ai_msg.model_dump()
    ai_doc['created_at'] = ai_doc['created_at'].isoformat()
    
    await db.chat_messages.insert_one(ai_doc)
    
    return ai_msg

@api_router.get("/chat", response_model=List[ChatMessage])
async def get_chat_history(episode_id: Optional[str] = None, limit: int = 100, current_user: dict = Depends(get_current_user)):
    """Get chat history, optionally filtered by episode"""
    query = {"user_id": current_user['user_id']}
    if episode_id:
        query["episode_id"] = episode_id
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Show oldest first
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

@api_router.post("/chat/generate-prompt")
async def generate_master_prompt(script: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Generate a master Emergent prompt from a script"""
    prompt = await llm_service.generate_master_prompt(script)
    return {"prompt": prompt}

@api_router.post("/chat/format-script")
async def format_script(raw_text: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Format raw text into Option C script format"""
    formatted = await llm_service.format_script(raw_text)
    return {"formatted_script": formatted}

@api_router.post("/chat/breakdown-scenes")
async def breakdown_scenes(script: str = Form(...), current_user: dict = Depends(get_current_user)):
    """Break down a script into individual scenes"""
    breakdown = await llm_service.breakdown_scenes(script)
    return {"breakdown": breakdown}

# =====================
# ASSET ROUTES
# =====================

@api_router.post("/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    asset_type: AssetType = Form(...),
    episode_id: Optional[str] = Form(None),
    scene_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload an asset to S3"""
    if not s3_storage.is_configured():
        raise HTTPException(status_code=503, detail="S3 storage not configured. Please provide S3 credentials.")
    
    # Read file data
    file_data = await file.read()
    
    # Generate S3 key
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    s3_key = f"{current_user['user_id']}/{asset_type.value}/{uuid.uuid4()}.{file_extension}"
    
    # Upload to S3
    url = await s3_storage.upload_file(file_data, s3_key, file.content_type)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")
    
    # Parse tags
    tags_dict = {}
    if tags:
        for tag in tags.split(','):
            if ':' in tag:
                k, v = tag.split(':', 1)
                tags_dict[k.strip()] = v.strip()
    
    # Create asset record
    asset = Asset(
        user_id=current_user['user_id'],
        episode_id=episode_id,
        scene_id=scene_id,
        asset_type=asset_type,
        filename=file.filename,
        s3_key=s3_key,
        file_size=len(file_data),
        tags=tags_dict,
        url=url
    )
    
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.assets.insert_one(doc)
    
    return asset

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    episode_id: Optional[str] = None,
    scene_id: Optional[str] = None,
    asset_type: Optional[AssetType] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get assets with optional filters"""
    query = {"user_id": current_user['user_id']}
    if episode_id:
        query["episode_id"] = episode_id
    if scene_id:
        query["scene_id"] = scene_id
    if asset_type:
        query["asset_type"] = asset_type
    
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)
    
    for asset in assets:
        if isinstance(asset.get('created_at'), str):
            asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    
    return assets

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an asset"""
    asset = await db.assets.find_one({"id": asset_id, "user_id": current_user['user_id']})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Delete from S3
    if s3_storage.is_configured():
        await s3_storage.delete_file(asset['s3_key'])
    
    # Delete from database
    await db.assets.delete_one({"id": asset_id})
    
    return {"message": "Asset deleted successfully"}

# =====================
# VIDEO GENERATION ROUTES
# =====================

@api_router.post("/video/generate", response_model=VideoGenerationJob)
async def generate_video(request: VideoGenerationRequest, current_user: dict = Depends(get_current_user)):
    """Submit a video generation job to Emergent API"""
    # Create job record
    job = VideoGenerationJob(
        user_id=current_user['user_id'],
        episode_id=request.episode_id,
        scene_id=request.scene_id,
        prompt=request.prompt,
        mode=request.mode
    )
    
    doc = job.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.video_jobs.insert_one(doc)
    
    # TODO: Actually call Emergent Video API when user provides credentials
    # For now, just return the job in QUEUED status
    logger.warning("Emergent Video API not configured. Job created but not submitted.")
    
    return job

@api_router.get("/video/jobs", response_model=List[VideoGenerationJob])
async def get_video_jobs(episode_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get video generation jobs"""
    query = {"user_id": current_user['user_id']}
    if episode_id:
        query["episode_id"] = episode_id
    
    jobs = await db.video_jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for job in jobs:
        if isinstance(job.get('created_at'), str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
        if isinstance(job.get('updated_at'), str):
            job['updated_at'] = datetime.fromisoformat(job['updated_at'])
    
    return jobs

@api_router.get("/video/jobs/{job_id}", response_model=VideoGenerationJob)
async def get_video_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific video generation job"""
    job = await db.video_jobs.find_one({"id": job_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if isinstance(job.get('created_at'), str):
        job['created_at'] = datetime.fromisoformat(job['created_at'])
    if isinstance(job.get('updated_at'), str):
        job['updated_at'] = datetime.fromisoformat(job['updated_at'])
    
    return VideoGenerationJob(**job)

# =====================
# PRODUCTION TRACKING ROUTES
# =====================

@api_router.get("/production/{episode_id}", response_model=ProductionTracking)
async def get_production_tracking(episode_id: str, current_user: dict = Depends(get_current_user)):
    """Get production tracking for an episode"""
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": episode_id, "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    tracking = await db.production_tracking.find_one({"episode_id": episode_id}, {"_id": 0})
    
    if not tracking:
        # Create default tracking
        tracking = ProductionTracking(episode_id=episode_id)
        doc = tracking.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.production_tracking.insert_one(doc)
    else:
        if isinstance(tracking.get('updated_at'), str):
            tracking['updated_at'] = datetime.fromisoformat(tracking['updated_at'])
        tracking = ProductionTracking(**tracking)
    
    return tracking

@api_router.put("/production/{episode_id}", response_model=ProductionTracking)
async def update_production_tracking(episode_id: str, tracking_data: ProductionTracking, current_user: dict = Depends(get_current_user)):
    """Update production tracking for an episode"""
    # Verify episode belongs to user
    episode = await db.episodes.find_one({"id": episode_id, "user_id": current_user['user_id']})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    update_data = tracking_data.model_dump()
    update_data['episode_id'] = episode_id
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.production_tracking.update_one(
        {"episode_id": episode_id},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.production_tracking.find_one({"episode_id": episode_id}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return ProductionTracking(**updated)

# =====================
# HEALTH CHECK
# =====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "s3_configured": s3_storage.is_configured(),
        "llm_configured": llm_service.api_key is not None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
