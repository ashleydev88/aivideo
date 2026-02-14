# Slide Customization Task Tracker

## Goal
Enable smoother slide customization in preview with support for inserting slides, changing slide type (including chart types), and ensuring all edits persist in `slide_data` and are matched in final render.

## Constraints
- Do **not** change DB schema in this implementation.
- If schema changes would improve robustness, document them clearly as optional follow-up instructions.

## Plan
- [x] 1) Add backend slide normalization/validation service for `slide_data` (no schema changes).
- [x] 2) Apply normalization in finalize/render paths so saved edits and render payload are consistent.
- [x] 3) Ensure render payload signs nested assets (chart/layout image fields), not just top-level image/audio.
- [x] 4) Add editor UX to insert regular slides (not only assessment).
- [x] 5) Add editor UX to change slide type and chart archetype.
- [x] 6) Keep save/finalize persistence flow consistent with normalized slide data.
- [x] 7) Run targeted checks/tests and summarize remaining risks.

## Progress Log
- [x] Created tracker file and execution plan.
- [x] Added `backend/services/slide_data.py` with visual type normalization, chart defaults, slide normalization, and recursive asset signing helper.
- [x] Wired normalization into `POST /api/course/finalize-course` before persisting and before background finalization.
- [x] Wired normalization + recursive asset signing into render enqueue path (`trigger_remotion_render`).
- [x] Added editor controls for inserting a normal slide, changing slide visual type, and selecting chart archetype.
- [x] Added renderer-side tolerance for `contextual-overlay` alias.
- [x] Validation pass:
  - `python3 -m compileall` for updated backend files (success).
  - `cd frontend && npm run lint` (success; existing warnings only, no errors).
  - `pytest` could not run because `pytest` is not installed in this environment.
- [x] Updated sidebar toggle label to `Open Menu` / `Close Menu` to reflect expanded sidebar content.
- [x] Removed Visual Prompt section from slide editor sidebar.
- [x] Added built-in image placeholder for image-dependent slide types on insert/type-change.
