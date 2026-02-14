from __future__ import annotations

import math
import re
import uuid
from dataclasses import dataclass
from typing import Any

from backend.config import KINETIC_GENERATOR_MODEL
from backend.services.ai import anthropic_chat_completion
from backend.utils.helpers import extract_json_from_response, parse_alignment_to_words


NON_CHART_SOURCE_TYPES = {"word", "paragraph", "heading"}
CHART_SOURCE_TYPES = {"node", "edge"}
NODE_TIMING_VISUAL_TYPES = {"chart", "comparison_split"}


@dataclass
class NarrationToken:
    index: int
    word: str
    start_ms: int
    end_ms: int


def _clean_text(value: str) -> str:
    no_tags = re.sub(r"<[^>]+>", " ", value or "")
    no_space = re.sub(r"\s+", " ", no_tags).strip()
    return no_space


def _strip_html_fragment(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment or "")
    return re.sub(r"\s+", " ", text).strip()


def _extract_non_chart_targets(slide: dict[str, Any]) -> list[dict[str, str]]:
    visual_text = str(slide.get("visual_text") or "")
    text_fallback = str(slide.get("text") or "")

    raw = visual_text or text_fallback
    if not raw:
        return []

    targets: list[dict[str, str]] = []
    has_html = bool(re.search(r"<[a-zA-Z][^>]*>", raw))

    if has_html:
        timing_span_matches = re.findall(
            r'<([^>]*)data-timing-id=["\']([^"\']+)["\']([^>]*)>(.*?)</[^>]+>',
            raw,
            flags=re.IGNORECASE | re.DOTALL,
        )
        for pre_attrs, timing_id, post_attrs, fragment in timing_span_matches:
            text = _strip_html_fragment(fragment)
            if not text:
                continue
            attrs = f"{pre_attrs} {post_attrs}"
            m = re.search(r'data-timing-type=["\']([^"\']+)["\']', attrs, flags=re.IGNORECASE)
            timing_type = str((m.group(1) if m else "") or "")
            if timing_type not in NON_CHART_SOURCE_TYPES:
                timing_type = "paragraph" if len(text.split()) > 1 else "word"
            targets.append({"type": timing_type, "id": str(timing_id), "text": text})

        heading_matches = re.findall(r"<h[1-6][^>]*>(.*?)</h[1-6]>", raw, flags=re.IGNORECASE | re.DOTALL)
        for idx, fragment in enumerate(heading_matches):
            text = _strip_html_fragment(fragment)
            if text:
                target_id = f"heading-{idx}"
                targets.append({"type": "heading", "id": target_id, "text": text})

        paragraph_matches = re.findall(r"<(p|li)[^>]*>(.*?)</(p|li)>", raw, flags=re.IGNORECASE | re.DOTALL)
        paragraph_index = 0
        for _, fragment, _ in paragraph_matches:
            text = _strip_html_fragment(fragment)
            if not text:
                continue
            para_id = f"paragraph-{paragraph_index}"
            paragraph_index += 1
            targets.append({"type": "paragraph", "id": para_id, "text": text})

            words = [w for w in re.split(r"\s+", text) if w]
            for word_idx, word in enumerate(words):
                word_id = f"word-{para_id}-{word_idx}"
                targets.append({"type": "word", "id": word_id, "text": word})
    else:
        text = _clean_text(raw)
        if text:
            para_id = "paragraph-0"
            targets.append({"type": "paragraph", "id": para_id, "text": text})
            words = [w for w in re.split(r"\s+", text) if w]
            for word_idx, word in enumerate(words):
                word_id = f"word-{para_id}-{word_idx}"
                targets.append({"type": "word", "id": word_id, "text": word})

    # Ensure there is always at least one paragraph target if any readable text exists.
    if not any(t["type"] == "paragraph" for t in targets):
        fallback_text = _clean_text(raw)
        if fallback_text:
            targets.append({"type": "paragraph", "id": "paragraph-0", "text": fallback_text})

    return targets


