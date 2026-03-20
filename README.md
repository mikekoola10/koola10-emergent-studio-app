# KOOLA10 Emergent Studio

A comprehensive AI video production studio app for creating, managing, and generating video episodes using Emergent API.

## 🎯 Features

### 1. **Chat Workspace** (Copilot-style)
- AI-powered chat assistant using OpenAI GPT-5.2
- Paste scripts from Copilot and get instant feedback
- Quick actions: Save as Episode, Save as Scene, Generate Emergent Prompt
- Context panel showing current episode and style rules
- Persistent chat history per episode

### 2. **Script & Episode Manager**
- Create and manage episodes (S01E01, S01E02, etc.)
- Scene management with Option C format
- Versioning system
- Progress tracking (script, clips, edits)
- Export options ready for implementation

### 3. **Emergent Video Orchestrator**
- **Full Episode Mode**: Generate entire episodes from master prompts
- **Scene Mode**: Generate individual scene clips
- Job status tracking (queued, generating, completed, failed)
- Integration with Emergent Video API

### 4. **Asset Library**
- Store and manage video clips, audio, prompts, and images
- S3-compatible storage integration
- Tagging system (episode, scene, character, style)
- Search and filter capabilities
- File size tracking and metadata

### 5. **Production Dashboard**
- Episode progress tracking with visual indicators
- Character consistency notes (KOOLA10, Spiral Jay, Luna Slice, Big Brick)
- Style switch rules (Punchline → Boondocks, Reaction → 4K, etc.)
- Production notes and reminders

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn package manager

### Backend Setup

1. **Environment Configuration**
   
   The backend `.env` file is already configured with:
   ```env
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="test_database"
   CORS_ORIGINS="*"
   
   # JWT Authentication
   JWT_SECRET="koola10-super-secret-key-change-in-production"
   JWT_ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=43200
   
   # LLM Integration (Already configured)
   EMERGENT_LLM_KEY=sk-emergent-c64D6Fb08D641Af6a9
   
   # S3 Storage (User needs to provide)
   S3_ACCESS_KEY=""
   S3_SECRET_KEY=""
   S3_ENDPOINT_URL=""
   S3_BUCKET_NAME="koola10-assets"
   S3_REGION="us-east-1"
   
   # Emergent Video API (User needs to provide)
   EMERGENT_VIDEO_API_KEY=""
   EMERGENT_VIDEO_API_URL=""
   ```

2. **Dependencies**
   
   All Python dependencies are already installed:
   - FastAPI
   - Motor (MongoDB async driver)
   - emergentintegrations (OpenAI GPT-5.2 integration)
   - boto3 (S3 storage)
   - passlib, python-jose (authentication)

3. **API Endpoints**
   
   Backend is running at: `http://localhost:8001/api`
   
   **Authentication:**
   - POST `/api/auth/register` - Register new user
   - POST `/api/auth/login` - Login and get JWT token
   - GET `/api/auth/me` - Get current user info
   
   **Episodes:**
   - POST `/api/episodes` - Create episode
   - GET `/api/episodes` - List episodes
   - GET `/api/episodes/{id}` - Get episode
   - PUT `/api/episodes/{id}` - Update episode
   - DELETE `/api/episodes/{id}` - Delete episode
   
   **Scenes:**
   - POST `/api/scenes` - Create scene
   - GET `/api/scenes?episode_id={id}` - List scenes
   - GET `/api/scenes/{id}` - Get scene
   - PUT `/api/scenes/{id}` - Update scene
   - DELETE `/api/scenes/{id}` - Delete scene
   
   **Chat:**
   - POST `/api/chat` - Send message, get AI response
   - GET `/api/chat?episode_id={id}` - Get chat history
   - POST `/api/chat/generate-prompt` - Generate master prompt
   - POST `/api/chat/format-script` - Format script to Option C
   - POST `/api/chat/breakdown-scenes` - Break down script into scenes
   
   **Assets:**
   - POST `/api/assets/upload` - Upload asset to S3
   - GET `/api/assets` - List assets with filters
   - DELETE `/api/assets/{id}` - Delete asset
   
   **Video Generation:**
   - POST `/api/video/generate` - Submit video generation job
   - GET `/api/video/jobs` - List generation jobs
   - GET `/api/video/jobs/{id}` - Get job status
   
   **Production Tracking:**
   - GET `/api/production/{episode_id}` - Get production tracking
   - PUT `/api/production/{episode_id}` - Update tracking
   
   **Health:**
   - GET `/api/health` - Check system health

### Frontend Setup

Frontend is already configured and running at: `https://neon-diner-battle.preview.emergentagent.com`

The frontend includes:
- React 19 with React Router
- Tailwind CSS for styling
- Radix UI components
- Axios for API calls
- JWT authentication with protected routes

## 🔧 Configuration Required

### 1. S3 Storage Configuration

To enable asset storage, provide your S3 credentials:

**Edit `/app/backend/.env`:**
```env
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_ENDPOINT_URL="https://your-s3-endpoint.com"  # Optional for AWS S3
S3_BUCKET_NAME="koola10-assets"
S3_REGION="us-east-1"
```

**Restart backend:**
```bash
sudo supervisorctl restart backend
```

### 2. Emergent Video API Configuration

To enable video generation, provide your Emergent API credentials:

**Edit `/app/backend/.env`:**
```env
EMERGENT_VIDEO_API_KEY="your-emergent-api-key"
EMERGENT_VIDEO_API_URL="https://api.emergent.com/v1/video"  # Example URL
```

**Note:** You'll need to implement the actual Emergent API integration in `/app/backend/server.py` in the video generation endpoint once you have the API documentation.

