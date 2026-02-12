# Agent Notes (Living Log)

- 2026-02-12: Initialized standard documentation and agent guide. Added README, ENV, per-component docs, and .env examples.
  - Files: README.md, docs/*.md, .agent/AGENT.md
  - Next: Confirm local run instructions on a fresh machine; add API examples per endpoint if useful.

- 2026-02-12: Fixes for final render issues.
  - Render MotionGraph charts using MotionChart in Composition.
  - Sign logo assets from the correct Supabase bucket (logos) in backend storage helper.
  - Files: remotion-renderer/src/Composition.tsx, backend/services/storage.py