def _extract_chart_targets(slide: dict[str, Any]) -> list[dict[str, str]]:
    visual_type = str(slide.get("visual_type") or "")
    if visual_type == "comparison_split":
        layout_data = slide.get("layout_data") if isinstance(slide.get("layout_data"), dict) else {}
        left_label = str(layout_data.get("left_label") or "Option A")
        right_label = str(layout_data.get("right_label") or "Option B")
        return [
            {"type": "node", "id": "node-left", "text": left_label},
            {"type": "node", "id": "node-right", "text": right_label},
        ]

    chart = slide.get("chart_data")
    if not isinstance(chart, dict):
        return []

    targets: list[dict[str, str]] = []
    nodes = chart.get("nodes") if isinstance(chart.get("nodes"), list) else []
    edges = chart.get("edges") if isinstance(chart.get("edges"), list) else []

    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        node_id = str(node.get("id") or f"node-{idx}")
        data = node.get("data") if isinstance(node.get("data"), dict) else {}
        node_label = str(data.get("label") or node_id)
        targets.append({"type": "node", "id": node_id, "text": node_label})

    for idx, edge in enumerate(edges):
        if not isinstance(edge, dict):
            continue
        edge_id = str(edge.get("id") or f"edge-{idx}")
        source = str(edge.get("source") or "")
        target = str(edge.get("target") or "")
        label = str(edge.get("label") or f"{source}->{target}".strip("->") or edge_id)
        targets.append({"type": "edge", "id": edge_id, "text": label})

    return targets


def extract_slide_targets(slide: dict[str, Any]) -> list[dict[str, str]]:
    visual_type = str(slide.get("visual_type") or "")
    if visual_type in NODE_TIMING_VISUAL_TYPES:
        return _extract_chart_targets(slide)
    return _extract_non_chart_targets(slide)


def _allowed_source_types(slide: dict[str, Any]) -> set[str]:
    visual_type = str(slide.get("visual_type") or "")
    if visual_type in NODE_TIMING_VISUAL_TYPES:
        return CHART_SOURCE_TYPES
    return NON_CHART_SOURCE_TYPES


def _extract_token_index(link: dict[str, Any]) -> int | None:
    target = link.get("target")
    if not isinstance(target, dict):
        return None
    idx = target.get("token_index")
    try:
        return int(idx)
    except Exception:
        return None


def _extract_source(link: dict[str, Any]) -> tuple[str, str]:
    source = link.get("source")
    if not isinstance(source, dict):
        return "", ""
    source_type = str(source.get("type") or "")
    source_id = str(source.get("id") or "")
    return source_type, source_id


def _validate_links(
    *,
    slide: dict[str, Any],
    links: list[dict[str, Any]],
    tokens: list[NarrationToken],
    source_inventory: dict[str, dict[str, str]],
    is_auto: bool,
) -> tuple[list[dict[str, Any]], list[str]]:
    allowed_types = _allowed_source_types(slide)
    errors: list[str] = []
    valid: list[dict[str, Any]] = []

    for link in links:
        if not isinstance(link, dict):
            errors.append("Link is not an object")
            continue

        source_type, source_id = _extract_source(link)
        token_index = _extract_token_index(link)

        if source_type not in allowed_types:
            errors.append(f"Invalid source type '{source_type}' for slide visual_type")
            continue
        if not source_id:
            errors.append("Missing source.id")
            continue
        if source_id not in source_inventory:
            errors.append(f"Unknown source id '{source_id}'")
            continue
        if token_index is None or token_index < 0 or token_index >= len(tokens):
            errors.append(f"Invalid token index '{token_index}'")
            continue
        if is_auto and source_type == "heading":
            errors.append("Auto timings for headings are not allowed")
            continue

        valid.append(link)

    return valid, errors


def _build_resolved_entries(
    *,
    links: list[dict[str, Any]],
    tokens: list[NarrationToken],
    source_inventory: dict[str, dict[str, str]],
    origin: str,
) -> list[dict[str, Any]]:
    resolved: list[dict[str, Any]] = []
    for link in links:
        source_type, source_id = _extract_source(link)
        token_index = _extract_token_index(link)
        if token_index is None:
            continue
        token = tokens[token_index]
        source = source_inventory.get(source_id, {})
        animation = link.get("animation") if isinstance(link.get("animation"), dict) else {}
        resolved.append(
            {
                "id": str(link.get("id") or uuid.uuid4()),
                "origin": origin,
                "source_type": source_type,
                "source_id": source_id,
                "source_text": str(source.get("text") or ""),
                "token_index": token_index,
                "token_word": token.word,
                "start_ms": token.start_ms,
                "end_ms": token.end_ms,
                "animation": {
                    "preset": str(animation.get("preset") or "appear"),
                    "duration_ms": int(animation.get("duration_ms") or 450),
                },
            }
        )
    resolved.sort(key=lambda item: (item.get("start_ms", 0), item.get("source_id", "")))
    return resolved


