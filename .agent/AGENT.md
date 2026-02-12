Agent Guide

Context
- This repo uses Codex CLI (or similar agents) to automate coding tasks.
- Default model is set via `~/.codex/config.toml`.

How To Work
- Start interactive in repo root: `codex --full-auto`.
- Per-subproject context: use `-C backend`, `-C frontend`, or `-C remotion-renderer` for focused context.
- Approvals/sandbox: prefer workspace-write; ask before destructive actions.

Expectations
- Maintain a lightweight running log at `docs/AGENT_NOTES.md`.
- After any non-trivial change, append a dated entry with:
  - What changed and why
  - Files touched
  - Follow-ups or TODOs
- Keep changes surgical; avoid unrelated refactors.

Common Tasks
- Backend: `uvicorn backend.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`
- Renderer (local): `cd remotion-renderer && PORT=8001 npm start`
- Code review: `codex review --uncommitted` or `codex review --base main`

Guardrails
- Never commit real secrets. Use `.env.example` templates.
- Validate endpoints compile/run locally when changing FastAPI routers or Pydantic schemas.
- Coordinate changes across schema + frontend fetches (`NEXT_PUBLIC_API_URL`).

Notes Discipline
- Always update `docs/AGENT_NOTES.md` as you explore/modify the codebase.
- Prefer short, scannable entries. Link to files/paths.
