from __future__ import annotations

from typing import Any


VISUAL_TYPE_ALIASES = {
    "contextual-overlay": "contextual_overlay",
}

VALID_VISUAL_TYPES = {
    "image",
    "hybrid",
    "chart",
    "kinetic_text",
    "title_card",
    "comparison_split",
    "key_stat_breakout",
    "document_anchor",
    "contextual_overlay",
}


DEFAULT_CHART_ARCETYPE = "process"


def _as_int(value: Any, default: int) -> int:
    try:
        parsed = int(value)
        return parsed
    except Exception:
        return default


def _normalize_visual_type(raw: Any) -> str:
    value = str(raw or "image").strip()
    value = VISUAL_TYPE_ALIASES.get(value, value)
    if value not in VALID_VISUAL_TYPES:
        return "image"
    return value


def _default_chart_data(archetype: str = DEFAULT_CHART_ARCETYPE) -> dict[str, Any]:
    return {
        "id": "generated-chart",
        "archetype": archetype,
        "nodes": [
            {
                "id": "node-1",
                "type": "motion-card",
                "data": {
                    "label": "Point 1",
                    "description": "Edit this chart node",
                    "variant": "primary",
                },
            },
            {
                "id": "node-2",
                "type": "motion-card",
                "data": {
                    "label": "Point 2",
                    "description": "Edit this chart node",
                    "variant": "neutral",
                },
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "node-1",
                "target": "node-2",
            }
        ],
    }


def normalize_chart_data(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return _default_chart_data()

    chart = dict(raw)
    archetype = str(chart.get("archetype") or DEFAULT_CHART_ARCETYPE)
    chart["archetype"] = archetype

    nodes = chart.get("nodes")
    edges = chart.get("edges")
    if not isinstance(nodes, list) or len(nodes) == 0:
        return _default_chart_data(archetype=archetype)
    if not isinstance(edges, list):
        chart["edges"] = []

    return chart


def normalize_slide(slide: dict[str, Any], index: int) -> dict[str, Any]:
    normalized = dict(slide or {})

    normalized["slide_number"] = index + 1
    normalized["visual_type"] = _normalize_visual_type(normalized.get("visual_type"))

    normalized["text"] = str(normalized.get("text") or "")
    normalized["visual_text"] = str(normalized.get("visual_text") or "")
    normalized["prompt"] = str(normalized.get("prompt") or "")

    duration = _as_int(normalized.get("duration"), 5000)
    normalized["duration"] = max(500, duration)

    if normalized.get("layout_data") is not None and not isinstance(normalized.get("layout_data"), dict):
        normalized["layout_data"] = {}

    if normalized["visual_type"] == "chart":
        normalized["chart_data"] = normalize_chart_data(normalized.get("chart_data"))

    return normalized


def normalize_slides(slides: Any) -> list[dict[str, Any]]:
    if not isinstance(slides, list):
        return []
    return [normalize_slide(s if isinstance(s, dict) else {}, idx) for idx, s in enumerate(slides)]


def sign_slide_assets_inplace(slides: list[dict[str, Any]], sign_fn) -> None:
    """
    Recursively signs local storage paths for render-time assets.
    Only string values in known image/audio fields are signed.
    """

    signable_keys = {
        "audio",
        "image",
        "left_image",
        "right_image",
        "background_image",
    }

    def _walk(value: Any, key: str | None = None) -> Any:
        if isinstance(value, dict):
            for k, v in list(value.items()):
                value[k] = _walk(v, k)
            return value

        if isinstance(value, list):
            return [_walk(item, key) for item in value]

        if isinstance(value, str):
            if key in signable_keys and value and not value.startswith("http"):
                return sign_fn(value)
            return value

        return value

    for slide in slides:
        _walk(slide)