def _append_default_heading_entries(
    *,
    resolved: list[dict[str, Any]],
    source_inventory: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    linked_heading_ids = {
        str(item.get("source_id"))
        for item in resolved
        if str(item.get("source_type")) == "heading"
    }
    heading_entries: list[dict[str, Any]] = []
    for source_id, source in source_inventory.items():
        if source.get("type") != "heading":
            continue
        if source_id in linked_heading_ids:
            continue
        heading_entries.append(
            {
                "id": f"default-{source_id}",
                "origin": "default",
                "source_type": "heading",
                "source_id": source_id,
                "source_text": str(source.get("text") or ""),
                "token_index": None,
                "token_word": "",
                "start_ms": 0,
                "end_ms": 0,
                "animation": {"preset": "appear", "duration_ms": 0},
            }
        )
    if not heading_entries:
        return resolved
    merged = list(resolved) + heading_entries
    merged.sort(key=lambda item: (item.get("start_ms", 0), item.get("source_id", "")))
    return merged


def _heuristic_auto_links(
    *,
    slide: dict[str, Any],
    targets: list[dict[str, str]],
    tokens: list[NarrationToken],
) -> list[dict[str, Any]]:
    if not tokens or not targets:
        return []

    visual_type = str(slide.get("visual_type") or "")
    if visual_type in NODE_TIMING_VISUAL_TYPES:
        eligible = [t for t in targets if t["type"] in CHART_SOURCE_TYPES]
    else:
        eligible = [t for t in targets if t["type"] in {"paragraph", "word"}]
        paragraphs = [t for t in eligible if t["type"] == "paragraph"]
        eligible = paragraphs if paragraphs else eligible[:6]

    if not eligible:
        return []

    links: list[dict[str, Any]] = []
    stride = max(1, math.floor(len(tokens) / max(1, len(eligible))))
    for idx, target in enumerate(eligible):
        token_index = min(len(tokens) - 1, idx * stride)
        links.append(
            {
                "id": str(uuid.uuid4()),
                "source": {"type": target["type"], "id": target["id"]},
                "target": {"token_index": token_index},
                "animation": {"preset": "appear", "duration_ms": 450},
                "origin": "auto_heuristic",
            }
        )
    return links


def _llm_auto_links(
    *,
    slide: dict[str, Any],
    targets: list[dict[str, str]],
    tokens: list[NarrationToken],
    course_id: str | None,
    user_id: str | None,
) -> list[dict[str, Any]]:
    if not targets or not tokens:
        return []

    visual_type = str(slide.get("visual_type") or "")
    non_heading_targets = [t for t in targets if t["type"] != "heading"]
    target_payload = [
        {"id": t["id"], "type": t["type"], "text": t.get("text", "")[:180]}
        for t in non_heading_targets
    ]
    token_payload = [{"index": t.index, "word": t.word} for t in tokens[:140]]

    prompt = f"""
You are an animation timing planner.
Return strict JSON only.

Rules:
- For visual_type in [chart, comparison_split], only source_type node or edge.
- For other visual types, only source_type paragraph or word.
- Never return heading links.
- Choose token_index from provided narration tokens.
- Keep links concise and meaningful.

Slide visual_type: {visual_type}
Narration text: {str(slide.get("text") or "")}

Visual targets:
{target_payload}

Narration tokens:
{token_payload}

Output JSON format:
{{
  "links": [
    {{
      "source_id": "paragraph-0",
      "source_type": "paragraph",
      "token_index": 5,
      "animation_preset": "appear"
    }}
  ]
}}
"""
    try:
        raw = anthropic_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=900,
            temperature=0.2,
            model=KINETIC_GENERATOR_MODEL,
            telemetry={
                "course_id": course_id,
                "user_id": user_id,
                "stage": "timing_auto_generation",
                "agent_name": "timing_planner",
                "metadata": {"visual_type": visual_type, "targets": len(target_payload)},
            },
        )
        data = extract_json_from_response(raw)
        llm_links = data.get("links", []) if isinstance(data, dict) else []
        links: list[dict[str, Any]] = []
        for link in llm_links:
            if not isinstance(link, dict):
                continue
            links.append(
                {
                    "id": str(uuid.uuid4()),
                    "source": {
                        "type": str(link.get("source_type") or ""),
                        "id": str(link.get("source_id") or ""),
                    },
                    "target": {"token_index": link.get("token_index")},
                    "animation": {
                        "preset": str(link.get("animation_preset") or "appear"),
                        "duration_ms": 450,
                    },
                    "origin": "auto_llm",
                }
            )
        return links
    except Exception as e:
        print(f"   ⚠️ Timing LLM planner failed: {e}")
        return []


