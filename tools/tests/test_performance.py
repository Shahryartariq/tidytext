"""
Worst-case timing for the cleaning code.

The no-JavaScript fallback runs these transforms on the server, so a pattern that takes
quadratic time on hostile input would let one request tie up a worker. Each input below is
200,000 characters (the limit) of a shape that used to be slow, or that a regular expression
could plausibly backtrack on. tests/js/performance.test.mjs runs the same inputs in the browser
implementation.
"""

import json
import time
from pathlib import Path

from django.test import SimpleTestCase

from tools import transforms
from tools.transforms import Options
from tools.views import MAX_INPUT_CHARS

PAYLOADS = json.loads((Path(__file__).parent / "worst_case_inputs.json").read_text(encoding="utf-8"))
# Generous, so slow CI machines don't fail; the quadratic cases took minutes.
BUDGET_SECONDS = 2.0


def fill(unit: str) -> str:
    return (unit * (MAX_INPUT_CHARS // len(unit) + 1))[:MAX_INPUT_CHARS]


CONFIGS = {
    "every option": Options.build("paragraphs", "sentence", transforms.FLAGS, "az"),
    "remove HTML tags": Options.build(flags=["strip_html"]),
    "sentence case": Options.build(case="sentence"),
    "title case": Options.build(case="title"),
    "one line": Options.build("remove"),
}


class WorstCaseTimingTests(SimpleTestCase):
    def test_every_transform_runs_in_bounded_time(self):
        for name, unit in PAYLOADS.items():
            text = fill(unit)
            for label, options in CONFIGS.items():
                with self.subTest(input=name, options=label):
                    start = time.perf_counter()
                    transforms.apply(text, options)
                    transforms.stats(text)
                    transforms.details(text)
                    self.assertLess(time.perf_counter() - start, BUDGET_SECONDS)


class FindReplaceGrowthTests(SimpleTestCase):
    def test_replacement_that_would_explode_the_text_is_refused(self):
        with self.assertRaises(transforms.OutputTooLarge):
            transforms.apply("a" * MAX_INPUT_CHARS, Options.build(find="a", replace="b" * 1000))

    def test_growth_up_to_the_cap_is_fine(self):
        text = "a" * 1000
        self.assertEqual(len(transforms.apply(text, Options.build(find="a", replace="bb"))), 2000)

    def test_shrinking_replacements_are_never_refused(self):
        text = "abc" * 100_000
        self.assertEqual(transforms.apply(text, Options.build(find="abc", replace="")), "")
