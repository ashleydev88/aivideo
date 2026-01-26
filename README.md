# AI Video Course Generator

An AI-powered platform that automatically transforms policy documents into engaging video training courses. Users upload a policy document, and the system uses multiple AI services to generate a complete video course complete with narration, visuals, kinetic text overlays, and charts.

---

## Technology Stack

### Backend (Python/FastAPI)
The backend is built with **FastAPI** and handles all API requests, AI orchestration, and job management.

- **Framework**: FastAPI with uvicorn server
- **Database**: Supabase (PostgreSQL) for course data, user management, and storage
- **AI Services**:
  - **DeepSeek V3** (via Replicate) for content generation (topic extraction, script writing, visual planning, kinetic text)
  - **ElevenLabs** for text-to-speech narration with word-level timestamps
  - **Replicate** for AI image generation using Flux models
- **Queue System**: AWS SQS for video render job buffering
- **Storage**: Supabase Storage for audio files, images, and temporary assets

### Frontend (Next.js)
The frontend is a modern React application providing the user interface for course creation and management.

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4 with custom design system
- **UI Components**: Radix UI primitives (dialogs, dropdowns, tooltips, sliders)
- **Animations**: Framer Motion for smooth transitions
- **Authentication**: Supabase Auth with SSR support

### Video Renderer (Remotion)
The video composition engine that assembles all assets into the final video.

- **Framework**: Remotion 4 for programmatic video composition
- **Components**: Slide renderer, kinetic text overlays, chart animations, transitions
- **Deployment**: AWS Lambda for serverless rendering
- **Output**: MP4 videos stored in S3

### Lambda Consumer (AWS)
A containerized Lambda function that processes video render jobs from the SQS queue.

- **Runtime**: Docker container with Python and Node.js
- **Trigger**: AWS SQS queue events
- **Process**: Invokes Remotion Lambda via CLI and updates course status

---

## Architecture Overview

The system follows a multi-stage pipeline architecture:

```
User Upload → Topic Generation → Script Writing → Visual Planning → 
Media Generation (Audio/Images) → User Review → Final Render → Delivery
```

### Data Flow

1. **Policy Upload**: User uploads a PDF or text document
2. **Topic Extraction**: AI analyzes the document and suggests training topics
3. **User Review**: User approves or modifies topics
4. **Script Generation**: AI creates a slide-by-slide script with narration
5. **Visual Planning**: AI assigns visual types (images, charts, kinetic text) to each slide
6. **Draft Visuals**: System generates preview images and charts
7. **User Review**: User can edit slides, regenerate visuals, adjust colors
8. **Finalization**: System generates audio narration with timestamps and kinetic text
9. **Render Queue**: Job is sent to SQS for video rendering
10. **Video Render**: Lambda consumer processes the job via Remotion
11. **Delivery**: Completed video URL is saved and user is notified

---

## Deployment Guide

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Docker (for Lambda deployment)
- AWS CLI configured with appropriate permissions
- Supabase project with storage buckets configured

### Environment Variables

