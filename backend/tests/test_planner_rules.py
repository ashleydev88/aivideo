import unittest

from backend.services.planner import recommend_course_plan


class PlannerRulesTests(unittest.TestCase):
    def test_leadership_disciplinary_recommends_multi_video(self):
        payload = {
            "topic": "Disciplinary training for leaders",
            "target_audience": "leadership",
            "learning_objectives": [
                "Understand policy requirements",
                "Run investigations correctly",
                "Chair disciplinary hearings",
                "Document outcomes",
            ],
            "additional_context": "Focus on investigation process and meeting chairing.",
            "duration_preference_minutes": 20,
        }
        plan = recommend_course_plan(payload)
        self.assertEqual(plan["format"], "multi_video_course")
        self.assertIn("R6", plan["decision_trace"]["matched_rules"])
        self.assertGreaterEqual(len(plan["modules"]), 3)

    def test_onboarding_disciplinary_recommends_single_video(self):
        payload = {
            "topic": "Disciplinary training for onboarding",
            "target_audience": "new_hires",
            "learning_objectives": [
                "Recognize conduct standards",
                "Know escalation paths",
            ],
            "duration_preference_minutes": 6,
        }
        plan = recommend_course_plan(payload)
        self.assertEqual(plan["format"], "single_video")
        self.assertIn("R7", plan["decision_trace"]["matched_rules"])
        self.assertEqual(len(plan["modules"]), 1)

    def test_document_heavy_policy_training_recommends_multi_video(self):
        payload = {
            "topic": "Company policy and compliance framework",
            "target_audience": "all_employees",
            "learning_objectives": [
                "Understand policy scope",
                "Apply policy in daily work",
                "Identify compliance breaches",
                "Follow reporting process",
            ],
            "source_document_text": "Policy text " * 2000,  # > 8k chars
        }
        plan = recommend_course_plan(payload)
        self.assertEqual(plan["format"], "multi_video_course")
        self.assertIn("R3", plan["decision_trace"]["matched_rules"])

    def test_narrow_short_objective_recommends_single_video(self):
        payload = {
            "topic": "Password hygiene basics",
            "target_audience": "new_hires",
            "learning_objectives": ["Create strong passwords"],
            "duration_preference_minutes": 5,
        }
        plan = recommend_course_plan(payload)
        self.assertEqual(plan["format"], "single_video")
        self.assertIn("R5", plan["decision_trace"]["matched_rules"])


if __name__ == "__main__":
    unittest.main()
