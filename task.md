# Adaptive Course Planner Refactor - Task Tracker

## Goal
Refactor creation from a chat-like deterministic wizard into an adaptive course planner that recommends either:
- a single video, or
- a multi-video course (module series),
based on audience, learning objectives, topic, and source documents.

## Why
Current flow is duration-first and implies open-ended chat, while behavior is mostly fixed. We need an intuitive planning UX and data model that supports course-level orchestration and per-video execution/progress.

## Current Baseline (confirmed in code)
- Frontend wizard is chat-styled and asks duration before plan recommendation:
  - `frontend/components/CourseWizard.tsx`
- Create page uses wizard output to start a single course generation flow:
  - `frontend/app/dashboard/create/page.tsx`
- Backend intake accepts one `duration` and creates one `courses` record:
  - `backend/schemas.py` (`IntakeRequest`)
  - `backend/routers/course.py` (`POST /api/course/start-intake`)
- Dashboard/recent projects lists single `courses` rows:
  - `frontend/app/dashboard/page.tsx`
- Active generation context tracks one course id:
  - `frontend/lib/CourseGenerationContext.tsx`

## Scope
1. New planning model: course-level plan with module/video children.
2. Wizard redesign: goal/audience/objectives/docs first, then recommendation.
3. Recommendation engine: deterministic rules + rationale.
4. New multi-video overview screen (course blueprint).
5. Creation pipeline for module-by-module generation.
6. Recent projects progress at course + module level.
7. Backward compatibility for existing single-video courses.

## Non-Goals (for this refactor)
- Rebuilding rendering engine internals.
- Rewriting all legacy endpoints in one pass.
- Visual redesign of unrelated dashboard areas.

## Workstreams

### WS0 - Product + Rules Spec
- [x] Define planner inputs (audience, objectives, topic, docs, constraints).
- [x] Define recommendation outputs (`single_video` vs `multi_video`) and rationale schema.
- [x] Create initial decision table for deterministic recommendation logic.
- [ ] Define user override behavior and warnings.

### WS1 - Data Model + API Contract
- [x] Add `course_plans` (parent) model/table contract.
- [x] Add `course_modules` (child videos) model/table contract.
- [ ] Define status model:
  - [ ] Course: `planning`, `ready`, `in_progress`, `completed`, `failed`
  - [ ] Module: `not_started`, `in_progress`, `review`, `published`, `failed`
- [ ] Define migration/backfill approach from existing `courses`.
- [ ] Add API contracts for:
  - [x] `POST /planner/create`
  - [x] `PATCH /planner/{id}`
  - [x] `POST /planner/{id}/modules/{moduleId}/generate`
  - [x] `GET /planner/{id}/status`

### WS2 - Planner Engine
- [x] Implement rules-first recommendation service.
- [x] Add rationale payload (human-readable explanation).
- [x] Add trace/debug fields for support (which rule matched).
- [x] Add backend recommendation endpoint (`POST /api/course/planner/recommend`) for early integration.
- [ ] Add unit tests for recommendation scenarios:
  - [x] Leadership disciplinary training -> multi-video recommendation
  - [x] Onboarding disciplinary training -> single short video recommendation
  - [x] Document-heavy policy training -> split modules
  - [x] Narrow objective + short constraint -> single concise video

### WS3 - Wizard UX Refactor
- [ ] Replace chat framing with staged planner UI.
- [ ] Re-order steps:
  - [ ] Goal/topic
  - [ ] Audience
  - [ ] Learning outcomes
  - [ ] Documents/context
  - [x] Constraints (including duration preference)
  - [ ] Plan recommendation + rationale
- [x] Add explicit "single vs multi" recommendation card.
- [x] Add user override controls.
- [ ] Keep existing flow behind feature flag during rollout.

### WS4 - Multi-Video Blueprint + Creation Flow
- [x] Build course blueprint page with module list/timeline.
- [x] Allow module operations: reorder, split, merge, rename.
- [ ] Enable "generate next module" workflow.
- [ ] Persist shared course context across module generation.
- [ ] Ensure module output links back to parent course plan.

### WS5 - Recent Projects + Progress
- [x] Update dashboard data fetch to support parent/child projects.
- [x] Show course-level progress aggregate.
- [x] Show module-level statuses and next action.
- [ ] Update `CourseGenerationContext` to support course+module tracking.
- [ ] Keep legacy single-course items readable and actionable.

### WS6 - Migration + Rollout
- [ ] Add feature flag for adaptive planner.
- [ ] Internal rollout and dual-run comparison.
- [ ] Capture key analytics:
  - [ ] wizard completion rate
  - [ ] recommendation acceptance rate
  - [ ] time to first publish
  - [ ] restart/edit frequency after plan creation
- [ ] Gradual rollout + fallback path.

## Execution Order
1. WS0 Product + rules spec
2. WS1 Data model + API contract
3. WS2 Planner engine
4. WS3 Wizard UX refactor
5. WS4 Multi-video blueprint + generation flow
6. WS5 Recent projects + progress model
7. WS6 Migration + rollout

## Risks / Open Questions
- [ ] Should multi-video modules each create a `courses` row, or should a new table own module outputs?
- [ ] Which existing statuses can be reused vs replaced?
- [ ] How should pricing/usage count for multi-video generation?
- [ ] What is the MVP rule threshold for auto-recommending multi-video?
- [ ] Do we need hard caps (e.g., max modules) for first release?

## Definition of Done (MVP)
- [ ] Wizard no longer implies chatbot behavior.
- [ ] Planner recommends and explains single vs multi structure.
- [ ] User can review/edit full multi-video blueprint before generation.
- [ ] User can generate modules one at a time under one course umbrella.
- [ ] Dashboard shows resume/progress across entire course and modules.
- [ ] Existing single-video projects still function.

## Progress Log
- 2026-02-14: Created task tracker and aligned scope with current codebase.
- 2026-02-14: Added WS0/WS1 spec with decision rules, output schema, table/API proposals in `docs/adaptive-planner-spec.md`.
- 2026-02-14: Implemented deterministic planner engine in `backend/services/planner.py`.
- 2026-02-14: Added planner request schema + recommendation endpoint in `backend/schemas.py` and `backend/routers/course.py`.
- 2026-02-14: Added planner rule tests in `backend/tests/test_planner_rules.py` (4/4 passing).
- 2026-02-14: Added Supabase SQL migration with RLS for `course_plans` and `course_modules` in `docs/sql/adaptive_planner.sql`.
- 2026-02-14: Added planner persistence endpoints in `backend/routers/course.py` (`create`, `update`, `status`, `module generate`).
- 2026-02-14: Updated create flow to use planner APIs and auto-route multi-video plans to `frontend/app/dashboard/planner/[planId]/page.tsx`.
- 2026-02-14: Added planner recommendation UI + format override controls in `frontend/components/CourseWizard.tsx`.
- 2026-02-14: Added module rename/reorder + save flow in `frontend/app/dashboard/planner/[planId]/page.tsx` (split/merge still pending).
- 2026-02-14: Added module split/merge in planner UI and surfaced plan/module progress in dashboard recent projects.
- 2026-02-14: Moved duration to post-recommendation constraint fit-check in wizard review, with shortfall handling options.
- 2026-02-14: Next immediate step -> tighten course/module status syncing and update generation context to track active plan + active module.