#### Backend (`backend/.env`)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ELEVENLABS_API_KEY=your_elevenlabs_key
REPLICATE_API_TOKEN=your_replicate_token
REMOTION_AWS_ACCESS_KEY_ID=your_aws_access_key
REMOTION_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
REMOTION_AWS_REGION=eu-west-2
```

#### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

#### Remotion Renderer (`remotion-renderer/.env`)
```
REMOTION_AWS_ACCESS_KEY_ID=your_aws_access_key
REMOTION_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
REMOTION_AWS_REGION=eu-west-2
```

### Local Development

#### Start the Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

#### Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Preview Remotion Compositions
```bash
cd remotion-renderer
npm install
npx remotion preview
```

### Production Deployment

#### Deploy Remotion to AWS Lambda
```bash
cd remotion-renderer
npm run deploy
```

This deploys the Lambda function and creates the static site bundle on S3.

#### Deploy Lambda Consumer
```bash
cd lambda-consumer
chmod +x deploy.sh
./deploy.sh YOUR_AWS_ACCOUNT_ID
```

After deployment, configure the environment variables in AWS Console and attach the SQS trigger.

#### Backend Deployment
The backend can be deployed to any Python hosting platform (Railway, Render, EC2, etc.) that supports FastAPI. Ensure all environment variables are configured and the server runs with:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

#### Frontend Deployment
Deploy the Next.js application to Vercel or any Node.js hosting platform:
```bash
cd frontend
npm run build
npm start
```

---

## User Workflow

### Creating a Course

1. **Login/Signup**: Access the dashboard and authenticate with your account
2. **New Course**: Click the "New Course" button on the dashboard
3. **Upload Policy**: Drag and drop a PDF or paste policy text
4. **Configure Settings**:
   - Select target duration (3, 5, 10, 15, or 20 minutes)
   - Choose visual style (Minimalist Vector, Photo Realistic, or Sophisticated Watercolour)
   - Select country context for localization
5. **Review Topics**: AI generates suggested topics; approve or modify as needed
6. **Review Structure**: AI generates the full slide structure with narration scripts; edit any slides, regenerate visuals, or adjust text
7. **Finalize**: Click "Finalize" to trigger audio generation and final asset preparation
8. **Export Video**: Click "Export Video" to start the render process
9. **Download**: Once complete, view and download your video from the player

### Course States

- **Generating Topics**: AI is analyzing the policy and extracting topics
- **Reviewing Topics**: Waiting for user to approve topics
- **Generating Structure**: AI is creating the full slide script
- **Reviewing Structure**: Waiting for user to review and finalize slides
- **Generating Assets**: Audio and kinetic text are being generated
- **Processing Render**: Video is being rendered on AWS Lambda
- **Completed**: Video is ready for viewing

---

## Technical Workflow

### AI Pipeline Stages

1. **Topic Generation** (`generate_topics_task`)
   - Uses DeepSeek to analyze policy and extract key training topics
   - Considers duration settings for topic count and depth

2. **Script Generation** (`generate_structure_task`)
   - Creates slide-by-slide narration scripts
   - Assigns visual types via Visual Director agent
   - Generates chart data for data visualization slides
   - Validates content accuracy against source document

3. **Draft Visual Generation** (`generate_draft_visuals`)
   - Generates preview images using Replicate Flux models
   - Creates chart configurations for Recharts/Remotion
   - Runs in parallel for efficiency

4. **Asset Finalization** (`finalize_course_assets`)
   - Generates ElevenLabs audio with word timestamps
   - Creates kinetic text events synchronized to narration
   - Uploads all assets to Supabase storage

5. **Video Rendering** (`trigger_remotion_render`)
   - Packages all slide data into Remotion props
   - Sends job to SQS queue
   - Lambda consumer executes Remotion render on AWS

### Remotion Composition Structure

The video is composed of multiple slides, each containing:
- Background image or chart visualization
- Animated kinetic text overlays
- Audio narration track
- Smooth transitions between slides

---

## Project Structure

```
aivideo/
├── backend/                    # FastAPI backend
│   ├── main.py                 # App entry point
│   ├── config.py               # Configuration and prompts
│   ├── orchestrator.py         # Lambda handler for local testing
│   ├── routers/
│   │   └── course.py           # API endpoints
│   ├── services/
│   │   ├── ai.py               # DeepSeek/Replicate integrations
│   │   ├── audio.py            # ElevenLabs integration
│   │   ├── visual.py           # Image generation
│   │   ├── storage.py          # Supabase storage operations
│   │   ├── pipeline.py         # AI agents (visual director, kinetic text)
│   │   ├── course_generator.py # Main generation orchestration
│   │   └── sqs_producer.py     # SQS job submission
│   └── utils/
│       ├── parser.py           # Document parsing
│       └── helpers.py          # Utility functions
├── frontend/                   # Next.js frontend
│   ├── app/                    # App router pages
│   │   ├── dashboard/          # Main dashboard and sub-pages
│   │   ├── login/              # Authentication
│   │   └── signup/
│   ├── components/             # React components
│   └── lib/                    # Utilities and Supabase client
├── remotion-renderer/          # Remotion video engine
│   └── src/
│       ├── Composition.tsx     # Main video composition
│       ├── Root.tsx            # Remotion entry point
│       └── components/         # Slide and overlay components
└── lambda-consumer/            # AWS Lambda for SQS processing
    ├── Dockerfile              # Container definition
    ├── handler.py              # Lambda handler
    └── deploy.sh               # Deployment script
```

---

## Additional Notes

### Visual Style Options

- **Minimalist Vector**: Clean, flat tech-style graphics with geometric shapes
- **Photo Realistic**: Cinematic stock photography aesthetic with natural lighting
- **Sophisticated Watercolour**: Hand-drawn illustration style with charcoal outlines

### Duration Configurations

The system supports predefined duration strategies that control:
- Number of topics to cover
- Slides per topic
- Depth of content coverage
- Average slide duration

Options: 1 min (dev testing), 3 min, 5 min, 10 min, 15 min, 20 min

### Error Handling

The system implements "soft failure" for render errors:
- Failed renders revert the course to "reviewing_structure" state
- Error details are logged to a separate failures table
- Users can retry the render without losing their work

### SQS Queue Architecture

Video rendering uses an SQS queue with:
- Reserved concurrency of 1 on the Lambda consumer
- Dead Letter Queue (DLQ) after 3 failed attempts
- 900-second visibility timeout to prevent duplicate processing
