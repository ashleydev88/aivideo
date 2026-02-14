"""
Deterministic course planner for single-video vs multi-video recommendations.

This module is intentionally rules-first so decisions are explainable and testable.
"""

from __future__ import annotations

from typing import Any


LEADERSHIP_AUDIENCES = {"leadership", "managers", "people_managers"}
ONBOARDING_AUDIENCES = {"new_hires", "onboarding"}
DISCIPLINARY_KEYWORDS = {
    "disciplinary",
    "grievance",
    "investigation",
    "misconduct",
    "hearing",
}
PROCEDURAL_KEYWORDS = {
    "procedure",
    "process",
    "workflow",
    "investigation",
    "chairing",
    "escalation",
}
COMPLIANCE_KEYWORDS = {
    "compliance",
    "policy",
    "regulation",
    "legal",
    "disciplinary",
    "grievance",
    "investigation",
}
BROAD_TOPIC_KEYWORDS = {
    "framework",
    "end-to-end",
    "program",
    "governance",
    "disciplinary",
}


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _has_any(text: str, keywords: set[str]) -> bool:
    text_l = text.lower()
    return any(k in text_l for k in keywords)


def _derive_signals(payload: dict[str, Any]) -> dict[str, Any]:
    topic = _as_text(payload.get("topic"))
    additional = _as_text(payload.get("additional_context"))
    source_text = _as_text(payload.get("source_document_text"))
    objectives = payload.get("learning_objectives") or []

    objective_count = len([o for o in objectives if _as_text(o)])
    merged_text = " ".join([topic, additional, source_text]).lower()

    doc_chars = len(source_text)
    if doc_chars >= 8000:
        document_density = "heavy"
    elif doc_chars >= 1500:
        document_density = "light"
    else:
        document_density = "none"

    if _has_any(merged_text, PROCEDURAL_KEYWORDS):
        workflow_complexity = "procedural"
    elif objective_count >= 4:
        workflow_complexity = "multi_step"
    else:
        workflow_complexity = "simple"

    if _has_any(merged_text, COMPLIANCE_KEYWORDS):
        compliance_risk = "high" if objective_count >= 3 else "medium"
    else:
        compliance_risk = "low"

    if objective_count >= 4 or _has_any(merged_text, BROAD_TOPIC_KEYWORDS):
        topic_breadth = "broad"
    elif objective_count >= 2:
        topic_breadth = "moderate"
    else:
        topic_breadth = "narrow"

    audience = _as_text(payload.get("target_audience")).lower()
    if audience in LEADERSHIP_AUDIENCES:
        audience_seniority = "leadership"
    elif audience in ONBOARDING_AUDIENCES:
        audience_seniority = "entry"
    else:
        audience_seniority = "mixed"

    return {
        "objective_count": objective_count,
        "topic_breadth": topic_breadth,
        "compliance_risk": compliance_risk,
        "audience_seniority": audience_seniority,
        "document_density": document_density,
        "workflow_complexity": workflow_complexity,
    }


def _build_modules(topic: str, signals: dict[str, Any], merged_text: str) -> list[dict[str, Any]]:
    is_disciplinary = _has_any(merged_text, DISCIPLINARY_KEYWORDS)

    if is_disciplinary:
        return [
            {
                "order": 1,
                "title": "Introduction and Policy",
                "objective_focus": ["Policy principles", "Scope and responsibilities"],
                "estimated_minutes": 6,
            },
            {
                "order": 2,
                "title": "Handling Investigations",
                "objective_focus": ["Investigation process", "Evidence and documentation"],
                "estimated_minutes": 8,
            },
            {
                "order": 3,
                "title": "Chairing Meetings and Outcomes",
                "objective_focus": ["Meeting conduct", "Decision quality", "Post-meeting actions"],
                "estimated_minutes": 8,
            },
        ]

    base = topic or "Training Program"
    count = 3
    if signals["objective_count"] >= 6:
        count = 4
    if signals["document_density"] == "heavy":
        count = max(count, 4)
    modules: list[dict[str, Any]] = []
    for i in range(count):
        modules.append(
            {
                "order": i + 1,
                "title": f"{base}: Module {i + 1}",
                "objective_focus": ["Objective cluster"],
                "estimated_minutes": 6 if i == 0 else 7,
            }
        )
    return modules


