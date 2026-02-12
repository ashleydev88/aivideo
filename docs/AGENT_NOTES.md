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

- 2026-02-12: Validation refactor to reduce context bloat and improve grounding.
  - Replaced monolithic validation with two-pass validation:
    1) `QUALITY_VALIDATION_PROMPT` for completeness/coherence/safety.
    2) claim extraction + claim groundedness against retrieved policy chunks.
  - Added prompt templates: `QUALITY_VALIDATION_PROMPT`, `CLAIM_EXTRACTION_PROMPT`, `CLAIM_GROUNDEDNESS_PROMPT`.
  - Updated `validate_script()` to retrieve top evidence chunks per claim and merge scores.
  - Files: backend/prompts.py, backend/services/pipeline.py, docs/backend.md

- 2026-02-12: Added LLM telemetry across Anthropic calls.
  - `anthropic_chat_completion()` now logs usage/latency/success into `public.llm_telemetry`.
  - Added optional telemetry context (`stage`, `agent_name`, `course_id`, `user_id`, `metadata`).
  - Tagged major call sites in topic, outline, script, validation, discovery, and logic extraction stages.
  - Added env flag `ENABLE_LLM_TELEMETRY` (default `true`).
  - Files: backend/services/ai.py, backend/services/course_generator.py, backend/services/pipeline.py, backend/services/discovery_agent.py, backend/services/logic_extraction.py, backend/config.py, docs/ENV.md, docs/backend.md