def build_slide_timing_plan(
    *,
    slide: dict[str, Any],
    alignment: dict[str, Any] | None,
    course_id: str | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    word_items = parse_alignment_to_words(alignment or {})
    tokens = [
        NarrationToken(
            index=i,
            word=str(item.get("word") or ""),
            start_ms=int(item.get("start_ms") or 0),
            end_ms=int(item.get("end_ms") or 0),
        )
        for i, item in enumerate(word_items)
    ]

    targets = extract_slide_targets(slide)
    source_inventory = {t["id"]: t for t in targets}

    manual_links = slide.get("timing_links_manual") if isinstance(slide.get("timing_links_manual"), list) else []
    has_manual = len(manual_links) > 0

    auto_links_existing = slide.get("timing_links_auto") if isinstance(slide.get("timing_links_auto"), list) else []
    auto_links_generated: list[dict[str, Any]] = []
    validation_errors: list[str] = []

    if not has_manual:
        auto_links_generated = _llm_auto_links(
            slide=slide,
            targets=targets,
            tokens=tokens,
            course_id=course_id,
            user_id=user_id,
        )
        if not auto_links_generated:
            auto_links_generated = _heuristic_auto_links(slide=slide, targets=targets, tokens=tokens)
        # Prefer freshly generated links over previously persisted auto links.
        auto_links_existing = auto_links_generated

    active_links = manual_links if has_manual else auto_links_existing
    valid_links, errors = _validate_links(
        slide=slide,
        links=active_links,
        tokens=tokens,
        source_inventory=source_inventory,
        is_auto=not has_manual,
    )
    validation_errors.extend(errors)

    origin = "manual" if has_manual else "auto"
    resolved = _build_resolved_entries(
        links=valid_links,
        tokens=tokens,
        source_inventory=source_inventory,
        origin=origin,
    )
    resolved = _append_default_heading_entries(resolved=resolved, source_inventory=source_inventory)

    visual_type = str(slide.get("visual_type") or "")
    policy_errors: list[str] = []
    if visual_type in NODE_TIMING_VISUAL_TYPES:
        has_required_link = any(item.get("source_type") in {"node", "edge"} for item in resolved)
        if not has_required_link:
            policy_errors.append("Node-timing slide requires at least one node/edge timing link.")
    else:
        has_required_link = any(item.get("source_type") in {"word", "paragraph"} for item in resolved)
        if not has_required_link:
            policy_errors.append("Non-chart slide requires at least one word/paragraph timing link.")

    validation_errors.extend(policy_errors)

    if has_manual:
        status = "manual_complete" if not validation_errors else "partial"
    else:
        status = "auto_generated" if valid_links else "missing"

    return {
        "timing_links_manual": manual_links,
        "timing_links_auto": auto_links_existing,
        "timing_resolved": resolved,
        "timing_meta": {
            "version": 1,
            "status": status,
            "stale": bool(validation_errors),
            "errors": validation_errors,
            "narration_token_count": len(tokens),
            "target_count": len(targets),
            "manual_link_count": len(manual_links),
            "auto_link_count": len(auto_links_existing),
            "active_link_count": len(valid_links),
        },
        "timing_policy_ok": len(policy_errors) == 0,
        "timing_policy_errors": policy_errors,
    }
