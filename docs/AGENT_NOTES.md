# Agent Notes (Living Log)

- 2026-02-12: Initialized standard documentation and agent guide. Added README, ENV, per-component docs, and .env examples.
  - Files: README.md, docs/*.md, .agent/AGENT.md
  - Next: Confirm local run instructions on a fresh machine; add API examples per endpoint if useful.

- 2026-02-12: Fixes for final render issues.
  - Render MotionGraph charts using MotionChart in Composition.
  - Sign logo assets from the correct Supabase bucket (logos) in backend storage helper.
  - Files: remotion-renderer/src/Composition.tsx, backend/services/storage.py

- 2026-02-12: Prompt contract update for script generation.
  - Removed `visual_archetype` requirement/output from `SCRIPT_GENERATOR_PROMPT`.
  - Clarified that visual type assignment is owned by the Visual Director stage after script generation.
  - Files: backend/prompts.py, docs/backend.md

- 2026-02-12: Outline contract aligned with Visual Director ownership.
  - Removed `visual_archetype` field from `OUTLINE_GENERATOR_PROMPT` task/output examples.
  - Knowledge Check rule now specifies title/concept only (no outline-level visual type requirement).
  - Files: backend/prompts.py

- 2026-02-21: Removed script validation from generation flow and deleted validation prompts/helpers.
  - Script generation now proceeds directly to visual assignment.
  - Removed `validate_script()` and related prompt/config constants.
  - Files: backend/services/course_generator.py, backend/services/pipeline.py, backend/prompts.py, backend/config.py, frontend/app/dashboard/create/page.tsx, frontend/lib/CourseGenerationContext.tsx

- 2026-02-12: Added LLM telemetry across Anthropic calls.
  - `anthropic_chat_completion()` now logs usage/latency/success into `public.llm_telemetry`.
  - Added optional telemetry context (`stage`, `agent_name`, `course_id`, `user_id`, `metadata`).
  - Tagged major call sites in topic, outline, script, discovery, and logic extraction stages.
  - Added env flag `ENABLE_LLM_TELEMETRY` (default `true`).
  - Files: backend/services/ai.py, backend/services/course_generator.py, backend/services/pipeline.py, backend/services/discovery_agent.py, backend/services/logic_extraction.py, backend/config.py, docs/ENV.md, docs/backend.md