**Restart backend:**
```bash
sudo supervisorctl restart backend
```

## 📊 Database Schema

### Collections:

1. **users** - User accounts
2. **episodes** - Episode metadata and progress
3. **scenes** - Individual scenes with prompts
4. **chat_messages** - Chat history
5. **assets** - Asset metadata and S3 keys
6. **video_jobs** - Video generation jobs
7. **production_tracking** - Character notes and style rules

## 🎨 Style Switch Logic

The app includes built-in style switch rules for KOOLA10's series:

- **Punchline** → Boondocks animation
- **Reaction** → 4K cinematic realism
- **Bell rings** → Boondocks
- **Emotional beat** → 4K
- **Magic pulse** → 4K slow-motion

## 🧪 Testing the App

### 1. Register/Login
1. Go to the app URL
2. Click "Sign up" to create an account
3. Login with your credentials

### 2. Create an Episode
1. Navigate to "Episodes"
2. Click "New Episode"
3. Fill in episode details
4. Paste your master prompt (optional)

### 3. Use Chat Workspace
1. Navigate to "Chat Workspace"
2. Paste your script or ask questions
3. Use quick actions to save as episode or generate prompts
4. AI assistant will help format scripts and provide suggestions

### 4. Generate Videos (Once Emergent API is configured)
1. Navigate to "Orchestrator"
2. Select an episode
3. Choose mode (Full Episode or Scene)
4. Click "Generate"
5. Monitor job status

### 5. Manage Assets (Once S3 is configured)
1. Navigate to "Assets"
2. Click "Upload"
3. Select file, type, and tags
4. Browse and filter assets

### 6. Track Progress
1. Navigate to "Dashboard"
2. Select an episode
3. Update progress percentages
4. Review character notes and style rules

## 🔐 Authentication

The app uses JWT (JSON Web Tokens) for authentication:
- Tokens expire after 30 days (configurable in `.env`)
- Token is stored in localStorage
- Protected routes redirect to login if not authenticated

## 🌐 API Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Working | JWT-based |
| Episode Management | ✅ Working | Full CRUD |
| Scene Management | ✅ Working | Full CRUD |
| Chat Assistant | ✅ Working | OpenAI GPT-5.2 |
| LLM Integration | ✅ Working | Using EMERGENT_LLM_KEY |
| S3 Storage | ⚠️ Needs Config | User must provide credentials |
| Emergent Video API | ⚠️ Needs Config | User must provide API details |
| Asset Upload | ⚠️ Needs S3 | Requires S3 configuration |
| Video Generation | ⚠️ Needs API | Requires Emergent API configuration |

## 📝 Next Steps

### For User:

1. **Configure S3 Storage:**
   - Get S3 credentials from your provider
   - Update `.env` file
   - Restart backend
   - Test asset upload

2. **Configure Emergent Video API:**
   - Get Emergent API key and endpoint URL
   - Update `.env` file
   - Implement API integration in `server.py` (video generation endpoint)
   - Restart backend
   - Test video generation

3. **Optional Enhancements:**
   - Add scene detail page with full editor
   - Implement export to JSON/TXT/PDF
   - Add batch video generation
   - Add webhook for video completion notifications
   - Add real-time job status updates with WebSockets

## 🏗️ Architecture

```
/app
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── models.py          # Pydantic models
│   ├── auth.py            # Authentication logic
│   ├── storage.py         # S3 storage service
│   ├── llm_service.py     # OpenAI GPT-5.2 integration
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Chat.js
│   │   │   ├── Episodes.js
│   │   │   ├── Orchestrator.js
│   │   │   ├── Assets.js
│   │   │   └── Dashboard.js
│   │   ├── components/    # Reusable components
│   │   │   ├── Sidebar.js
│   │   │   ├── Header.js
│   │   │   ├── ChatMessage.js
│   │   │   └── EpisodeCard.js
│   │   ├── context/       # React context
│   │   │   └── AuthContext.js
│   │   ├── services/      # API services
│   │   │   └── api.js
│   │   ├── App.js         # Main app with routing
│   │   └── index.js       # Entry point
│   ├── package.json       # Node dependencies
│   └── .env               # Frontend env variables
│
└── README.md              # This file
```

## 🐛 Troubleshooting

### Backend Issues

**Check backend logs:**
```bash
tail -f /var/log/supervisor/backend.*.log
```

**Restart backend:**
```bash
sudo supervisorctl restart backend
```

**Check API health:**
```bash
curl http://localhost:8001/api/health
```

### Frontend Issues

**Check frontend logs:**
```bash
tail -f /var/log/supervisor/frontend.*.log
```

**Restart frontend:**
```bash
sudo supervisorctl restart frontend
```

### Database Issues

**Check MongoDB connection:**
```bash
mongosh mongodb://localhost:27017
```

### Common Errors

1. **"S3 not configured"** - Add S3 credentials to `.env`
2. **"Emergent API not configured"** - Add Emergent API details to `.env`
3. **"Could not validate credentials"** - Token expired, login again
4. **"Episode not found"** - Make sure you have created an episode first

## 📧 Support

For issues or questions about the app, check the logs and configuration files first. Most issues are related to missing API credentials or configuration.

## 🎉 Credits

Built with:
- **FastAPI** - Modern Python web framework
- **React** - UI library
- **MongoDB** - Database
- **OpenAI GPT-5.2** - AI chat assistant via Emergent LLM Key
- **Boto3** - AWS S3 integration
- **Tailwind CSS** - Styling
- **Radix UI** - Component library

---

**KOOLA10 Emergent Studio** - Built for AI video production, powered by Emergent.