def recommend_course_plan(payload: dict[str, Any]) -> dict[str, Any]:
    topic = _as_text(payload.get("topic"))
    audience = _as_text(payload.get("target_audience")).lower()
    duration_preference = payload.get("duration_preference_minutes")
    objectives = payload.get("learning_objectives") or []
    additional = _as_text(payload.get("additional_context"))
    source_text = _as_text(payload.get("source_document_text"))
    merged_text = " ".join([topic, additional, source_text]).lower()

    signals = _derive_signals(payload)
    matched_rules: list[str] = []

    # R6: leadership disciplinary -> multi with specific modules
    if audience in LEADERSHIP_AUDIENCES and _has_any(merged_text, DISCIPLINARY_KEYWORDS):
        matched_rules.append("R6")
        modules = _build_modules(topic, signals, merged_text)
        return {
            "format": "multi_video_course",
            "rationale": "Leadership disciplinary training requires staged coverage of policy, investigation, and decision forums.",
            "confidence": 0.9,
            "estimated_total_minutes": sum(m["estimated_minutes"] for m in modules),
            "modules": modules,
            "override_impacts": [
                "Compressing to one video may reduce investigation and meeting coverage.",
            ],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals},
        }

    # R7: onboarding disciplinary -> concise single
    if audience in ONBOARDING_AUDIENCES and _has_any(merged_text, DISCIPLINARY_KEYWORDS):
        matched_rules.append("R7")
        return {
            "format": "single_video",
            "rationale": "Onboarding learners need a concise orientation with escalation basics.",
            "confidence": 0.82,
            "estimated_total_minutes": 6,
            "modules": [
                {
                    "order": 1,
                    "title": topic or "Disciplinary Essentials",
                    "objective_focus": objectives[:3] if objectives else ["Core principles", "Escalation path"],
                    "estimated_minutes": 6,
                }
            ],
            "override_impacts": [
                "Expanding to multi-video can improve depth for managers but may slow onboarding completion.",
            ],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals},
        }

    # R3: high risk + many objectives -> multi
    if signals["compliance_risk"] == "high" and signals["objective_count"] >= 4:
        matched_rules.append("R3")
        modules = _build_modules(topic, signals, merged_text)
        return {
            "format": "multi_video_course",
            "rationale": "High-risk compliance content with multiple objectives benefits from modular delivery.",
            "confidence": 0.84,
            "estimated_total_minutes": sum(m["estimated_minutes"] for m in modules),
            "modules": modules,
            "override_impacts": [
                "Single-video compression may reduce procedural retention.",
            ],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals},
        }

    # R4: heavy docs + broad topic -> multi
    if signals["document_density"] == "heavy" and signals["topic_breadth"] == "broad":
        matched_rules.append("R4")
        modules = _build_modules(topic, signals, merged_text)
        return {
            "format": "multi_video_course",
            "rationale": "Document-heavy and broad scope training is clearer when split into focused modules.",
            "confidence": 0.8,
            "estimated_total_minutes": sum(m["estimated_minutes"] for m in modules),
            "modules": modules,
            "override_impacts": [
                "Single-video format risks skimming critical policy details.",
            ],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals},
        }

    # R5: short duration preference with low/medium risk -> single
    if isinstance(duration_preference, int) and duration_preference <= 8 and signals["compliance_risk"] != "high":
        matched_rules.append("R5")
        mins = max(4, duration_preference)
        return {
            "format": "single_video",
            "rationale": "Short preferred duration and limited risk profile suit a concise single video.",
            "confidence": 0.78,
            "estimated_total_minutes": mins,
            "modules": [
                {
                    "order": 1,
                    "title": topic or "Training Overview",
                    "objective_focus": objectives[:3] if objectives else ["Core outcomes"],
                    "estimated_minutes": mins,
                }
            ],
            "override_impacts": [],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals},
        }

    # Fallback scoring
    score = 0
    if signals["objective_count"] >= 4:
        score += 2
    if signals["compliance_risk"] == "high":
        score += 2
    if signals["workflow_complexity"] == "procedural":
        score += 2
    if signals["document_density"] == "heavy":
        score += 1
    if signals["audience_seniority"] == "leadership":
        score += 1

    if score >= 4:
        matched_rules.append("FALLBACK_MULTI")
        modules = _build_modules(topic, signals, merged_text)
        return {
            "format": "multi_video_course",
            "rationale": "The combined complexity and risk signals indicate modular delivery.",
            "confidence": 0.72,
            "estimated_total_minutes": sum(m["estimated_minutes"] for m in modules),
            "modules": modules,
            "override_impacts": [
                "Single-video compression may lower clarity across objective clusters.",
            ],
            "decision_trace": {"matched_rules": matched_rules, "signals": signals, "score": score},
        }

    matched_rules.append("FALLBACK_SINGLE")
    return {
        "format": "single_video",
        "rationale": "Scope and complexity fit a single cohesive video.",
        "confidence": 0.7,
        "estimated_total_minutes": 8,
        "modules": [
            {
                "order": 1,
                "title": topic or "Training Overview",
                "objective_focus": objectives[:3] if objectives else ["Core outcomes"],
                "estimated_minutes": 8,
            }
        ],
        "override_impacts": [],
        "decision_trace": {"matched_rules": matched_rules, "signals": signals, "score": score},
    }
