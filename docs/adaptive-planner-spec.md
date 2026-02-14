# Adaptive Course Planner Spec (WS0 + WS1)

## 1. Planner Intent
Choose the best delivery structure for the learning outcome:
- `single_video`
- `multi_video_course`

Planner decisions are based on instructional fit, not a duration-first prompt.

## 2. Inputs
Required:
- `topic`
- `target_audience` (`new_hires` | `all_employees` | `leadership`)
- `learning_objectives` (1+)

Optional:
- `source_documents` (text + file metadata)
- `additional_context`
- `duration_preference_minutes`
- `must_include_topics`
- `tone`
- `jurisdiction` (`UK` | `USA` initially)

## 3. Derived Signals
Calculated by planner:
- `objective_count` (number of distinct outcomes)
- `topic_breadth` (`narrow` | `moderate` | `broad`)
- `compliance_risk` (`low` | `medium` | `high`)
- `audience_seniority` (`entry` | `mixed` | `leadership`)
- `document_density` (`none` | `light` | `heavy`)
- `workflow_complexity` (`simple` | `multi_step` | `procedural`)

## 4. Recommendation Output
```json
{
  "format": "single_video | multi_video_course",
  "rationale": "string",
  "confidence": 0.0,
  "estimated_total_minutes": 0,
  "modules": [
    {
      "order": 1,
      "title": "Introduction and Policy",
      "objective_focus": ["..."],
      "estimated_minutes": 6,
      "depends_on_module_order": null
    }
  ],
  "override_impacts": [
    "If compressed to one video, investigation workflow coverage will be reduced."
  ],
  "decision_trace": {
    "matched_rules": ["R3", "R6"],
    "signals": {}
  }
}
```

## 5. Rules v1 (Deterministic)
Priority order: first high-confidence rule match wins; otherwise score-based fallback.

### Rule Table
| Rule | Conditions | Output |
|---|---|---|
| R1 | `audience=new_hires` AND `topic_breadth=narrow` AND `objective_count<=3` AND `compliance_risk=low` | `single_video` (4-8 min) |
| R2 | `audience=leadership` AND (`workflow_complexity=multi_step` OR `procedural`) | `multi_video_course` (3-5 modules) |
| R3 | `compliance_risk=high` AND `objective_count>=4` | `multi_video_course` |
| R4 | `document_density=heavy` AND `topic_breadth=broad` | `multi_video_course` |
| R5 | `duration_preference_minutes<=8` AND NOT (`compliance_risk=high`) | `single_video` |
| R6 | Topic includes disciplinary/investigation/grievance and audience is leadership | `multi_video_course` with policy + investigation + meeting modules |
| R7 | Topic includes disciplinary/investigation and audience is onboarding/new_hires | `single_video` summary + escalation basics |

### Fallback Scoring
- Multi-video score contributions:
  - `+2` if `objective_count >= 4`
  - `+2` if `compliance_risk=high`
  - `+2` if `workflow_complexity=procedural`
  - `+1` if `document_density=heavy`
  - `+1` if `audience=leadership`
- If score `>=4` => `multi_video_course`, else `single_video`.

## 6. Module Blueprint Heuristics
When output is `multi_video_course`, create modules from objective clusters:
1. Foundations / policy context
2. Core procedures / handling
3. Decision forums / meetings / governance
4. Edge cases + documentation standards
5. Assessment / recap (optional)

Constraints:
- Default module count: 3
- Min: 2
- Max: 6 (MVP)

## 7. Data Model Proposal

### 7.1 New Entities
1. `course_plans` (parent)
2. `course_modules` (children, one row per planned/generated module)

### 7.2 `course_plans` (proposed columns)
- `id uuid pk`
- `user_id uuid`
- `name text`
- `status text` (`planning`, `ready`, `in_progress`, `completed`, `failed`)
- `recommended_format text` (`single_video`, `multi_video_course`)
- `planner_input jsonb`
- `planner_output jsonb`
- `shared_context jsonb`
- `progress_percent int`
- `created_at timestamptz`
- `updated_at timestamptz`

### 7.3 `course_modules` (proposed columns)
- `id uuid pk`
- `course_plan_id uuid fk -> course_plans.id`
- `order_index int`
- `title text`
- `status text` (`not_started`, `in_progress`, `review`, `published`, `failed`)
- `objective_focus jsonb`
- `estimated_minutes int`
- `source_course_id uuid null` (links existing `courses` row while reusing current generation pipeline)
- `result_video_url text null`
- `metadata jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

## 8. Compatibility Strategy
MVP compatibility path:
- Keep current `courses` pipeline intact per generated module.
- `course_modules.source_course_id` points to generated `courses.id`.
- Existing pages that expect `courses` still work.
- New planner/dashboard surfaces aggregate module progress via parent `course_plans`.

## 9. API Contract Proposal (MVP)

1. `POST /api/planner/create`
- Creates `course_plans` + recommended module set in `course_modules`.

2. `PATCH /api/planner/{plan_id}`
- User edits plan/module blueprint before generation.

3. `POST /api/planner/{plan_id}/modules/{module_id}/generate`
- Starts generation for one module using shared course context.

4. `GET /api/planner/{plan_id}/status`
- Returns plan status and module statuses.

## 10. Open Decisions
- Whether to support parallel module generation in MVP (recommend: no, sequential).
- Whether module video duration limits are hard or advisory.
- Whether to expose planner confidence in UI.
