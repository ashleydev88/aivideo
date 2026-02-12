AI Video Course Generator

Overview
- Purpose: Generate slide-based training videos from user input and/or uploaded policy documents.
- Stack: Next.js (frontend), FastAPI (backend), Remotion (renderer), AWS Lambda SQS consumer, Supabase (DB/storage/auth).
- External services: Anthropic (LLM), Replicate (image gen), ElevenLabs (TTS), AWS (Lambda/SQS/S3).

Architecture
- Frontend: Next.js app in `frontend/` with Supabase auth and a course creation wizard.
- Backend: FastAPI in `backend/` exposing course endpoints and orchestrating AI/asset generation.
- Renderer: Remotion service in `remotion-renderer/` for local rendering; production uses Remotion Lambda via the consumer.
- Lambda Consumer: `lambda-consumer/` processes SQS jobs and renders through Remotion Lambda, then updates Supabase with the final video URL.
- Data: Supabase tables (e.g., `courses`) and storage buckets (e.g., `course-assets`, `logos`).

Quick Start (Local Dev)
- Prereqs: Node 18+, npm, Python 3.10+, ffmpeg (for moviepy), AWS & Supabase credentials, API keys.
- Backend
  - Create `backend/.env` (see `backend/.env.example`).
  - Install: `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt`.
  - Run: `uvicorn backend.main:app --reload --port 8000`.
- Frontend
  - Create `frontend/.env.local` (see `frontend/.env.local.example`).
  - Install: `cd frontend && npm ci`.
  - Run: `npm run dev` (Next.js on 3000).
- Local Remotion service (optional)
  - Create `remotion-renderer/.env` (see `.env.example`).
  - Install: `cd remotion-renderer && npm ci`.
  - Run: `PORT=8001 npm start` (avoid clashing with backend 8000).

Core Flow
1) User completes intake in frontend, which calls `POST /api/course/start-intake` on backend.
2) Backend creates Supabase record, generates topics/structure/script, assigns visual types, drafts images/charts, audio, and timing.
3) For final video, backend enqueues SQS render job; Lambda consumer renders via Remotion Lambda and updates `video_url`.
4) Frontend polls course status and shows preview/download when complete.

Environment Variables
- See `docs/ENV.md` and the `.env.example` files in each subproject.
- Never commit real secrets. Example files provide placeholders only.

Key Commands
- Backend: `uvicorn backend.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`
- Remotion local: `cd remotion-renderer && PORT=8001 npm start`
- Lambda consumer (local test): run handler with an example event or deploy to AWS (see `docs/lambda-consumer.md`).

API Endpoints (selected)
- `GET /` – health check
- `POST /api/course/start-intake` – create a course from wizard input
- `GET /api/course/status/{course_id}` – check status & progress
- `POST /api/course/upload-documents` – parse uploaded docs to text
- `POST /api/course/suggest-outcomes` – AI outcomes suggestions
- `POST /api/course/finalize-course` – finalize assets then queue render
- `POST /api/course/export-video/{course_id}` – queue render directly

Development Notes
- Backend uses Anthropic for LLM tasks and Replicate for images; MoviePy is used to determine audio duration. Ensure ffmpeg is present.
- Supabase service role key is required for admin operations in backend and the consumer.
- The frontend defaults to `http://127.0.0.1:8000` as API base unless `NEXT_PUBLIC_API_URL` is set.

Troubleshooting
- Image or audio generation slow/failing: check API keys, rate limits, and network.
- Render stuck: inspect CloudWatch logs for the Lambda consumer and Remotion Lambda.
- CORS: default allows all origins; tighten for production.

Agent Guide
- See `.agent/AGENT.md` for instructions on how to use Codex/agents with this repo and where to leave running notes.
