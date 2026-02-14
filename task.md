# Animation Timing Links Tracker

## Goal
Deliver a production-ready timing-link system where users can link visual elements to narration words, with deterministic resolution to render-ready timing and LLM fallback only when a slide has no manual links.

## Locked Rules
- Manual links always override auto links.
- Auto links are generated only if a slide has zero manual links.
- Non-chart slides support only `word` and `paragraph` timing targets.
- Chart slides support only `node` and `edge` timing targets.
- Headings default to slide start (`0ms`) and never receive auto timings.
- Heading timings can only be user-authored manual links.

## Architecture Decisions
- Store all timing state in `slide_data` (no new DB columns required in v1).
- Use a single backend timing resolver to produce final `timing_resolved` plans.
- Keep renderer consumption simple: Remotion reads only resolved timing plans.
- Enforce policy and validation in backend, not just UI.

## Phases
- [x] 1) Define canonical timing schema in `slide_data` (`manual`, `auto`, `resolved`, `meta`).
- [x] 2) Build backend resolver service for token-index-to-ms resolution.
- [x] 3) Add policy validator (target type checks, heading auto-timing ban, stale link detection).
- [x] 4) Integrate resolver into finalize flow after alignment is generated.
- [x] 5) Add auto-timing planner (LLM + deterministic guardrails) for eligible slides only.
- [x] 6) Add Timing Studio UI in slide editor:
- [x] 7) Add non-chart selection UX (`word`, `paragraph`) and transcript word linking.
- [x] 8) Add chart selection UX (`node`, `edge`) and transcript linking.
- [ ] 9) Add heading timing UX: default-at-start indicator + manual timing override.
- [ ] 10) Add per-slide status badges (`manual`, `auto`, `missing`, `stale`).
- [x] 11) Update Remotion components to consume `timing_resolved` for text, nodes, and edges.
- [ ] 12) Add telemetry, QA matrix, and rollout gating.

## Deliverables
- [x] Backend timing schema + resolver + validator.
- [x] Finalize pipeline updates with manual-first precedence and auto fallback.
- [x] Editor Timing Studio end-to-end linking experience.
- [x] Remotion timing playback parity with editor intent.
- [ ] Test coverage for precedence rules and heading policy.

## Acceptance Criteria
- [ ] Manual links are always used when present on a slide.
- [ ] No auto links are generated for slides with any manual links.
- [ ] Headings render at `0ms` by default when no manual heading timing exists.
- [ ] Auto planner never emits heading timings.
- [ ] Non-chart and chart target types are strictly enforced.
- [ ] Render output follows `timing_resolved` without divergence from saved plan.

## Progress Log
- [x] Captured product rules and architecture constraints from stakeholder decisions.
- [x] Created execution tracker for timing-link initiative.
- [x] Added backend timing engine at `backend/services/timing.py` with:
  - source target extraction (`word` / `paragraph` / `heading` / `node` / `edge`)
  - manual-vs-auto precedence
  - heading auto-timing prohibition
  - LLM auto generation with deterministic fallback
  - token-index to ms resolution
  - default heading-at-0ms behavior
- [x] Integrated timing plan generation into finalize pipeline (`backend/services/course_generator.py`) so each non-assessment slide persists `timing_links_manual`, `timing_links_auto`, `timing_resolved`, and `timing_meta`.
- [x] Added timing field normalization guards in `backend/services/slide_data.py`.
- [x] Added Remotion chart/edge timing support:
  - `timing_resolved` types in `remotion-renderer/src/types/MotionGraph.ts`
  - node delay mapping in `remotion-renderer/src/components/MotionChart.tsx`
  - edge delay mapping in `remotion-renderer/src/components/MotionBoxes/EdgeRenderer.tsx`
  - prop wiring from `remotion-renderer/src/Composition.tsx`
- [x] Validation pass:
  - `python3 -m compileall backend/services/timing.py backend/services/course_generator.py backend/services/slide_data.py` (success)
  - `cd remotion-renderer && npx tsc --noEmit` (success)
- [x] Added Timing Studio MVP controls in `frontend/components/SlideEditor/SlideEditor.tsx`:
  - timing section in sidebar with status and counts
  - visual target selection (word/paragraph/heading for non-chart, node/edge for chart)
  - narration token selection from script text
  - manual link add/remove/clear actions
  - persisted `timing_links_manual` in slide state/save flow
- [x] Added non-chart text timing playback hook in `remotion-renderer/src/components/KineticText.tsx` using `timing_resolved` entries (`word`/`paragraph`/`heading`) with start_ms-triggered animation.
- [x] Wired `timing_resolved` into KineticText calls in `remotion-renderer/src/Composition.tsx`.
- [x] Added strict timing policy enforcement during finalize:
  - non-chart slides must resolve at least one `word`/`paragraph` timing link
  - chart slides must resolve at least one `node`/`edge` timing link
  - violations fail finalize with explicit slide-level error
- [x] Upgraded Timing Studio interactions:
  - inline BubbleMenu timing icon on text selection
  - timing popover with narration token chips for link/relink
  - remove timing action from same popover
  - timing-marked text highlighting in editor via `data-timing-id`
  - sidebar timing section simplified to status + guidance + manual link audit list
- [x] Validation pass:
  - `cd frontend && npm run lint` (success with existing warnings only)
  - `cd remotion-renderer && npx tsc --noEmit` (success)
