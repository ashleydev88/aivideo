Backend (FastAPI)

Run
- Install deps: `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt`
- Run dev: `uvicorn backend.main:app --reload --port 8000`

Key Files
- `backend/main.py`: App entrypoint, CORS, router mount
- `backend/routers/course.py`: Primary API endpoints
- `backend/services/`: AI orchestration (pipeline, generation, audio, storage, SQS producer)
- `backend/config.py`: Models/config (duration strategies, audience strategies, upload limits)

Selected Endpoints
- `POST /api/course/start-intake` – start a course with wizard inputs
- `GET /api/course/status/{course_id}` – check status & progress
- `POST /api/course/upload-documents` – parse uploaded files
- `POST /api/course/suggest-outcomes` – AI suggestions for learning outcomes
- `POST /api/course/finalize-course` – finalize assets then queue render
- `POST /api/course/export-video/{course_id}` – queue a render job

Notes
- Requires Supabase service role for admin DB operations.
- Uses Anthropic for LLM. Ensure `ffmpeg` installed for audio duration (MoviePy).
