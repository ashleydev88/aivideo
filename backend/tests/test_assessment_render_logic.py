import unittest

from backend.services.course_generator import (
    build_assessment_entries,
    build_render_slides_and_assessment_cues,
)
from backend.routers.course import derive_assessment_cues


class AssessmentRenderLogicTests(unittest.TestCase):
    def test_render_filter_and_cue_timing(self):
        slides = [
            {"slide_number": 1, "duration": 10000, "text": "Intro"},
            {
                "slide_number": 2,
                "is_assessment": True,
                "assessment_data": {
                    "question": "Q1",
                    "options": ["A", "B", "C"],
                    "correct_index": 1,
                    "explanation": "Because",
                    "points": 1,
                },
            },
            {"slide_number": 3, "duration": 8000, "text": "Main"},
            {
                "slide_number": 4,
                "assessment_data": {
                    "question": "Q2",
                    "options": ["A", "B"],
                    "correct_index": 0,
                    "explanation": "",
                    "points": 2,
                },
            },
            {"slide_number": 5, "duration": 6000, "text": "Wrap"},
        ]

        render_slides, cues = build_render_slides_and_assessment_cues(slides)

        self.assertEqual(len(render_slides), 3)
        self.assertEqual([cue["slide_number"] for cue in cues], [2, 4])
        self.assertEqual([cue["at_ms"] for cue in cues], [10000, 18000])

    def test_assessment_entries_rebuild_after_delete(self):
        slides_after_delete = [
            {"slide_number": 1, "duration": 9000, "text": "Intro"},
            {"slide_number": 2, "duration": 7000, "text": "Main"},
        ]
        entries = build_assessment_entries(slides_after_delete)
        self.assertEqual(entries, [])

    def test_derived_cues_fallbacks_to_persisted_assessment_data(self):
        slides = [
            {"slide_number": 1, "duration": 5000, "text": "Intro"},
            {"slide_number": 2, "is_assessment": True},
            {"slide_number": 3, "duration": 5000, "text": "Main"},
        ]
        persisted = [
            {
                "slide_number": 2,
                "assessment_data": {
                    "question": "Fallback Q",
                    "options": ["A", "B"],
                    "correct_index": 0,
                    "explanation": "",
                    "points": 1,
                },
            }
        ]

        cues = derive_assessment_cues(slides, persisted)
        self.assertEqual(len(cues), 1)
        self.assertEqual(cues[0]["slide_number"], 2)
        self.assertEqual(cues[0]["at_ms"], 5000)
        self.assertEqual(cues[0]["assessment_data"]["question"], "Fallback Q")


if __name__ == "__main__":
    unittest.main()
